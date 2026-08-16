import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import {
  assicuraCatalogoDiProva,
  type CatalogoDiProva,
} from './catalogo';

/**
 * Impostazioni di privacy (E6.1 minimo + E6.4).
 *
 * Fino a questo work package le impostazioni nascevano al valore più
 * restrittivo e **non c'era modo di cambiarle**: chiunque si iscrivesse vedeva
 * soltanto i propri post, per sempre. I test esistenti non se ne accorgevano
 * perché portavano un profilo a PUBBLICO scrivendo nel database — cioè
 * provando una strada che nessun utente può percorrere.
 *
 * Questi test passano invece **dall'API**, e difendono le quattro invarianti
 * che rendono la privacy prevedibile:
 *
 * - **IP2** entrambe le regole sempre valorizzate: non esiste «non impostato»,
 *   quindi cambiarne una non può azzerare l'altra;
 * - **IP3** i due assi sono indipendenti: nessuna combinazione è un errore;
 * - **IP4** nessun'altra operazione di dominio le tocca come effetto
 *   collaterale — è la garanzia su cui poggia la fiducia;
 * - **SE2** la regola cambiata vale **alla lettura successiva, senza finestra**,
 *   e le finestre di visibilità indebita ammesse sono zero.
 *
 * È un'area a difetti invisibili — nessuno si accorge di essere visto da chi
 * non dovrebbe vederlo — quindi sono stati scritti prima del codice.
 */
