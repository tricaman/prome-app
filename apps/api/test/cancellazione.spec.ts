import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { ArchivioLocale } from '../src/infrastruttura/archivio-file/archivio-locale';
import { MisurazioniSenzaFornitore } from '../src/infrastruttura/misurazioni/misurazioni-senza-fornitore';
import { PuliziaBachecaService } from '../src/modules/bacheca/pulizia-bacheca.service';
import { CancellazioneService } from '../src/modules/cancellazione/cancellazione.service';

const GIORNO_MS = 24 * 60 * 60 * 1000;
/** Tolleranza per confrontare istanti calcolati dal server: cinque minuti. */
const TOLLERANZA_MS = 5 * 60 * 1000;

const vicinoA = (iso: string | Date, atteso: number) =>
  Math.abs(new Date(iso).getTime() - atteso) < TOLLERANZA_MS;

/**
 * Cancellazione dell'account (V5/SE3) — l'area a difetti invisibili per
 * eccellenza: un residuo dopo la cancellazione non produce alcun sintomo per
 * chi lo subisce. Questi test sono stati scritti PRIMA del codice.
 *
 * Le garanzie difese qui:
 * - la richiesta revoca subito ogni sessione e nasconde subito il profilo;
 * - la grazia di 14 giorni è annullabile solo rientrando entro il termine;
 * - la catena elimina o anonimizza ogni detentore censito, con id casuale
 *   NUOVO PER RECORD (due post non devono restare collegabili) e senza mappa;
 * - il residuo è verificato a zero record e zero file, e l'esito sta nel
 *   registro, che sopravvive al completamento;
 * - la ri-applicazione dopo un ripristino da backup è automatica.
 */
