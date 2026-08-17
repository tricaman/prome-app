import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { ArchivioLocale } from '../src/infrastruttura/archivio-file/archivio-locale';
import { RecapitoFattiService } from '../src/modules/aula-studio/recapito-fatti.service';
import { PuliziaAulaStudioService } from '../src/modules/aula-studio/pulizia-aula-studio.service';
import {
  assicuraCatalogoDiProva,
  type CatalogoDiProva,
} from './catalogo';

const GIORNO_MS = 24 * 60 * 60 * 1000;

/**
 * Aula studio (E3) — il contesto core.
 *
 * Questi test sono stati scritti PRIMA del codice, come la regola impone
 * dovunque un difetto non sia percepibile da chi lo subisce: un permesso
 * concesso per errore non produce alcun sintomo per la persona che ne
 * subisce l'effetto, e nemmeno per chi lo ha concesso.
 *
 * Le garanzie difese qui:
 * - AS2: esiste sempre almeno un moderatore, e l'ultimo non si rimuove né si
 *   retrocede — nemmeno con due gesti concorrenti;
 * - AS4: i permessi si concedono e si revocano UNO PER UNO, e l'insieme vuoto
 *   (sola lettura) è uno stato legittimo, non un errore;
 * - AS5: il moderatore ha sempre i tre permessi, ma i tre permessi non fanno
 *   moderatore;
 * - AS8: l'aula non ha stati di ciclo di vita, e una data passata non la
 *   chiude;
 * - IA3: l'accettazione dell'invito non crea il partecipante nella stessa
 *   transazione — risponde 202 e il partecipante compare dopo;
 * - AL4: il permesso di caricare si legge fresco al gesto, e il materiale già
 *   caricato resta anche dopo la revoca.
 */