describe('Impostazioni di privacy (E6)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;

  let contatore = 0;
  const nuovoIndirizzo = () => `privacy-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  /** La sola via che un utente ha davvero: l'API. */
  const cambiaPrivacy = (
    token: string,
    dati: { contattabilita?: string; visibilita?: string },
  ) =>
    chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: dati,
    });

  async function pubblica(token: string, testo: string) {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
  }

  /** Vede il post nel feed? È la domanda che conta, e si fa dal client. */
  async function vedeNelFeed(token: string, postId: string): Promise<boolean> {
    const feed = await chiedi('/bacheca?limit=100', { headers: comeUtente(token) });
    return feed.json().data.some((post: { id: string }) => post.id === postId);
  }

  const leggeIlDettaglio = async (token: string, postId: string): Promise<number> =>
    (await chiedi(`/bacheca/${postId}`, { headers: comeUtente(token) })).statusCode;

  const impostazioniDi = async (token: string) =>
    (await chiedi('/profilo/me', { headers: comeUtente(token) })).json().data
      .impostazioniPrivacy as { contattabilita: string; visibilita: string };

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('il punto di partenza', () => {
    it('si nasce chiusi, su entrambi gli assi (IP1, IP2)', async () => {
      const tale = await utenteCompleto();

      // Un default permissivo esporrebbe i contenuti di chi non ha ancora
      // avuto modo di scegliere.
      expect(await impostazioniDi(tale.token)).toEqual({
        contattabilita: 'PRIVATO',
        visibilita: 'PRIVATO',
      });
    });

    it('e finché si resta chiusi, nessun altro vede i propri post', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const post = await pubblica(autore.token, 'Appunti di analisi');

      expect(await vedeNelFeed(estraneo.token, post.id)).toBe(false);
      // «Esiste ma non puoi vederlo» racconta comunque che esiste.
      expect(await leggeIlDettaglio(estraneo.token, post.id)).toBe(404);
      // L'autore vede sempre i propri: le impostazioni dicono chi ALTRO vede.
      expect(await vedeNelFeed(autore.token, post.id)).toBe(true);
    });
  });

  describe('aprire e richiudere (SE2: nessuna finestra)', () => {
    it('con PUBBLICO i post si vedono alla lettura successiva', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto(catalogo.altroCorso);
      const post = await pubblica(autore.token, 'Aperto a tutti gli iscritti');
      expect(await vedeNelFeed(estraneo.token, post.id)).toBe(false);

      const cambio = await cambiaPrivacy(autore.token, { visibilita: 'PUBBLICO' });

      expect(cambio.statusCode).toBe(200);
      expect(cambio.json().data.impostazioniPrivacy.visibilita).toBe('PUBBLICO');
      // Subito: nessun giro dell'unità lavoratrice, nessuna cache da scadere.
      expect(await vedeNelFeed(estraneo.token, post.id)).toBe(true);
      expect(await leggeIlDettaglio(estraneo.token, post.id)).toBe(200);
    });

    it('tornando a PRIVATO sparisce dal feed E dal collegamento diretto', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      await cambiaPrivacy(autore.token, { visibilita: 'PUBBLICO' });
      const post = await pubblica(autore.token, 'Ci ho ripensato');
      expect(await vedeNelFeed(estraneo.token, post.id)).toBe(true);

      await cambiaPrivacy(autore.token, { visibilita: 'PRIVATO' });

      // È il difetto tipico di quest'area: la regola applicata sulla query di
      // lista e dimenticata sul dettaglio. Le due cose si verificano separate.
      expect(await vedeNelFeed(estraneo.token, post.id)).toBe(false);
      expect(await leggeIlDettaglio(estraneo.token, post.id)).toBe(404);
    });

    it('con ATENEO vede solo chi dichiara lo stesso ateneo, su dato fresco', async () => {
      const autore = await utenteCompleto();
      const altrove = await utenteCompleto(catalogo.altroCorso);
      await cambiaPrivacy(autore.token, { visibilita: 'ATENEO' });
      const post = await pubblica(autore.token, 'Solo per chi studia qui');

      expect(await vedeNelFeed(altrove.token, post.id)).toBe(false);

      // Cambia università: la decisione si prende sul dato di adesso, non su
      // una copia presa quando il post è stato scritto.
      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: comeUtente(altrove.token),
        payload: { nome: 'Luca', cognome: 'Bianchi', corsoId: catalogo.corsoInformatica },
      });

      expect(await vedeNelFeed(altrove.token, post.id)).toBe(true);
    });

    it('con ATENEO vede anche chi è dello stesso ateneo ma di un altro corso', async () => {
      // La regola guarda l'ateneo, non il corso: è la regressione che il
      // passaggio da una stringa alla relazione con il corso può introdurre.
      const autore = await utenteCompleto();
      const compagno = await utenteCompleto(catalogo.corsoLettere);
      await cambiaPrivacy(autore.token, { visibilita: 'ATENEO' });
      const post = await pubblica(autore.token, 'Vale per tutto l\'ateneo');

      expect(await vedeNelFeed(compagno.token, post.id)).toBe(true);
    });
  });

  describe('i due assi non si toccano (IP2, IP3)', () => {
    it('cambiare la contattabilità non muove la visibilità', async () => {
      const tale = await utenteCompleto();
      await cambiaPrivacy(tale.token, { visibilita: 'PUBBLICO' });

      await cambiaPrivacy(tale.token, { contattabilita: 'ATENEO' });

      // Nessun vincolo di coerenza reciproca: ogni combinazione è legittima,
      // e riassumerle in un «livello di privacy» unico è ciò che il modello ha
      // rifiutato.
      expect(await impostazioniDi(tale.token)).toEqual({
        contattabilita: 'ATENEO',
        visibilita: 'PUBBLICO',
      });
    });

    it('e viceversa: un asse omesso resta dov\'era, mai svuotato', async () => {
      const tale = await utenteCompleto();
      await cambiaPrivacy(tale.token, { contattabilita: 'PUBBLICO' });

      await cambiaPrivacy(tale.token, { visibilita: 'ATENEO' });

      expect(await impostazioniDi(tale.token)).toEqual({
        contattabilita: 'PUBBLICO',
        visibilita: 'ATENEO',
      });
    });

    it('accetta tutte e tre le combinazioni di valore su ciascun asse', async () => {
      const tale = await utenteCompleto();
      for (const valore of ['PUBBLICO', 'ATENEO', 'PRIVATO'] as const) {
        const esito = await cambiaPrivacy(tale.token, { visibilita: valore });
        expect(esito.statusCode).toBe(200);
        expect(esito.json().data.impostazioniPrivacy.visibilita).toBe(valore);
      }
    });
  });

  describe('nessun effetto collaterale (IP4)', () => {
    it('pubblicare un post non allarga la propria visibilità', async () => {
      const tale = await utenteCompleto();
      await pubblica(tale.token, 'Il mio primo post');
      expect((await impostazioniDi(tale.token)).visibilita).toBe('PRIVATO');
    });

    it('creare un\'aula ed entrarci non rende contattabili da chiunque', async () => {
      const tale = await utenteCompleto();
      const altro = await utenteCompleto();
      const aula = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(tale.token),
        payload: { titolo: 'Analisi 1', visibilita: 'PUBBLICO' },
      });
      await chiedi(`/aule-studio/${aula.json().data.id}/ingresso`, {
        method: 'POST',
        headers: comeUtente(altro.token),
      });

      // Un'aula pubblica è una decisione sull'aula, non sulla persona.
      expect(await impostazioniDi(tale.token)).toEqual({
        contattabilita: 'PRIVATO',
        visibilita: 'PRIVATO',
      });
      expect(await impostazioniDi(altro.token)).toEqual({
        contattabilita: 'PRIVATO',
        visibilita: 'PRIVATO',
      });
    });

    it('completare o correggere il profilo non tocca le impostazioni', async () => {
      const tale = await utenteCompleto();
      await cambiaPrivacy(tale.token, { visibilita: 'PUBBLICO', contattabilita: 'ATENEO' });

      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: comeUtente(tale.token),
        payload: { nome: 'Marta', cognome: 'Verdi', corsoId: catalogo.corsoLettere },
      });

      expect(await impostazioniDi(tale.token)).toEqual({
        contattabilita: 'ATENEO',
        visibilita: 'PUBBLICO',
      });
    });
  });

  describe('ciò che non si può chiedere', () => {
    it('rifiuta un valore che non esiste', async () => {
      const tale = await utenteCompleto();
      const esito = await cambiaPrivacy(tale.token, { visibilita: 'AMICI' });
      expect(esito.statusCode).toBe(400);
      // Il valore respinto non lascia tracce.
      expect((await impostazioniDi(tale.token)).visibilita).toBe('PRIVATO');
    });

    it('rifiuta una richiesta che non cambia niente', async () => {
      const tale = await utenteCompleto();
      const esito = await cambiaPrivacy(tale.token, {});
      expect(esito.statusCode).toBe(422);
      expect(esito.json().errorCode).toBe('PR009');
    });

    it('rifiuta campi non previsti invece di ignorarli', async () => {
      const tale = await utenteCompleto();
      const esito = await cambiaPrivacy(tale.token, {
        visibilita: 'PUBBLICO',
        livello: 'massimo',
      } as Record<string, string>);
      expect(esito.statusCode).toBe(400);
    });

    it('senza sessione non si cambia la privacy di nessuno', async () => {
      const esito = await chiedi('/profilo/me/privacy', {
        method: 'PUT',
        payload: { visibilita: 'PUBBLICO' },
      });
      expect(esito.statusCode).toBe(401);
    });
  });

  describe('chi non ha ancora finito l\'onboarding', () => {
    it('ha comunque regole di privacy, e può cambiarle (IP1)', async () => {
      const incompleto = await utenteSenzaOnboarding();

      expect(await impostazioniDi(incompleto.token)).toEqual({
        contattabilita: 'PRIVATO',
        visibilita: 'PRIVATO',
      });

      // Le impostazioni nascono col profilo, non col completamento: non esiste
      // una finestra in cui un utente esista privo di regole applicabili.
      const esito = await cambiaPrivacy(incompleto.token, { contattabilita: 'ATENEO' });
      expect(esito.statusCode).toBe(200);
    });
  });

  describe('la cancellazione porta via anche queste', () => {
    it('le impostazioni cadono col profilo, senza lasciare residui', async () => {
      const tale = await utenteCompleto();
      await cambiaPrivacy(tale.token, { visibilita: 'PUBBLICO' });

      await prisma.profilo.delete({ where: { utenteId: tale.utenteId } });

      expect(
        await prisma.impostazioniDiPrivacy.count({ where: { utenteId: tale.utenteId } }),
      ).toBe(0);
    });
  });
});