describe('Cancellazione dell\'account (V5/SE3)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;
  let archivio: ArchivioLocale;
  let misurazioni: MisurazioniSenzaFornitore;
  let cancellazione: CancellazioneService;
  let pulizia: PuliziaBachecaService;

  let contatore = 0;
  const nuovoIndirizzo = () =>
    `cancellazione-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  /** Entra (o rientra) con un giro OTP completo. Non tocca il profilo. */
  async function entra(indirizzo: string) {
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    return chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
  }

  type Utente = { token: string; utenteId: string; indirizzo: string };

  async function utenteCompleto(): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    const verifica = await entra(indirizzo);
    const token = verifica.json().data.token as string;
    const profilo = await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  /** Entra ma non compila il profilo: anche chi non ha finito può uscire. */
  async function utenteSenzaOnboarding(): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    const verifica = await entra(indirizzo);
    const token = verifica.json().data.token as string;
    const profilo = await chiedi('/profilo/me', { headers: comeUtente(token) });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  /** Le impostazioni non hanno ancora un endpoint di scrittura (E6): si scrivono qui. */
  const rendiPubblico = (utenteId: string) =>
    prisma.impostazioniDiPrivacy.update({
      where: { utenteId },
      data: { visibilita: 'PUBBLICO' },
    });

  async function pubblicaPost(token: string, testo: string, allegati: string[] = []) {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo, allegati },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
  }

  async function commenta(token: string, postId: string, testo: string): Promise<string> {
    const risposta = await chiedi(`/bacheca/${postId}/commenti`, {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data.id as string;
  }

  async function caricaFile(token: string, nome: string, contenuto: string): Promise<string> {
    const preautorizzazione = await chiedi('/bacheca/allegati/pre-autorizzazione', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { nome, tipo: 'TESTO', dimensione: Buffer.byteLength(contenuto) },
    });
    const { chiave, url } = preautorizzazione.json().data;
    await chiedi(url.replace(/^https?:\/\/[^/]+/, ''), { method: 'PUT', payload: contenuto });
    return chiave;
  }

  async function richiediCancellazione(token: string) {
    const risposta = await chiedi('/account/cancellazione', {
      method: 'POST',
      headers: comeUtente(token),
    });
    expect(risposta.statusCode).toBe(202);
    return risposta;
  }

  /**
   * Manipolazione del tempo: si invecchiano i timestamp nel registro, come la
   * suite fa già con i codici OTP e le prenotazioni. Mai fake timers — la
   * query di produzione deve essere quella vera.
   */
  const portaAlGiorno = (utenteId: string, giorni: number) => {
    const richiestaIl = new Date(Date.now() - giorni * GIORNO_MS);
    return prisma.richiestaDiCancellazione.update({
      where: { utenteId },
      data: {
        richiestaIl,
        eseguibileDal: new Date(richiestaIl.getTime() + 14 * GIORNO_MS),
        scadenza: new Date(richiestaIl.getTime() + 30 * GIORNO_MS),
      },
    });
  };

  /**
   * Il residuo su ogni detentore censito, per identificativo e — finché è
   * nota — per email. È la copia speculare di DETENTORI_CENSITI: un detentore
   * nuovo si aggiunge in entrambi, o questo helper lo denuncia.
   */
  async function residuoDi(utenteId: string, indirizzo: string) {
    return {
      utenti: await prisma.user.count({ where: { id: utenteId } }),
      sessioni: await prisma.session.count({ where: { userId: utenteId } }),
      credenziali: await prisma.account.count({ where: { userId: utenteId } }),
      verifiche: await prisma.verification.count({
        where: { identifier: { contains: indirizzo } },
      }),
      profili: await prisma.profilo.count({ where: { utenteId } }),
      impostazioni: await prisma.impostazioniDiPrivacy.count({ where: { utenteId } }),
      post: await prisma.post.count({ where: { autoreId: utenteId } }),
      commenti: await prisma.commento.count({ where: { autoreId: utenteId } }),
      prenotazioni: await prisma.allegatoInAttesa.count({ where: { autoreId: utenteId } }),
    };
  }

  const residuoZero = (residuo: Awaited<ReturnType<typeof residuoDi>>) => {
    expect(residuo).toEqual({
      utenti: 0,
      sessioni: 0,
      credenziali: 0,
      verifiche: 0,
      profili: 0,
      impostazioni: 0,
      post: 0,
      commenti: 0,
      prenotazioni: 0,
    });
  };

  const voceDi = (utenteId: string) =>
    prisma.richiestaDiCancellazione.findUnique({ where: { utenteId } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    email = app.get(CanaleEmailSviluppo);
    archivio = app.get(ArchivioLocale);
    misurazioni = app.get(MisurazioniSenzaFornitore);
    cancellazione = app.get(CancellazioneService);
    pulizia = app.get(PuliziaBachecaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('la richiesta', () => {
    it('registra la richiesta con grazia a 14 giorni e scadenza a 30', async () => {
      const utente = await utenteCompleto();
      const risposta = await richiediCancellazione(utente.token);

      const dati = risposta.json().data;
      const adesso = Date.now();
      expect(vicinoA(dati.richiestaIl, adesso)).toBe(true);
      expect(vicinoA(dati.riattivabileFinoAl, adesso + 14 * GIORNO_MS)).toBe(true);
      expect(vicinoA(dati.scadenza, adesso + 30 * GIORNO_MS)).toBe(true);

      const voce = await voceDi(utente.utenteId);
      expect(voce).not.toBeNull();
      expect(vicinoA(voce!.eseguibileDal, adesso + 14 * GIORNO_MS)).toBe(true);
      expect(voce!.verificataATotaleIl).toBeNull();

      // La richiesta apre la grazia, non esegue niente: è tutto ancora lì.
      const residuo = await residuoDi(utente.utenteId, utente.indirizzo);
      expect(residuo.utenti).toBe(1);
      expect(residuo.profili).toBe(1);
    });

    it('revoca subito tutte le sessioni, anche quelle su altri dispositivi', async () => {
      const utente = await utenteCompleto();
      const altroDispositivo = await entra(utente.indirizzo);
      const tokenB = altroDispositivo.json().data.token as string;

      await richiediCancellazione(utente.token);

      const conA = await chiedi('/profilo/me', { headers: comeUtente(utente.token) });
      const conB = await chiedi('/profilo/me', { headers: comeUtente(tokenB) });
      expect(conA.statusCode).toBe(401);
      expect(conB.statusCode).toBe(401);
      expect(await prisma.session.count({ where: { userId: utente.utenteId } })).toBe(0);
    });

    it('una sessione revocata non può chiedere di nuovo la cancellazione', async () => {
      const utente = await utenteCompleto();
      await richiediCancellazione(utente.token);
      const primaVoce = await voceDi(utente.utenteId);

      const seconda = await chiedi('/account/cancellazione', {
        method: 'POST',
        headers: comeUtente(utente.token),
      });

      expect(seconda.statusCode).toBe(401);
      expect(seconda.json().errorCode).toBe('PR006');
      const voce = await voceDi(utente.utenteId);
      expect(voce!.richiestaIl).toEqual(primaVoce!.richiestaIl);
    });

    it('nasconde subito i contenuti senza toccare le impostazioni di privacy', async () => {
      const autore = await utenteCompleto();
      await rendiPubblico(autore.utenteId);
      const post = await pubblicaPost(autore.token, 'Appunti che sparyranno subito');
      const estraneo = await utenteCompleto();

      const prima = await chiedi('/bacheca?limit=50', { headers: comeUtente(estraneo.token) });
      expect(prima.json().data.some((p: { id: string }) => p.id === post.id)).toBe(true);

      await richiediCancellazione(autore.token);

      const dopo = await chiedi('/bacheca?limit=50', { headers: comeUtente(estraneo.token) });
      expect(dopo.json().data.some((p: { id: string }) => p.id === post.id)).toBe(false);

      // Il profilo è nascosto dal flag, non riscritto: le impostazioni sono
      // intatte e la riattivazione sarà fedele. E la catena non è partita.
      const impostazioni = await prisma.impostazioniDiPrivacy.findUnique({
        where: { utenteId: autore.utenteId },
      });
      expect(impostazioni!.visibilita).toBe('PUBBLICO');
      const profilo = await prisma.profilo.findUnique({ where: { utenteId: autore.utenteId } });
      expect(profilo!.inCancellazioneDal).not.toBeNull();
      const righePost = await prisma.post.findUnique({ where: { id: post.id } });
      expect(righePost!.autoreId).toBe(autore.utenteId);
    });

    it('due richieste simultanee producono una voce sola senza errori del server', async () => {
      const utente = await utenteCompleto();

      const [prima, seconda] = await Promise.all([
        chiedi('/account/cancellazione', { method: 'POST', headers: comeUtente(utente.token) }),
        chiedi('/account/cancellazione', { method: 'POST', headers: comeUtente(utente.token) }),
      ]);

      // Una delle due può trovare la sessione già revocata: va bene. Quello
      // che non va mai bene è un 5xx o una voce doppia.
      for (const risposta of [prima, seconda]) {
        expect([202, 401]).toContain(risposta.statusCode);
      }
      expect(
        await prisma.richiestaDiCancellazione.count({ where: { utenteId: utente.utenteId } }),
      ).toBe(1);
    });

    it('accetta la richiesta di chi non ha completato l\'onboarding', async () => {
      const utente = await utenteSenzaOnboarding();
      await richiediCancellazione(utente.token);
      expect(await voceDi(utente.utenteId)).not.toBeNull();
    });

    it('conta la richiesta senza nominare chi l\'ha fatta', async () => {
      const utente = await utenteCompleto();
      misurazioni.azzera();

      await richiediCancellazione(utente.token);

      const evento = misurazioni.emessi().find((e) => e.evento === 'cancellazione_richiesta');
      expect(evento).toBeDefined();
      // Dopo il completamento quell'id sarebbe, presso un fornitore futuro,
      // una replica senza percorso di cancellazione: il conteggio basta.
      expect(evento!.proprieta?.utenteId).toBeUndefined();
    });
  });

  describe('la grazia di 14 giorni', () => {
    it('il giro non tocca chi è ancora in grazia', async () => {
      const utente = await utenteCompleto();
      await pubblicaPost(utente.token, 'Post in grazia');
      await richiediCancellazione(utente.token);

      await cancellazione.eseguiGiro();

      const residuo = await residuoDi(utente.utenteId, utente.indirizzo);
      expect(residuo.utenti).toBe(1);
      expect(residuo.profili).toBe(1);
      expect(residuo.post).toBe(1);
      expect((await voceDi(utente.utenteId))!.verificataATotaleIl).toBeNull();
    });

    it('un accesso al giorno 13 annulla la richiesta e riattiva l\'account intatto', async () => {
      const autore = await utenteCompleto();
      await rendiPubblico(autore.utenteId);
      const post = await pubblicaPost(autore.token, 'Torno fra tredici giorni');
      const estraneo = await utenteCompleto();
      await richiediCancellazione(autore.token);
      await portaAlGiorno(autore.utenteId, 13);
      misurazioni.azzera();

      const rientro = await entra(autore.indirizzo);

      expect(rientro.statusCode).toBe(200);
      expect(rientro.json().data.cancellazioneAnnullata).toBe(true);
      expect(await voceDi(autore.utenteId)).toBeNull();

      // Il nuovo token funziona, l'identità è la stessa, il flag è sparito e
      // le impostazioni non sono mai state toccate: il post è di nuovo visibile.
      const profilo = await chiedi('/profilo/me', {
        headers: comeUtente(rientro.json().data.token as string),
      });
      expect(profilo.statusCode).toBe(200);
      expect(profilo.json().data.utenteId).toBe(autore.utenteId);
      expect(
        (await prisma.profilo.findUnique({ where: { utenteId: autore.utenteId } }))!
          .inCancellazioneDal,
      ).toBeNull();
      const feed = await chiedi('/bacheca?limit=50', { headers: comeUtente(estraneo.token) });
      expect(feed.json().data.some((p: { id: string }) => p.id === post.id)).toBe(true);

      const evento = misurazioni.emessi().find((e) => e.evento === 'cancellazione_annullata');
      expect(evento).toBeDefined();
      expect(evento!.proprieta?.utenteId).toBeUndefined();

      // Un giro successivo non deve cancellare niente: la voce non c'è più.
      await cancellazione.eseguiGiro();
      expect(
        (await residuoDi(autore.utenteId, autore.indirizzo)).profili,
      ).toBe(1);
    });

    it('un accesso al giorno 15 è rifiutato, anche se il worker non ha ancora girato', async () => {
      const utente = await utenteCompleto();
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 15);

      const rientro = await entra(utente.indirizzo);

      // La grazia è finita: la catena è in arrivo e questo accesso non deve
      // lasciare tracce — nessuna sessione può esistere oltre la grazia.
      expect(rientro.statusCode).toBe(403);
      expect(rientro.json().errorCode).toBe('CA001');
      expect(await voceDi(utente.utenteId)).not.toBeNull();
      expect(await prisma.session.count({ where: { userId: utente.utenteId } })).toBe(0);

      // Il giro poi esegue davvero.
      await cancellazione.eseguiGiro();
      residuoZero(await residuoDi(utente.utenteId, utente.indirizzo));
    });

    it('un codice sbagliato non annulla niente', async () => {
      const utente = await utenteCompleto();
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 13);

      await chiedi('/accesso/codice', { method: 'POST', payload: { email: utente.indirizzo } });
      const rientro = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: utente.indirizzo, codice: '000000' },
      });

      expect(rientro.statusCode).toBeGreaterThanOrEqual(400);
      expect(await voceDi(utente.utenteId)).not.toBeNull();
    });

    it('dopo l\'annullamento una nuova richiesta riparte da capo', async () => {
      const utente = await utenteCompleto();
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 13);

      const rientro = await entra(utente.indirizzo);
      const nuovoToken = rientro.json().data.token as string;
      const seconda = await richiediCancellazione(nuovoToken);

      // Non è la prosecuzione della vecchia: la grazia riparte da adesso.
      expect(vicinoA(seconda.json().data.riattivabileFinoAl, Date.now() + 14 * GIORNO_MS)).toBe(
        true,
      );
    });
  });

  describe('l\'esecuzione della catena', () => {
    // Un mondo completo, un solo giro: le asserzioni sotto lo guardano da
    // tutte le angolazioni.
    let autore: Utente;
    let vivo: Utente;
    let postConAllegato: { id: string };
    let secondoPost: { id: string };
    let postDelVivo: { id: string };
    let commentoDelCancellando: string;
    let commentoDelVivo: string;
    let chiaveAllegato: string;
    let chiavePrenotazione: string;
    let esitoGiro: Awaited<ReturnType<CancellazioneService['eseguiGiro']>>;

    beforeAll(async () => {
      autore = await utenteCompleto();
      vivo = await utenteCompleto();
      await rendiPubblico(autore.utenteId);
      await rendiPubblico(vivo.utenteId);

      chiaveAllegato = await caricaFile(autore.token, 'appunti.txt', 'contenuto che resta');
      postConAllegato = await pubblicaPost(autore.token, 'Post con allegato', [chiaveAllegato]);
      secondoPost = await pubblicaPost(autore.token, 'Secondo post');
      postDelVivo = await pubblicaPost(vivo.token, 'Post di chi resta');
      commentoDelCancellando = await commenta(autore.token, postDelVivo.id, 'Commento che diventa anonimo');
      commentoDelVivo = await commenta(vivo.token, postConAllegato.id, 'Commento di chi resta');
      chiavePrenotazione = await caricaFile(autore.token, 'mai-pubblicato.txt', 'file orfano');

      await richiediCancellazione(autore.token);
      // Una richiesta di codice DOPO la cancellazione: la riga OTP con l'email
      // deve sparire insieme all'utente, nella stessa transazione.
      await chiedi('/accesso/codice', { method: 'POST', payload: { email: autore.indirizzo } });
      expect(
        await prisma.verification.count({ where: { identifier: { contains: autore.indirizzo } } }),
      ).toBeGreaterThan(0);

      await portaAlGiorno(autore.utenteId, 15);
      esitoGiro = await cancellazione.eseguiGiro();
    });

    it('elimina ogni traccia presso accesso: utente, sessioni, credenziali e codici in attesa', async () => {
      expect(await prisma.user.count({ where: { id: autore.utenteId } })).toBe(0);
      expect(await prisma.session.count({ where: { userId: autore.utenteId } })).toBe(0);
      expect(await prisma.account.count({ where: { userId: autore.utenteId } })).toBe(0);
      expect(
        await prisma.verification.count({ where: { identifier: { contains: autore.indirizzo } } }),
      ).toBe(0);
    });

    it('elimina profilo e impostazioni di privacy', async () => {
      expect(await prisma.profilo.count({ where: { utenteId: autore.utenteId } })).toBe(0);
      expect(
        await prisma.impostazioniDiPrivacy.count({ where: { utenteId: autore.utenteId } }),
      ).toBe(0);
    });

    it('anonimizza i post con un id casuale nuovo e diverso per ciascuno', async () => {
      const primo = await prisma.post.findUnique({ where: { id: postConAllegato.id } });
      const secondo = await prisma.post.findUnique({ where: { id: secondoPost.id } });
      const commento = await prisma.commento.findUnique({ where: { id: commentoDelCancellando } });

      // I contenuti restano, l'autore è staccato.
      expect(primo!.testo).toBe('Post con allegato');
      for (const riga of [primo!.autoreId, secondo!.autoreId, commento!.autoreId]) {
        expect(riga).not.toBe(autore.utenteId);
        expect(riga.startsWith('anonimo-')).toBe(true);
      }
      // Diversi FRA LORO: uno pseudonimo condiviso permetterebbe di
      // ricostruire il corpus di una persona — è la non-collegabilità di V5.
      expect(new Set([primo!.autoreId, secondo!.autoreId, commento!.autoreId]).size).toBe(3);
      expect(await prisma.post.count({ where: { autoreId: autore.utenteId } })).toBe(0);
      expect(await prisma.commento.count({ where: { autoreId: autore.utenteId } })).toBe(0);
    });

    it('l\'allegato del post anonimizzato resta, e il suo file è ancora in archivio', async () => {
      expect(await prisma.allegato.count({ where: { postId: postConAllegato.id } })).toBe(1);
      // Il test in positivo: il file DEVE esserci ancora (V5: l'allegato
      // segue il post, e il post resta).
      expect(await archivio.eStatoCaricato(chiaveAllegato)).toBe(true);
      // La chiave non racconta chi l'aveva caricato.
      expect(chiaveAllegato).not.toContain(autore.utenteId);
    });

    it('le prenotazioni pendenti spariscono con i loro file', async () => {
      expect(
        await prisma.allegatoInAttesa.count({ where: { autoreId: autore.utenteId } }),
      ).toBe(0);
      expect(await archivio.eStatoCaricato(chiavePrenotazione)).toBe(false);
    });

    it('il residuo è zero su ogni detentore censito e l\'esito totale sta nel registro', async () => {
      residuoZero(await residuoDi(autore.utenteId, autore.indirizzo));

      const voce = await voceDi(autore.utenteId);
      expect(voce!.verificataATotaleIl).not.toBeNull();
      expect(voce!.verificataATotaleIl!.getTime()).toBeLessThanOrEqual(voce!.scadenza.getTime());
      expect(voce!.ultimoResiduoRecord).toBe(0);
      expect(voce!.ultimoResiduoFile).toBe(0);
      expect(esitoGiro.catene).toBeGreaterThanOrEqual(1);
      expect(esitoGiro.completate).toBeGreaterThanOrEqual(1);
    });

    it('il registro sopravvive al completamento e non contiene nient\'altro che l\'identificatore', async () => {
      const voce = await voceDi(autore.utenteId);
      expect(voce).not.toBeNull();

      const serializzata = JSON.stringify(voce);
      expect(serializzata).not.toContain(autore.indirizzo);
      expect(serializzata).not.toContain('Marta');
      expect(serializzata).not.toContain('Post con allegato');
      // Un id anonimo nel registro sarebbe la mappa id → pseudonimo che V5
      // vieta esplicitamente.
      const primo = await prisma.post.findUnique({ where: { id: postConAllegato.id } });
      expect(serializzata).not.toContain(primo!.autoreId);
    });

    it('conta il completamento senza nominare chi era', async () => {
      const evento = misurazioni.emessi().find((e) => e.evento === 'cancellazione_completata');
      expect(evento).toBeDefined();
      expect(evento!.proprieta?.utenteId).toBeUndefined();
    });

    it('il commento del cancellato resta sotto il post altrui, anonimo ma moderabile', async () => {
      const discussione = await chiedi(`/bacheca/${postDelVivo.id}/commenti`, {
        headers: comeUtente(vivo.token),
      });
      const commento = discussione
        .json()
        .data.find((c: { id: string }) => c.id === commentoDelCancellando);
      expect(commento).toBeDefined();
      expect(commento.autore.nome).toBeNull();
      expect(commento.autore.rimosso).toBe(true);
      expect(commento.puoEliminare).toBe(true);

      const moderazione = await chiedi(`/bacheca/commenti/${commentoDelCancellando}`, {
        method: 'DELETE',
        headers: comeUtente(vivo.token),
      });
      expect(moderazione.statusCode).toBe(200);
    });

    it('i commenti dei vivi sotto un post anonimizzato restano con il loro nome', async () => {
      const discussione = await chiedi(`/bacheca/${postConAllegato.id}/commenti`, {
        headers: comeUtente(vivo.token),
      });
      const commento = discussione
        .json()
        .data.find((c: { id: string }) => c.id === commentoDelVivo);
      expect(commento).toBeDefined();
      expect(commento.autore.utenteId).toBe(vivo.utenteId);
      expect(commento.autore.nome).toBe('Marta');
      expect(commento.puoEliminare).toBe(true);
    });

    it('un secondo giro non ritocca nulla: gli id anonimi restano quelli del primo', async () => {
      const prima = await prisma.post.findMany({
        where: { id: { in: [postConAllegato.id, secondoPost.id] } },
        orderBy: { id: 'asc' },
      });

      await cancellazione.eseguiGiro();

      const dopo = await prisma.post.findMany({
        where: { id: { in: [postConAllegato.id, secondoPost.id] } },
        orderBy: { id: 'asc' },
      });
      expect(dopo.map((p) => p.autoreId)).toEqual(prima.map((p) => p.autoreId));
      residuoZero(await residuoDi(autore.utenteId, autore.indirizzo));
    });

    it('arriva a esito totale anche per chi non aveva completato l\'onboarding', async () => {
      const incompleto = await utenteSenzaOnboarding();
      await richiediCancellazione(incompleto.token);
      await portaAlGiorno(incompleto.utenteId, 15);

      await cancellazione.eseguiGiro();

      residuoZero(await residuoDi(incompleto.utenteId, incompleto.indirizzo));
      expect((await voceDi(incompleto.utenteId))!.verificataATotaleIl).not.toBeNull();
    });
  });

  describe('la visibilità dei contenuti anonimizzati', () => {
    let eremita: Utente;
    let estraneo: Utente;
    let post: { id: string };
    let chiave: string;

    beforeAll(async () => {
      // Un autore PRIVATO (il default): prima della cancellazione nessuno
      // vede i suoi post; dopo, sono di tutti gli iscritti.
      eremita = await utenteCompleto();
      estraneo = await utenteCompleto();
      chiave = await caricaFile(eremita.token, 'materiale.txt', 'utile a chi studia');
      post = await pubblicaPost(eremita.token, 'Materiale che resta alla comunità', [chiave]);

      const prima = await chiedi('/bacheca?limit=50', { headers: comeUtente(estraneo.token) });
      expect(prima.json().data.some((p: { id: string }) => p.id === post.id)).toBe(false);

      await richiediCancellazione(eremita.token);
      await portaAlGiorno(eremita.utenteId, 15);
      await cancellazione.eseguiGiro();
    });

    it('un post anonimizzato è nel feed di ogni iscritto, come Utente rimosso', async () => {
      const feed = await chiedi('/bacheca?limit=50', { headers: comeUtente(estraneo.token) });
      const trovato = feed.json().data.find((p: { id: string }) => p.id === post.id);

      expect(trovato).toBeDefined();
      expect(trovato.autore.nome).toBeNull();
      expect(trovato.autore.cognome).toBeNull();
      expect(trovato.autore.rimosso).toBe(true);
      expect(trovato.puoModificare).toBe(false);
    });

    it('e si apre anche dal suo indirizzo, con l\'allegato scaricabile', async () => {
      const dettaglio = await chiedi(`/bacheca/${post.id}`, {
        headers: comeUtente(estraneo.token),
      });
      expect(dettaglio.statusCode).toBe(200);
      expect(dettaglio.json().data.testo).toBe('Materiale che resta alla comunità');
      expect(dettaglio.json().data.allegati).toHaveLength(1);
      expect(dettaglio.json().data.allegati[0].url).toBeTruthy();
    });

    it('il feed resta chiuso a chi non è entrato', async () => {
      // «Aperto agli iscritti» non significa aperto al web: la guardia non si
      // allenta per i contenuti anonimi.
      const risposta = await chiedi('/bacheca?limit=50');
      expect(risposta.statusCode).toBe(401);
    });
  });

  describe('ritentativo e ri-applicazione', () => {
    it('se l\'archivio non risponde la catena non perde il pezzo: lo riprende al giro dopo', async () => {
      const utente = await utenteCompleto();
      const post = await pubblicaPost(utente.token, 'Post che si anonimizza comunque');
      await caricaFile(utente.token, 'pendente.txt', 'file che resiste un giro');
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 15);

      const rotto = jest
        .spyOn(archivio, 'rimuovi')
        .mockRejectedValue(new Error('archivio giù'));
      try {
        await cancellazione.eseguiGiro();
      } finally {
        rotto.mockRestore();
      }

      // I passi indipendenti sono andati; la prenotazione col suo file è il
      // segnalibro del ritentativo, quindi l'esito NON è ancora totale.
      const dopoPrimoGiro = await prisma.post.findUnique({ where: { id: post.id } });
      expect(dopoPrimoGiro!.autoreId.startsWith('anonimo-')).toBe(true);
      expect(await prisma.user.count({ where: { id: utente.utenteId } })).toBe(0);
      expect(
        await prisma.allegatoInAttesa.count({ where: { autoreId: utente.utenteId } }),
      ).toBe(1);
      expect((await voceDi(utente.utenteId))!.verificataATotaleIl).toBeNull();

      await cancellazione.eseguiGiro();

      residuoZero(await residuoDi(utente.utenteId, utente.indirizzo));
      expect((await voceDi(utente.utenteId))!.verificataATotaleIl).not.toBeNull();
      // Il ritentativo non ri-anonimizza ciò che era già anonimo.
      const dopoSecondoGiro = await prisma.post.findUnique({ where: { id: post.id } });
      expect(dopoSecondoGiro!.autoreId).toBe(dopoPrimoGiro!.autoreId);
    });

    it('riprende da uno stato a metà anche quando l\'email non è più recuperabile', async () => {
      const utente = await utenteCompleto();
      await pubblicaPost(utente.token, 'Post rimasto a metà');
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 15);
      // Il crash simulato: accesso già eliminato, tutto il resto no. Da qui
      // in poi nessuno conosce più l'email — e non deve servire.
      await prisma.user.delete({ where: { id: utente.utenteId } });

      await cancellazione.eseguiGiro();

      residuoZero(await residuoDi(utente.utenteId, utente.indirizzo));
      expect((await voceDi(utente.utenteId))!.verificataATotaleIl).not.toBeNull();
    });

    it('dopo un ripristino da backup la ri-applicazione rimuove di nuovo ciò che era risorto', async () => {
      const utente = await utenteCompleto();
      const post = await pubblicaPost(utente.token, 'Post che risorge');
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 15);
      await cancellazione.eseguiGiro();
      const voceCompletata = await voceDi(utente.utenteId);
      const idAnonimoPrima = (await prisma.post.findUnique({ where: { id: post.id } }))!.autoreId;

      // Il ripristino simulato: profilo e post tornano in vita con l'id vero.
      await prisma.profilo.create({
        data: {
          utenteId: utente.utenteId,
          nome: 'Marta',
          cognome: 'Rossi',
          onboardingCompletato: true,
          impostazioniPrivacy: { create: {} },
        },
      });
      await prisma.post.update({
        where: { id: post.id },
        data: { autoreId: utente.utenteId },
      });
      // La ri-verifica oraria si invecchia come tutto il resto.
      await prisma.richiestaDiCancellazione.update({
        where: { utenteId: utente.utenteId },
        data: { ultimaVerificaIl: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      });

      const esito = await cancellazione.eseguiGiro();

      expect(esito.residuiTrovati).toBeGreaterThanOrEqual(1);
      residuoZero(await residuoDi(utente.utenteId, utente.indirizzo));
      const risorto = await prisma.post.findUnique({ where: { id: post.id } });
      expect(risorto!.autoreId.startsWith('anonimo-')).toBe(true);
      // Nessuna memoria del precedente: non esiste una mappa da consultare.
      expect(risorto!.autoreId).not.toBe(idAnonimoPrima);
      // La prova storica di SE3 non si azzera.
      expect((await voceDi(utente.utenteId))!.verificataATotaleIl).toEqual(
        voceCompletata!.verificataATotaleIl,
      );
    });

    it('oltre il 25° giorno senza esito totale il giro dà l\'allerta, e la spegne con l\'esito', async () => {
      const utente = await utenteCompleto();
      await caricaFile(utente.token, 'blocco.txt', 'file che blocca la catena');
      await richiediCancellazione(utente.token);
      await portaAlGiorno(utente.utenteId, 26);

      const rotto = jest
        .spyOn(archivio, 'rimuovi')
        .mockRejectedValue(new Error('archivio giù'));
      let esitoInRitardo: Awaited<ReturnType<CancellazioneService['eseguiGiro']>>;
      try {
        esitoInRitardo = await cancellazione.eseguiGiro();
      } finally {
        rotto.mockRestore();
      }
      expect(esitoInRitardo!.inAllerta).toBeGreaterThanOrEqual(1);

      await cancellazione.eseguiGiro();
      residuoZero(await residuoDi(utente.utenteId, utente.indirizzo));

      const quiete = await cancellazione.eseguiGiro();
      expect(quiete.inAllerta).toBe(0);
    });

    it('le verifiche OTP scadute vengono purgate anche quando nessuno conosce più l\'email', async () => {
      // Una riga risorta da un restore: scaduta per definizione (TTL 10 min,
      // orizzonte del ripristino 3 giorni). La purga la raccoglie senza email.
      await prisma.verification.create({
        data: {
          id: `test-purga-${Date.now()}`,
          identifier: 'sign-in-otp-risorta@studenti.unibo.it',
          value: 'hash-non-utilizzabile',
          expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });

      await cancellazione.eseguiGiro();

      expect(
        await prisma.verification.count({
          where: { identifier: { contains: 'risorta@studenti.unibo.it' } },
        }),
      ).toBe(0);
    });
  });

  describe('la stessa email dopo la cancellazione', () => {
    it('chi rientra è una persona nuova, e niente resuscita', async () => {
      const vecchio = await utenteCompleto();
      const post = await pubblicaPost(vecchio.token, 'Post del vecchio account');
      await richiediCancellazione(vecchio.token);
      await portaAlGiorno(vecchio.utenteId, 15);
      await cancellazione.eseguiGiro();

      const rientro = await entra(vecchio.indirizzo);

      expect(rientro.statusCode).toBe(200);
      expect(rientro.json().data.onboardingCompletato).toBe(false);
      expect(rientro.json().data.cancellazioneAnnullata).toBeFalsy();

      const nuovoToken = rientro.json().data.token as string;
      const profilo = await chiedi('/profilo/me', { headers: comeUtente(nuovoToken) });
      const nuovoId = profilo.json().data.utenteId as string;
      expect(nuovoId).not.toBe(vecchio.utenteId);
      expect(profilo.json().data.nome).toBeNull();

      // Il post anonimizzato non viene riattribuito alla persona nuova.
      const dettaglio = await chiedi(`/bacheca/${post.id}`, { headers: comeUtente(nuovoToken) });
      expect(dettaglio.statusCode).toBe(200);
      expect(dettaglio.json().data.puoModificare).toBe(false);
      expect(dettaglio.json().data.autore.utenteId).not.toBe(nuovoId);

      // Il registro: la voce vecchia resta con il suo esito, la persona nuova
      // non vi figura.
      expect((await voceDi(vecchio.utenteId))!.verificataATotaleIl).not.toBeNull();
      expect(await voceDi(nuovoId)).toBeNull();

      // Per il vecchio id il residuo resta zero (l'email ora appartiene a
      // un'altra persona, quindi si guarda solo l'identificativo).
      expect(await prisma.user.count({ where: { id: vecchio.utenteId } })).toBe(0);
      expect(await prisma.profilo.count({ where: { utenteId: vecchio.utenteId } })).toBe(0);
      expect(await prisma.post.count({ where: { autoreId: vecchio.utenteId } })).toBe(0);
    });
  });

  describe('non-regressione', () => {
    it('il giro non tocca chi non ha chiesto niente', async () => {
      const testimone = await utenteCompleto();
      const postDelTestimone = await pubblicaPost(testimone.token, 'Resto qui');
      const cancellando = await utenteCompleto();
      await richiediCancellazione(cancellando.token);
      await portaAlGiorno(cancellando.utenteId, 15);

      await cancellazione.eseguiGiro();

      const profilo = await chiedi('/profilo/me', { headers: comeUtente(testimone.token) });
      expect(profilo.statusCode).toBe(200);
      expect(profilo.json().data.nome).toBe('Marta');
      expect(
        (await prisma.post.findUnique({ where: { id: postDelTestimone.id } }))!.autoreId,
      ).toBe(testimone.utenteId);
      residuoZero(await residuoDi(cancellando.utenteId, cancellando.indirizzo));
    });

    it('due utenti si cancellano nello stesso giro e il residuo è zero per entrambi', async () => {
      const primo = await utenteCompleto();
      const secondo = await utenteCompleto();
      await rendiPubblico(primo.utenteId);
      await rendiPubblico(secondo.utenteId);
      const postDelPrimo = await pubblicaPost(primo.token, 'Post del primo');
      const postDelSecondo = await pubblicaPost(secondo.token, 'Post del secondo');
      const commentoDelPrimo = await commenta(primo.token, postDelSecondo.id, 'Ciao dal primo');
      const commentoDelSecondo = await commenta(secondo.token, postDelPrimo.id, 'Ciao dal secondo');

      await richiediCancellazione(primo.token);
      await richiediCancellazione(secondo.token);
      await portaAlGiorno(primo.utenteId, 15);
      await portaAlGiorno(secondo.utenteId, 15);

      await cancellazione.eseguiGiro();

      residuoZero(await residuoDi(primo.utenteId, primo.indirizzo));
      residuoZero(await residuoDi(secondo.utenteId, secondo.indirizzo));
      expect((await voceDi(primo.utenteId))!.verificataATotaleIl).not.toBeNull();
      expect((await voceDi(secondo.utenteId))!.verificataATotaleIl).not.toBeNull();

      // Tutti gli id anonimi prodotti sono a due a due distinti: nemmeno fra
      // persone diverse esiste uno pseudonimo condiviso.
      const anonimi = [
        (await prisma.post.findUnique({ where: { id: postDelPrimo.id } }))!.autoreId,
        (await prisma.post.findUnique({ where: { id: postDelSecondo.id } }))!.autoreId,
        (await prisma.commento.findUnique({ where: { id: commentoDelPrimo } }))!.autoreId,
        (await prisma.commento.findUnique({ where: { id: commentoDelSecondo } }))!.autoreId,
      ];
      expect(new Set(anonimi).size).toBe(4);
      for (const id of anonimi) expect(id.startsWith('anonimo-')).toBe(true);
    });

    it('la pulizia della bacheca convive con la cancellazione', async () => {
      const cancellato = await utenteCompleto();
      const postAnonimo = await pubblicaPost(cancellato.token, 'Post che resta anonimo');
      await richiediCancellazione(cancellato.token);
      await portaAlGiorno(cancellato.utenteId, 15);
      await cancellazione.eseguiGiro();

      // Un post di un vivo eliminato via API lascia commenti orfani: lavoro
      // della pulizia, che non deve toccare i contenuti anonimizzati.
      const vivo = await utenteCompleto();
      const postEliminato = await pubblicaPost(vivo.token, 'Post che sparisce');
      await commenta(vivo.token, postEliminato.id, 'Commento che resta orfano');
      await chiedi(`/bacheca/${postEliminato.id}`, {
        method: 'DELETE',
        headers: comeUtente(vivo.token),
      });

      await pulizia.eseguiGiro();

      expect(await prisma.commento.count({ where: { postId: postEliminato.id } })).toBe(0);
      expect(await prisma.post.count({ where: { id: postAnonimo.id } })).toBe(1);
    });

    it('un giro senza lavoro pendente è un no-op silenzioso', async () => {
      // È il giro che il worker fa ogni cinque minuti per sempre: le voci
      // completate o ancora in grazia non producono lavoro né allerte.
      const esito = await cancellazione.eseguiGiro();
      expect(esito.catene).toBe(0);
      expect(esito.residuiTrovati).toBe(0);
      expect(esito.inAllerta).toBe(0);
    });
  });
});