describe('Aula studio (E3)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let archivio: ArchivioLocale;
  let recapito: RecapitoFattiService;
  let pulizia: PuliziaAulaStudioService;

  let contatore = 0;
  const nuovoIndirizzo = () => `aula-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

  type Richiesta = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    payload?: unknown;
  };

  const chiedi = (percorso: string, opzioni: Richiesta = {}) =>
    app.inject({
      url: percorso,
      method: 'GET',
      ...opzioni,
      headers: { 'x-lang': 'it', ...opzioni.headers },
    } as Parameters<NestFastifyApplication['inject']>[0]);

  const comeUtente = (token: string) => ({ authorization: `Bearer ${token}` });

  type Utente = { token: string; utenteId: string; indirizzo: string };

  async function entra(indirizzo: string) {
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    return chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
  }

  async function utenteCompleto(corsoId?: string): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    const verifica = await entra(indirizzo);
    const token = verifica.json().data.token as string;
    const profilo = await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        corsoId: corsoId ?? catalogo.corsoInformatica,
      },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  async function utenteSenzaOnboarding(): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    const verifica = await entra(indirizzo);
    const token = verifica.json().data.token as string;
    const profilo = await chiedi('/profilo/me', { headers: comeUtente(token) });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  async function creaAula(
    token: string,
    dati: { titolo?: string; visibilita?: string; dataOraInizio?: string } = {},
  ) {
    const risposta = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { titolo: 'Analisi 1 – giovedì', ...dati },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
  }

  const sala = (token: string, aulaId: string) =>
    chiedi(`/aule-studio/${aulaId}/sala`, { headers: comeUtente(token) });

  const partecipanteNellaSala = async (token: string, aulaId: string, utenteId: string) => {
    const risposta = await sala(token, aulaId);
    return risposta
      .json()
      .data.partecipanti.find((p: { utenteId: string }) => p.utenteId === utenteId);
  };

  /** Fa entrare qualcuno saltando l'invito: serve dove l'invito non è il soggetto. */
  async function ammetti(aulaId: string, utente: Utente) {
    const risposta = await chiedi(`/aule-studio/${aulaId}/ingresso`, {
      method: 'POST',
      headers: comeUtente(utente.token),
    });
    return risposta;
  }

  const permesso = (
    token: string,
    aulaId: string,
    utenteId: string,
    quale: 'parlare' | 'scrivere' | 'caricare',
    metodo: 'POST' | 'DELETE',
  ) =>
    chiedi(`/aule-studio/${aulaId}/partecipanti/${utenteId}/permessi/${quale}`, {
      method: metodo,
      headers: comeUtente(token),
    });

  async function caricaMateriale(
    token: string,
    aulaId: string,
    nome: string,
    contenuto: string,
    argomentoId?: string,
  ) {
    const preautorizzazione = await chiedi(`/aule-studio/${aulaId}/allegati/pre-autorizzazione`, {
      method: 'POST',
      headers: comeUtente(token),
      payload: { nome, tipo: 'TESTO', dimensione: Buffer.byteLength(contenuto) },
    });
    expect(preautorizzazione.statusCode).toBe(201);
    const { chiave, url } = preautorizzazione.json().data;
    await chiedi(url.replace(/^https?:\/\/[^/]+/, ''), { method: 'PUT', payload: contenuto });

    return chiedi(`/aule-studio/${aulaId}/allegati`, {
      method: 'POST',
      headers: comeUtente(token),
      payload: { chiave, ...(argomentoId ? { argomentoId } : {}) },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    // Il catalogo è chiuso: senza, nessun onboarding arriva in fondo.
    catalogo = await assicuraCatalogoDiProva(prisma);
    email = app.get(CanaleEmailSviluppo);
    archivio = app.get(ArchivioLocale);
    recapito = app.get(RecapitoFattiService);
    pulizia = app.get(PuliziaAulaStudioService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('creare un\'aula (E3.1)', () => {
    it('chi la crea ne è moderatore con tutti e tre i permessi', async () => {
      const creatore = await utenteCompleto();
      const aula = await creaAula(creatore.token);

      const io = await partecipanteNellaSala(creatore.token, aula.id, creatore.utenteId);
      expect(io.moderatore).toBe(true);
      expect(io.permessi).toEqual({ parlare: true, scrivere: true, caricare: true });
      expect(io.solaLettura).toBe(false);
    });

    it('rifiuta un titolo vuoto (AS1)', async () => {
      const creatore = await utenteCompleto();
      const risposta = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(creatore.token),
        payload: { titolo: '   ' },
      });
      expect(risposta.statusCode).toBe(400);
    });

    it('rifiuta una data di inizio nel passato, e accetta l\'assenza di data (AS8)', async () => {
      const creatore = await utenteCompleto();

      const passata = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(creatore.token),
        payload: {
          titolo: 'Ripasso di ieri',
          dataOraInizio: new Date(Date.now() - GIORNO_MS).toISOString(),
        },
      });
      expect(passata.statusCode).toBe(422);
      expect(passata.json().errorCode).toBe('AS003');

      // Senza data è estemporanea: è la sola differenza fra i due casi, e non
      // esiste alcun campo di stato che le distingua.
      const senzaData = await creaAula(creatore.token, { titolo: 'Adesso' });
      const lettura = await sala(creatore.token, senzaData.id);
      expect(lettura.json().data.aula.dataOraInizio).toBeNull();
    });

    it('un\'aula la cui data è passata resta consultabile: la data non chiude nulla (AS8)', async () => {
      const creatore = await utenteCompleto();
      const aula = await creaAula(creatore.token, {
        titolo: 'Programmata',
        dataOraInizio: new Date(Date.now() + GIORNO_MS).toISOString(),
      });
      // Si invecchia la data, come farebbe il tempo.
      await prisma.aulaStudio.update({
        where: { id: aula.id },
        data: { dataOraInizio: new Date(Date.now() - GIORNO_MS) },
      });

      const lettura = await sala(creatore.token, aula.id);
      expect(lettura.statusCode).toBe(200);
      expect(lettura.json().data.aula.titolo).toBe('Programmata');
    });

    it('congela l\'ateneo alla creazione quando la visibilità è di ateneo (AS7)', async () => {
      const creatore = await utenteCompleto();
      const aula = await creaAula(creatore.token, { visibilita: 'ATENEO' });

      const riga = await prisma.aulaStudio.findUnique({ where: { id: aula.id } });
      // Si congela l'**identificativo** dell'ateneo: un nome copiato non
      // corrisponderebbe più al giorno in cui l'ateneo cambia denominazione.
      expect(riga!.ateneoId).toBe(catalogo.ateneoId);

      // Il creatore cambia ateneo: lo spazio non cambia pubblico.
      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: comeUtente(creatore.token),
        payload: { nome: 'Marta', cognome: 'Rossi', corsoId: catalogo.corsoDiPassaggio },
      });
      const dopo = await prisma.aulaStudio.findUnique({ where: { id: aula.id } });
      expect(dopo!.ateneoId).toBe(catalogo.ateneoId);
    });

    it('lo congela anche per un\'aula privata, così potrà essere aperta dopo', async () => {
      const creatore = await utenteCompleto();
      const aula = await creaAula(creatore.token);

      // Il valore si prende alla creazione, che è ciò che dice AS7. Salvarlo
      // solo per le aule già aperte all'ateneo renderebbe impossibile aprirle
      // in seguito: la regola confronta questo campo con l'università di chi
      // legge, e un campo vuoto non corrisponde a nessuno.
      const riga = await prisma.aulaStudio.findUnique({ where: { id: aula.id } });
      expect(riga!.ateneoId).toBe(catalogo.ateneoId);
      // Finché è privata non produce alcun effetto: si consulta solo quando la
      // visibilità è ATENEO.
      expect(riga!.visibilita).toBe('PRIVATO');
    });

    it('un\'aula privata aperta all\'ateneo diventa visibile ai compagni, subito', async () => {
      const creatore = await utenteCompleto();
      const aula = await creaAula(creatore.token);
      // Stesso ateneo, corso diverso: la regola guarda l'ateneo.
      const compagno = await utenteCompleto(catalogo.corsoLettere);

      const prima = await sala(compagno.token, aula.id);
      expect(prima.statusCode).toBe(404);

      await chiedi(`/aule-studio/${aula.id}`, {
        method: 'PATCH',
        headers: comeUtente(creatore.token),
        payload: { visibilita: 'ATENEO' },
      });

      const dopo = await sala(compagno.token, aula.id);
      expect(dopo.statusCode).toBe(200);
      // E l'ingresso, di conseguenza, è ammesso.
      expect((await ammetti(aula.id, compagno)).statusCode).toBe(200);
    });

    it('rifiuta chi non ha completato l\'onboarding', async () => {
      const incompleto = await utenteSenzaOnboarding();
      const risposta = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(incompleto.token),
        payload: { titolo: 'Non dovrei riuscirci' },
      });
      expect(risposta.statusCode).toBe(403);
    });

    it('elenca le proprie aule, paginate', async () => {
      const creatore = await utenteCompleto();
      const aula = await creaAula(creatore.token, { titolo: 'Nel mio elenco' });

      const elenco = await chiedi('/aule-studio?limit=50', { headers: comeUtente(creatore.token) });
      expect(elenco.statusCode).toBe(200);
      expect(elenco.json().data.some((a: { id: string }) => a.id === aula.id)).toBe(true);
      expect(elenco.json().meta.pagination.limit).toBe(50);
    });
  });

  describe('ammissione all\'aula (SE1: 0 ammissioni indebite)', () => {
    it('un\'aula privata non ammette chi non è stato invitato', async () => {
      const creatore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const aula = await creaAula(creatore.token, { visibilita: 'PRIVATO' });

      const ingresso = await ammetti(aula.id, estraneo);
      expect(ingresso.statusCode).toBe(403);
      expect(await prisma.partecipante.count({ where: { aulaStudioId: aula.id } })).toBe(1);
    });

    it('un\'aula privata non è nemmeno leggibile da fuori: 404, non 403', async () => {
      const creatore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const aula = await creaAula(creatore.token, { visibilita: 'PRIVATO' });

      // «Esiste ma non puoi vederla» racconta comunque che esiste.
      const lettura = await sala(estraneo.token, aula.id);
      expect(lettura.statusCode).toBe(404);
      expect(lettura.json().errorCode).toBe('AS001');
    });

    it('un\'aula pubblica ammette qualunque iscritto, come partecipante in sola lettura', async () => {
      const creatore = await utenteCompleto();
      const chiunque = await utenteCompleto(catalogo.altroCorso);
      const aula = await creaAula(creatore.token, { visibilita: 'PUBBLICO' });

      const ingresso = await ammetti(aula.id, chiunque);
      expect(ingresso.statusCode).toBe(200);

      const lui = await partecipanteNellaSala(creatore.token, aula.id, chiunque.utenteId);
      expect(lui.moderatore).toBe(false);
      // L'insieme vuoto è la sola lettura, ed è uno stato legittimo (AS4).
      expect(lui.permessi).toEqual({ parlare: false, scrivere: false, caricare: false });
      expect(lui.solaLettura).toBe(true);
    });

    it('un\'aula di ateneo ammette solo chi dichiara lo stesso ateneo, su dato fresco (AS7)', async () => {
      const creatore = await utenteCompleto();
      const altroAteneo = await utenteCompleto(catalogo.altroCorso);
      const aula = await creaAula(creatore.token, { visibilita: 'ATENEO' });

      expect((await ammetti(aula.id, altroAteneo)).statusCode).toBe(403);

      // Cambia ateneo: la decisione si prende sul dato di adesso, non su una copia.
      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: comeUtente(altroAteneo.token),
        payload: { nome: 'Marta', cognome: 'Rossi', corsoId: catalogo.corsoInformatica },
      });
      expect((await ammetti(aula.id, altroAteneo)).statusCode).toBe(200);
    });

    it('entrare due volte non duplica il partecipante (AS3)', async () => {
      const creatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(creatore.token, { visibilita: 'PUBBLICO' });

      await ammetti(aula.id, tale);
      const seconda = await ammetti(aula.id, tale);

      expect(seconda.statusCode).toBe(200);
      expect(
        await prisma.partecipante.count({
          where: { aulaStudioId: aula.id, utenteId: tale.utenteId },
        }),
      ).toBe(1);
    });

    it('chi esce volontariamente sparisce dai partecipanti', async () => {
      const creatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(creatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const uscita = await chiedi(`/aule-studio/${aula.id}/partecipanti/${tale.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(tale.token),
      });

      expect(uscita.statusCode).toBe(200);
      expect(await partecipanteNellaSala(creatore.token, aula.id, tale.utenteId)).toBeUndefined();
    });
  });

  describe('permessi e moderazione (E3.2) — uno per uno (AS4)', () => {
    it('il moderatore concede un permesso alla volta', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const concessione = await permesso(
        moderatore.token,
        aula.id,
        tale.utenteId,
        'scrivere',
        'POST',
      );
      expect(concessione.statusCode).toBe(200);

      const lui = await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId);
      // Solo quello concesso: gli altri due restano dov'erano.
      expect(lui.permessi).toEqual({ parlare: false, scrivere: true, caricare: false });
      expect(lui.solaLettura).toBe(false);
    });

    it('revocare l\'ultimo permesso riporta alla sola lettura, che non è un errore (AS4)', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);
      await permesso(moderatore.token, aula.id, tale.utenteId, 'scrivere', 'POST');

      const revoca = await permesso(moderatore.token, aula.id, tale.utenteId, 'scrivere', 'DELETE');

      expect(revoca.statusCode).toBe(200);
      const lui = await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId);
      expect(lui.solaLettura).toBe(true);
      expect(lui.permessi).toEqual({ parlare: false, scrivere: false, caricare: false });
    });

    it('concedere due volte lo stesso permesso non cambia nulla', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      await permesso(moderatore.token, aula.id, tale.utenteId, 'caricare', 'POST');
      const seconda = await permesso(moderatore.token, aula.id, tale.utenteId, 'caricare', 'POST');

      expect(seconda.statusCode).toBe(200);
      const lui = await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId);
      expect(lui.permessi.caricare).toBe(true);
    });

    it('un permesso inventato non esiste: la strada non c\'è', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const risposta = await chiedi(
        `/aule-studio/${aula.id}/partecipanti/${moderatore.utenteId}/permessi/moderare`,
        { method: 'POST', headers: comeUtente(moderatore.token) },
      );
      expect(risposta.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('chi non è moderatore non concede permessi, nemmeno a sé stesso', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const tentativo = await permesso(tale.token, aula.id, tale.utenteId, 'scrivere', 'POST');

      expect(tentativo.statusCode).toBe(403);
      expect(tentativo.json().errorCode).toBe('AS004');
      const lui = await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId);
      expect(lui.permessi.scrivere).toBe(false);
    });

    it('un permesso revocato a un moderatore non produce effetto finché dura il ruolo (AS5)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);

      const revoca = await permesso(
        moderatore.token,
        aula.id,
        moderatore.utenteId,
        'parlare',
        'DELETE',
      );

      expect(revoca.statusCode).toBe(200);
      const io = await partecipanteNellaSala(moderatore.token, aula.id, moderatore.utenteId);
      expect(io.permessi).toEqual({ parlare: true, scrivere: true, caricare: true });
    });

    it('promuovere concede i tre permessi; averli tutti e tre non fa moderatore (AS5)', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      for (const quale of ['parlare', 'scrivere', 'caricare'] as const) {
        await permesso(moderatore.token, aula.id, tale.utenteId, quale, 'POST');
      }
      const conTutti = await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId);
      // Il ruolo è più dei permessi che porta con sé.
      expect(conTutti.moderatore).toBe(false);
      const tentativo = await permesso(tale.token, aula.id, moderatore.utenteId, 'parlare', 'DELETE');
      expect(tentativo.statusCode).toBe(403);

      const promozione = await chiedi(
        `/aule-studio/${aula.id}/partecipanti/${tale.utenteId}/moderazione`,
        { method: 'POST', headers: comeUtente(moderatore.token) },
      );
      expect(promozione.statusCode).toBe(200);
      const promosso = await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId);
      expect(promosso.moderatore).toBe(true);
      expect(promosso.permessi).toEqual({ parlare: true, scrivere: true, caricare: true });
    });

    it('l\'ultimo moderatore non si retrocede né si rimuove (AS2)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);

      const retrocessione = await chiedi(
        `/aule-studio/${aula.id}/partecipanti/${moderatore.utenteId}/moderazione`,
        { method: 'DELETE', headers: comeUtente(moderatore.token) },
      );
      expect(retrocessione.statusCode).toBe(422);
      expect(retrocessione.json().errorCode).toBe('AS006');

      const uscita = await chiedi(
        `/aule-studio/${aula.id}/partecipanti/${moderatore.utenteId}`,
        { method: 'DELETE', headers: comeUtente(moderatore.token) },
      );
      expect(uscita.statusCode).toBe(422);
      expect(uscita.json().errorCode).toBe('AS006');

      const io = await partecipanteNellaSala(moderatore.token, aula.id, moderatore.utenteId);
      expect(io.moderatore).toBe(true);
    });

    it('promosso un secondo moderatore, il primo può uscire', async () => {
      const primo = await utenteCompleto();
      const secondo = await utenteCompleto();
      const aula = await creaAula(primo.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, secondo);
      await chiedi(`/aule-studio/${aula.id}/partecipanti/${secondo.utenteId}/moderazione`, {
        method: 'POST',
        headers: comeUtente(primo.token),
      });

      const uscita = await chiedi(`/aule-studio/${aula.id}/partecipanti/${primo.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(primo.token),
      });

      expect(uscita.statusCode).toBe(200);
      expect(await partecipanteNellaSala(secondo.token, aula.id, primo.utenteId)).toBeUndefined();
    });

    it('due retrocessioni concorrenti non lasciano l\'aula senza moderatore (AS2)', async () => {
      const primo = await utenteCompleto();
      const secondo = await utenteCompleto();
      const aula = await creaAula(primo.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, secondo);
      await chiedi(`/aule-studio/${aula.id}/partecipanti/${secondo.utenteId}/moderazione`, {
        method: 'POST',
        headers: comeUtente(primo.token),
      });

      // Ciascuna transazione, letta da sola, vede due moderatori e conclude
      // che la retrocessione è lecita. Insieme lascerebbero l'aula ingovernabile.
      await Promise.all([
        chiedi(`/aule-studio/${aula.id}/partecipanti/${primo.utenteId}/moderazione`, {
          method: 'DELETE',
          headers: comeUtente(secondo.token),
        }),
        chiedi(`/aule-studio/${aula.id}/partecipanti/${secondo.utenteId}/moderazione`, {
          method: 'DELETE',
          headers: comeUtente(primo.token),
        }),
      ]);

      const rimasti = await prisma.partecipante.count({
        where: { aulaStudioId: aula.id, moderatore: true },
      });
      expect(rimasti).toBeGreaterThanOrEqual(1);
    });

    it('il moderatore rimuove un partecipante', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const rimozione = await chiedi(`/aule-studio/${aula.id}/partecipanti/${tale.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(moderatore.token),
      });

      expect(rimozione.statusCode).toBe(200);
      expect(await partecipanteNellaSala(moderatore.token, aula.id, tale.utenteId)).toBeUndefined();
    });

    it('un partecipante non rimuove un altro partecipante', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const altro = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);
      await ammetti(aula.id, altro);

      const tentativo = await chiedi(`/aule-studio/${aula.id}/partecipanti/${altro.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(tale.token),
      });

      expect(tentativo.statusCode).toBe(403);
      expect(await partecipanteNellaSala(moderatore.token, aula.id, altro.utenteId)).toBeDefined();
    });
  });

  describe('inviti (E3.3)', () => {
    it('il moderatore invita, e l\'invito parte davvero', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { titolo: 'Analisi 1 – giovedì' });
      const invitato = nuovoIndirizzo();

      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato },
      });

      expect(invito.statusCode).toBe(201);
      expect(invito.json().data.stato).toBe('IN_ATTESA');
      // Scadenza a 7 giorni, calcolata all'emissione.
      const scadeIl = new Date(invito.json().data.scadeIl).getTime();
      expect(Math.abs(scadeIl - (Date.now() + 7 * GIORNO_MS))).toBeLessThan(5 * 60 * 1000);
      expect(email.ultimoInvitoPer(invitato)).toBeDefined();
      expect(email.ultimoInvitoPer(invitato)!.titoloAula).toBe('Analisi 1 – giovedì');
    });

    it('chi non è moderatore non invita', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const tentativo = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(tale.token),
        payload: { destinatario: nuovoIndirizzo() },
      });

      expect(tentativo.statusCode).toBe(403);
    });

    it('accettare risponde 202 e il partecipante compare dopo, non nella stessa transazione (IA3)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      const accettazione = await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      // 202 e non 201: rispondere 201 sarebbe mentire su un'entità che ancora
      // non esiste.
      expect(accettazione.statusCode).toBe(202);
      expect(
        await prisma.partecipante.count({
          where: { aulaStudioId: aula.id, utenteId: invitato.utenteId },
        }),
      ).toBe(0);

      const stato = await chiedi(`/inviti/${invitoId}`, { headers: comeUtente(invitato.token) });
      expect(stato.json().data.stato).toBe('ACCETTATO');
      expect(stato.json().data.partecipanteCreato).toBe(false);

      // Il fatto viaggia sulla corsia rapida.
      await recapito.eseguiGiro();

      const lui = await partecipanteNellaSala(moderatore.token, aula.id, invitato.utenteId);
      expect(lui).toBeDefined();
      expect(lui.moderatore).toBe(false);
      expect(lui.solaLettura).toBe(true);
      const dopo = await chiedi(`/inviti/${invitoId}`, { headers: comeUtente(invitato.token) });
      expect(dopo.json().data.partecipanteCreato).toBe(true);
    });

    it('una seconda accettazione non ha effetto, e il fatto consegnato due volte nemmeno', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });
      const seconda = await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });
      expect(seconda.statusCode).toBe(422);
      expect(seconda.json().errorCode).toBe('AS010');

      await recapito.eseguiGiro();
      // Si ri-consegna a mano lo stesso fatto: deve restare senza effetto.
      await prisma.fattoInUscita.updateMany({
        where: { aggregatoId: invitoId },
        data: { consegnatoIl: null, tentativi: 0 },
      });
      await recapito.eseguiGiro();

      expect(
        await prisma.partecipante.count({
          where: { aulaStudioId: aula.id, utenteId: invitato.utenteId },
        }),
      ).toBe(1);
    });

    it('un invito scaduto non si accetta più', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;
      await prisma.invito.update({
        where: { id: invitoId },
        data: { scadeIl: new Date(Date.now() - GIORNO_MS) },
      });

      const accettazione = await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      expect(accettazione.statusCode).toBe(422);
      expect(accettazione.json().errorCode).toBe('AS009');
      expect(
        await prisma.partecipante.count({
          where: { aulaStudioId: aula.id, utenteId: invitato.utenteId },
        }),
      ).toBe(0);
    });

    it('l\'invito di un altro non è il tuo', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });

      const tentativo = await chiedi(`/inviti/${invito.json().data.id}/accettazione`, {
        method: 'POST',
        headers: comeUtente(estraneo.token),
      });

      expect(tentativo.statusCode).toBe(403);
      expect(tentativo.json().errorCode).toBe('AS011');
    });

    it('chi non ha completato l\'onboarding non può accettare: l\'invito lo aspetta (IA2)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const incompleto = await utenteSenzaOnboarding();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: incompleto.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      const troppoPresto = await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(incompleto.token),
      });
      expect(troppoPresto.statusCode).toBe(403);
      // Resta in attesa: non è un errore, è il caso normale.
      expect((await prisma.invito.findUnique({ where: { id: invitoId } }))!.stato).toBe('IN_ATTESA');

      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: comeUtente(incompleto.token),
        payload: { nome: 'Luca', cognome: 'Bianchi', corsoId: catalogo.corsoInformatica },
      });
      const adesso = await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(incompleto.token),
      });
      expect(adesso.statusCode).toBe(202);
    });

    it('rifiutare chiude l\'invito e non fa nascere niente', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      const rifiuto = await chiedi(`/inviti/${invitoId}/rifiuto`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      // 200 e non 202: rifiutando non resta niente in sospeso da aspettare.
      expect(rifiuto.statusCode).toBe(200);
      expect(rifiuto.json().data.stato).toBe('RIFIUTATO');
      // Nessun fatto pubblicato: a valle non c'è alcun consumatore. Il giro
      // della corsia rapida non deve avere niente da consegnare.
      expect(await prisma.fattoInUscita.count({ where: { aggregatoId: invitoId } })).toBe(0);
      await recapito.eseguiGiro();
      expect(
        await prisma.partecipante.count({
          where: { aulaStudioId: aula.id, utenteId: invitato.utenteId },
        }),
      ).toBe(0);
    });

    it('un invito rifiutato non si accetta più (IA1: gli stati conclusivi sono terminali)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;
      await chiedi(`/inviti/${invitoId}/rifiuto`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      const ripensamento = await chiedi(`/inviti/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });
      const secondoRifiuto = await chiedi(`/inviti/${invitoId}/rifiuto`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      expect(ripensamento.statusCode).toBe(422);
      expect(ripensamento.json().errorCode).toBe('AS010');
      expect(secondoRifiuto.statusCode).toBe(422);
      expect(secondoRifiuto.json().errorCode).toBe('AS010');
    });

    it('l\'invito di un altro non si rifiuta', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invitato = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      const tentativo = await chiedi(`/inviti/${invitoId}/rifiuto`, {
        method: 'POST',
        headers: comeUtente(estraneo.token),
      });

      expect(tentativo.statusCode).toBe(403);
      expect(tentativo.json().errorCode).toBe('AS011');
      expect((await prisma.invito.findUnique({ where: { id: invitoId } }))!.stato).toBe('IN_ATTESA');
    });

    it('chi non ha completato l\'onboarding può comunque rifiutare: IA2 vale per accettare', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const incompleto = await utenteSenzaOnboarding();
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: incompleto.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      const rifiuto = await chiedi(`/inviti/${invitoId}/rifiuto`, {
        method: 'POST',
        headers: comeUtente(incompleto.token),
      });

      // La prova di onboarding la esige l'accettazione, perché è lei a
      // produrre un partecipante. Pretenderla anche qui vorrebbe dire
      // obbligare a compilare un profilo per dire di no.
      expect(rifiuto.statusCode).toBe(200);
      expect((await prisma.invito.findUnique({ where: { id: invitoId } }))!.stato).toBe('RIFIUTATO');
    });

    it('gli inviti scaduti si chiudono al giro dell\'unità lavoratrice, per interrogazione dello stato', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const invito = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: nuovoIndirizzo() },
      });
      const invitoId = invito.json().data.id as string;
      await prisma.invito.update({
        where: { id: invitoId },
        data: { scadeIl: new Date(Date.now() - GIORNO_MS) },
      });

      const esito = await pulizia.eseguiGiro();

      expect(esito.invitiScaduti).toBeGreaterThanOrEqual(1);
      expect((await prisma.invito.findUnique({ where: { id: invitoId } }))!.stato).toBe('SCADUTO');
    });
  });

  describe('materiali e argomenti (E3.5)', () => {
    it('chi ha il permesso carica; chi non ce l\'ha riceve un no spiegato (AL4)', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const senzaPermesso = await chiedi(`/aule-studio/${aula.id}/allegati/pre-autorizzazione`, {
        method: 'POST',
        headers: comeUtente(tale.token),
        payload: { nome: 'appunti.txt', tipo: 'TESTO', dimensione: 10 },
      });
      expect(senzaPermesso.statusCode).toBe(403);
      expect(senzaPermesso.json().errorCode).toBe('AS016');

      await permesso(moderatore.token, aula.id, tale.utenteId, 'caricare', 'POST');
      const conPermesso = await caricaMateriale(tale.token, aula.id, 'appunti.txt', 'contenuto');
      expect(conPermesso.statusCode).toBe(201);
    });

    it('la chiave del materiale non contiene mai l\'identificativo di chi lo carica', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const caricamento = await caricaMateriale(moderatore.token, aula.id, 'schema.txt', 'byte');

      // La chiave è opaca al client e non entra nel contratto: si legge da
      // dove vive davvero. Il file d'aula sopravvive alla cancellazione
      // dell'account, quindi una chiave che nominasse l'utente sarebbe un
      // dato personale non cancellabile.
      const riga = await prisma.allegatoDiAulaStudio.findUnique({
        where: { id: caricamento.json().data.id as string },
      });
      expect(riga!.chiave).not.toContain(moderatore.utenteId);
      expect(riga!.chiave.startsWith(`aula-studio/${aula.id}/`)).toBe(true);
    });

    it('revocare il permesso di caricare non cancella ciò che è già stato caricato (AL4)', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);
      await permesso(moderatore.token, aula.id, tale.utenteId, 'caricare', 'POST');
      const caricamento = await caricaMateriale(tale.token, aula.id, 'utile.txt', 'materiale');
      const allegatoId = caricamento.json().data.id as string;

      await permesso(moderatore.token, aula.id, tale.utenteId, 'caricare', 'DELETE');

      // Si governa il presente, non si riscrive il passato.
      const lettura = await sala(moderatore.token, aula.id);
      expect(
        lettura.json().data.allegati.some((a: { id: string }) => a.id === allegatoId),
      ).toBe(true);
      const nuovoTentativo = await chiedi(`/aule-studio/${aula.id}/allegati/pre-autorizzazione`, {
        method: 'POST',
        headers: comeUtente(tale.token),
        payload: { nome: 'altro.txt', tipo: 'TESTO', dimensione: 5 },
      });
      expect(nuovoTentativo.statusCode).toBe(403);
    });

    it('rifiuta un tipo non ammesso e una dimensione fuori limite (AL1)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);

      const tipo = await chiedi(`/aule-studio/${aula.id}/allegati/pre-autorizzazione`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { nome: 'virus.exe', tipo: 'ESEGUIBILE', dimensione: 10 },
      });
      expect(tipo.statusCode).toBe(400);

      const dimensione = await chiedi(`/aule-studio/${aula.id}/allegati/pre-autorizzazione`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { nome: 'enorme.pdf', tipo: 'PDF', dimensione: 26 * 1024 * 1024 },
      });
      expect(dimensione.statusCode).toBe(422);
    });

    it('un materiale si colloca in un argomento della stessa aula (AL3)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const altraAula = await creaAula(moderatore.token, { titolo: 'Altra' });
      const argomento = await chiedi(`/aule-studio/${aula.id}/argomenti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { titolo: 'Limiti', testo: 'Materiale sui limiti' },
      });
      const argomentoAltrove = await chiedi(`/aule-studio/${altraAula.id}/argomenti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { titolo: 'Altro tema' },
      });

      const collocato = await caricaMateriale(
        moderatore.token,
        aula.id,
        'limiti.txt',
        'byte',
        argomento.json().data.id,
      );
      expect(collocato.statusCode).toBe(201);

      const sbagliato = await caricaMateriale(
        moderatore.token,
        aula.id,
        'confuso.txt',
        'byte',
        argomentoAltrove.json().data.id,
      );
      expect(sbagliato.statusCode).toBe(422);
      expect(sbagliato.json().errorCode).toBe('AS013');
    });

    it('eliminare un argomento NON cancella i file: i materiali tornano sciolti (E4)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const argomento = await chiedi(`/aule-studio/${aula.id}/argomenti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { titolo: 'Da eliminare' },
      });
      const argomentoId = argomento.json().data.id as string;
      const caricamento = await caricaMateriale(
        moderatore.token,
        aula.id,
        'resta.txt',
        'materiale prezioso',
        argomentoId,
      );
      const allegatoId = caricamento.json().data.id as string;
      const chiave = (await prisma.allegatoDiAulaStudio.findUnique({
        where: { id: allegatoId },
      }))!.chiave;

      const eliminazione = await chiedi(`/aule-studio/${aula.id}/argomenti/${argomentoId}`, {
        method: 'DELETE',
        headers: comeUtente(moderatore.token),
      });
      expect(eliminazione.statusCode).toBe(200);

      await pulizia.eseguiGiro();

      // È l'opposto di ciò che accade ai post: riorganizzare non distrugge.
      const riga = await prisma.allegatoDiAulaStudio.findUnique({ where: { id: allegatoId } });
      expect(riga).not.toBeNull();
      expect(riga!.argomentoId).toBeNull();
      expect(await archivio.eStatoCaricato(chiave)).toBe(true);
    });

    it('rifiuta un testo di argomento oltre i 20.000 caratteri (AR2)', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      const risposta = await chiedi(`/aule-studio/${aula.id}/argomenti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { titolo: 'Lungo', testo: 'a'.repeat(20_001) },
      });
      expect(risposta.statusCode).toBe(400);
    });

    it('un partecipante non moderatore non elimina il materiale di un altro', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);
      const caricamento = await caricaMateriale(moderatore.token, aula.id, 'suo.txt', 'byte');

      const tentativo = await chiedi(
        `/aule-studio/${aula.id}/allegati/${caricamento.json().data.id}`,
        { method: 'DELETE', headers: comeUtente(tale.token) },
      );

      expect(tentativo.statusCode).toBe(403);
      expect(tentativo.json().errorCode).toBe('AS004');
    });
  });

  describe('la sala, in una sola risposta composta (PE3)', () => {
    it('apre con aula, partecipanti, argomenti e allegati insieme', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);
      await chiedi(`/aule-studio/${aula.id}/argomenti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { titolo: 'Integrali' },
      });
      await caricaMateriale(moderatore.token, aula.id, 'dispense.txt', 'byte');

      const risposta = await sala(moderatore.token, aula.id);

      expect(risposta.statusCode).toBe(200);
      const dati = risposta.json().data;
      expect(dati.aula.titolo).toBe('Analisi 1 – giovedì');
      expect(dati.partecipanti).toHaveLength(2);
      expect(dati.argomenti).toHaveLength(1);
      expect(dati.allegati).toHaveLength(1);
      expect(dati.allegati[0].url).toBeTruthy();
      // I permessi di chi legge li dichiara il server, non il client.
      expect(dati.sonoModeratore).toBe(true);
      expect(dati.mieiPermessi).toEqual({ parlare: true, scrivere: true, caricare: true });
    });

    it('mostra il nome dei partecipanti, e «Utente rimosso» per chi non ha più profilo', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);

      const dati = (await sala(moderatore.token, aula.id)).json().data;
      expect(dati.partecipanti[0].nome).toBe('Marta');

      // Un partecipante il cui profilo non esiste più: l'aula resta leggibile.
      await prisma.partecipante.create({
        data: { aulaStudioId: aula.id, utenteId: 'anonimo-inesistente' },
      });
      const dopo = (await sala(moderatore.token, aula.id)).json().data;
      const fantasma = dopo.partecipanti.find(
        (p: { utenteId: string }) => p.utenteId === 'anonimo-inesistente',
      );
      expect(fantasma.nome).toBeNull();
      expect(fantasma.rimosso).toBe(true);
    });
  });

  describe('eliminare un\'aula', () => {
    it('si elimina solo se non contiene materiali', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      await caricaMateriale(moderatore.token, aula.id, 'presente.txt', 'byte');

      const conMateriali = await chiedi(`/aule-studio/${aula.id}`, {
        method: 'DELETE',
        headers: comeUtente(moderatore.token),
      });
      expect(conMateriali.statusCode).toBe(422);
      expect(conMateriali.json().errorCode).toBe('AS007');

      const vuota = await creaAula(moderatore.token, { titolo: 'Vuota' });
      const eliminazione = await chiedi(`/aule-studio/${vuota.id}`, {
        method: 'DELETE',
        headers: comeUtente(moderatore.token),
      });
      expect(eliminazione.statusCode).toBe(200);
      expect(await prisma.aulaStudio.count({ where: { id: vuota.id } })).toBe(0);
    });

    it('solo un moderatore la elimina', async () => {
      const moderatore = await utenteCompleto();
      const tale = await utenteCompleto();
      const aula = await creaAula(moderatore.token, { visibilita: 'PUBBLICO' });
      await ammetti(aula.id, tale);

      const tentativo = await chiedi(`/aule-studio/${aula.id}`, {
        method: 'DELETE',
        headers: comeUtente(tale.token),
      });

      expect(tentativo.statusCode).toBe(403);
      expect(await prisma.aulaStudio.count({ where: { id: aula.id } })).toBe(1);
    });
  });

  describe('il canale dei fatti', () => {
    it('purga i fatti consegnati più vecchi di sette giorni', async () => {
      const moderatore = await utenteCompleto();
      const aula = await creaAula(moderatore.token);
      await prisma.fattoInUscita.create({
        data: {
          tipo: 'InvitoAllAulaStudioAccettato',
          aggregatoId: aula.id,
          payload: { nulla: true },
          consegnatoIl: new Date(Date.now() - 8 * GIORNO_MS),
          accadutoIl: new Date(Date.now() - 8 * GIORNO_MS),
        },
      });

      await recapito.eseguiGiro();

      expect(
        await prisma.fattoInUscita.count({
          where: { aggregatoId: aula.id, consegnatoIl: { not: null } },
        }),
      ).toBe(0);
    });

    it('un giro senza fatti da consegnare è un no-op silenzioso', async () => {
      const esito = await recapito.eseguiGiro();
      expect(esito.consegnati).toBeGreaterThanOrEqual(0);
      expect(esito.nonConsegnabili).toBe(0);
    });
  });
});
