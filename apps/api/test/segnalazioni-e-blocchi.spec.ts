import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { CanaleNotificheSenzaFornitore } from '../src/infrastruttura/avvisi-in-uscita/canale-notifiche-senza-fornitore';
import { RecapitoFattiDellaBachecaService } from '../src/modules/bacheca/recapito-fatti.service';
import { CancellazioneService } from '../src/modules/cancellazione/cancellazione.service';

/**
 * Segnalazione e blocco — scritti prima del codice, perché qui il difetto è
 * invisibile per definizione, in tre modi diversi:
 *
 * - **un blocco che non filtra** non produce alcun sintomo: chi ha bloccato
 *   crede di non essere più visto, e nessuno gli dirà mai il contrario;
 * - **una segnalazione che non arriva a nessuno** sembra funzionare — la
 *   schermata ringrazia — e intanto la promessa di risposta è falsa;
 * - **un filtro che trabocca** dove non deve (uno spazio condiviso, un terzo
 *   estraneo) è indistinguibile da un contenuto che non c'è.
 *
 * Il blocco vale per la sola bacheca — la superficie non scelta — in
 * **entrambe le direzioni**, e vince su qualunque impostazione di privacy.
 * Dentro un'aula condivisa non vale: lì entrambi hanno scelto di stare, e
 * restano l'uscita e la moderazione. È un confine dichiarato, e per questo
 * si prova: la deriva tipica è che qualcuno lo "sistemi" in una direzione o
 * nell'altra senza deciderlo.
 */
describe('Segnalazioni e blocchi', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;
  let notifiche: CanaleNotificheSenzaFornitore;
  let recapito: RecapitoFattiDellaBachecaService;

  let contatore = 0;
  const nuovoIndirizzo = () => `blocchi-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  /** Entra, completa il profilo e apre la visibilità: qui si provano blocchi e segnalazioni, non la privacy. */
  async function utentePubblico(nome = 'Marta'): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const token = verifica.json().data.token as string;
    const profilo = await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: {
        nome,
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });
    await chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { visibilita: 'PUBBLICO' },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  async function pubblicaPost(utente: Utente, testo: string): Promise<{ id: string }> {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(utente.token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
  }

  async function commenta(utente: Utente, postId: string, testo: string) {
    return chiedi(`/bacheca/${postId}/commenti`, {
      method: 'POST',
      headers: comeUtente(utente.token),
      payload: { testo },
    });
  }

  async function blocca(chi: Utente, bersaglioId: string) {
    return chiedi(`/profilo/me/blocchi/${bersaglioId}`, {
      method: 'PUT',
      headers: comeUtente(chi.token),
    });
  }

  /** Feed e link diretto, verificati separatamente: la regola dimenticata è sempre una delle due. */
  async function vedeNelFeed(utente: Utente, postId: string): Promise<boolean> {
    const feed = await chiedi('/bacheca?limit=100', { headers: comeUtente(utente.token) });
    return (feed.json().data as Array<{ id: string }>).some((post) => post.id === postId);
  }

  const leggeIlDettaglio = async (utente: Utente, postId: string) =>
    (await chiedi(`/bacheca/${postId}`, { headers: comeUtente(utente.token) })).statusCode;

  async function testiDeiCommentiPer(utente: Utente, postId: string): Promise<string[]> {
    const risposta = await chiedi(`/bacheca/${postId}/commenti`, {
      headers: comeUtente(utente.token),
    });
    expect(risposta.statusCode).toBe(200);
    return (risposta.json().data as Array<{ testo: string }>).map((c) => c.testo);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    email = app.get(CanaleEmailSviluppo);
    notifiche = app.get(CanaleNotificheSenzaFornitore);
    recapito = app.get(RecapitoFattiDellaBachecaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('il blocco in bacheca', () => {
    it('chi blocco sparisce dal mio feed e dal link diretto, e io dai suoi', async () => {
      const anna = await utentePubblico('Anna');
      const bruno = await utentePubblico('Bruno');
      const postDiAnna = await pubblicaPost(anna, 'Appunti di Anna');
      const postDiBruno = await pubblicaPost(bruno, 'Appunti di Bruno');

      // Prima del blocco si vedono: entrambi pubblici.
      expect(await vedeNelFeed(anna, postDiBruno.id)).toBe(true);
      expect(await vedeNelFeed(bruno, postDiAnna.id)).toBe(true);

      const risposta = await blocca(anna, bruno.utenteId);
      expect(risposta.statusCode).toBe(200);

      // Le due direzioni e le due superfici, tutte e quattro separate: la
      // regola applicata sulla lista e dimenticata sul dettaglio è il
      // difetto tipico di quest'area.
      expect(await vedeNelFeed(anna, postDiBruno.id)).toBe(false);
      expect(await leggeIlDettaglio(anna, postDiBruno.id)).toBe(404);
      expect(await vedeNelFeed(bruno, postDiAnna.id)).toBe(false);
      expect(await leggeIlDettaglio(bruno, postDiAnna.id)).toBe(404);
    });

    it('il blocco vince sulla visibilità PUBBLICO', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const post = await pubblicaPost(bruno, 'Pubblico per tutti, non per Anna');

      await blocca(anna, bruno.utenteId);

      expect(await leggeIlDettaglio(anna, post.id)).toBe(404);
    });

    it('i terzi continuano a vedere tutto: il blocco non è contagioso', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const carla = await utentePubblico('Carla');
      const postDiBruno = await pubblicaPost(bruno, 'Post di Bruno');

      await blocca(anna, bruno.utenteId);

      expect(await vedeNelFeed(carla, postDiBruno.id)).toBe(true);
      expect(await leggeIlDettaglio(carla, postDiBruno.id)).toBe(200);
    });

    it('i commenti di chi è in coppia bloccata spariscono anche sotto i post di terzi', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const carla = await utentePubblico('Carla');
      const postDiCarla = await pubblicaPost(carla, 'Post di Carla');
      await commenta(bruno, postDiCarla.id, 'Commento di Bruno');
      await commenta(anna, postDiCarla.id, 'Commento di Anna');

      await blocca(anna, bruno.utenteId);

      // Ognuno dei due non vede più l'altro; Carla vede entrambi.
      expect(await testiDeiCommentiPer(anna, postDiCarla.id)).toEqual(['Commento di Anna']);
      expect(await testiDeiCommentiPer(bruno, postDiCarla.id)).toEqual(['Commento di Bruno']);
      expect(await testiDeiCommentiPer(carla, postDiCarla.id)).toEqual([
        'Commento di Bruno',
        'Commento di Anna',
      ]);
    });

    it('il bloccato non può commentare i miei post: per lui non esistono', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const postDiAnna = await pubblicaPost(anna, 'Post di Anna');
      const postDiBruno = await pubblicaPost(bruno, 'Post di Bruno');

      await blocca(anna, bruno.utenteId);

      // 404 e non 403: «esiste ma non puoi» racconterebbe che esiste — ed è
      // anche il solo modo di non dire a Bruno che è stato bloccato.
      expect((await commenta(bruno, postDiAnna.id, 'Ciao')).statusCode).toBe(404);
      expect((await commenta(anna, postDiBruno.id, 'Ciao')).statusCode).toBe(404);
    });

    it('lo sblocco vale alla lettura successiva, senza finestra', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const post = await pubblicaPost(bruno, 'Post di Bruno');

      await blocca(anna, bruno.utenteId);
      expect(await leggeIlDettaglio(anna, post.id)).toBe(404);

      const sblocco = await chiedi(`/profilo/me/blocchi/${bruno.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(anna.token),
      });
      expect(sblocco.statusCode).toBe(200);

      expect(await vedeNelFeed(anna, post.id)).toBe(true);
      expect(await leggeIlDettaglio(anna, post.id)).toBe(200);
    });

    it('bloccare due volte non sdoppia niente, e bloccarsi da soli non si può', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();

      await blocca(anna, bruno.utenteId);
      await blocca(anna, bruno.utenteId);
      expect(
        await prisma.blocco.count({ where: { bloccanteId: anna.utenteId } }),
      ).toBe(1);

      const seStessi = await blocca(anna, anna.utenteId);
      expect(seStessi.statusCode).toBe(422);
      expect(seStessi.json().errorCode).toBe('PR010');

      const inesistente = await blocca(anna, '00000000-0000-0000-0000-000000000000');
      expect(inesistente.statusCode).toBe(404);
    });

    it('l\'elenco dei bloccati dice chi, con il nome; dopo lo sblocco è vuoto', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico('Bruno');
      await blocca(anna, bruno.utenteId);

      const elenco = await chiedi('/profilo/me/blocchi', { headers: comeUtente(anna.token) });
      expect(elenco.statusCode).toBe(200);
      const righe = elenco.json().data as Array<{ utenteId: string; nome: string | null }>;
      const riga = righe.find((r) => r.utenteId === bruno.utenteId);
      expect(riga).toBeDefined();
      expect(riga!.nome).toBe('Bruno');

      await chiedi(`/profilo/me/blocchi/${bruno.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(anna.token),
      });
      const dopo = await chiedi('/profilo/me/blocchi', { headers: comeUtente(anna.token) });
      expect(
        (dopo.json().data as Array<{ utenteId: string }>).some(
          (r) => r.utenteId === bruno.utenteId,
        ),
      ).toBe(false);
    });

    it('un\'aula condivisa resta intatta: messaggi e partecipanti non si filtrano', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();

      // Bruno entra nell'aula di Anna (pubblica), poi Anna lo blocca.
      const aula = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { titolo: 'Analisi insieme', visibilita: 'PUBBLICO' },
      });
      const aulaId = aula.json().data.id as string;
      const ingresso = await chiedi(`/aule-studio/${aulaId}/ingresso`, {
        method: 'POST',
        headers: comeUtente(bruno.token),
      });
      expect(ingresso.statusCode).toBe(201);
      await chiedi(`/aule-studio/${aulaId}/messaggi`, {
        method: 'POST',
        headers: comeUtente(bruno.token),
        payload: { testo: 'Ci sono anche io' },
      });

      await blocca(anna, bruno.utenteId);

      // Dentro lo spazio scelto da entrambi il blocco non decide niente:
      // lì restano l'uscita e la moderazione. Confine dichiarato, e provato
      // perché non venga «sistemato» in silenzio.
      const sala = await chiedi(`/aule-studio/${aulaId}`, { headers: comeUtente(anna.token) });
      const partecipanti = sala.json().data.partecipanti as Array<{ utenteId: string }>;
      expect(partecipanti.some((p) => p.utenteId === bruno.utenteId)).toBe(true);

      const messaggi = await chiedi(`/aule-studio/${aulaId}/messaggi`, {
        headers: comeUtente(anna.token),
      });
      const testi = (messaggi.json().data as Array<{ testo: string }>).map((m) => m.testo);
      expect(testi).toContain('Ci sono anche io');
    });

    it('nessun avviso da chi è in coppia bloccata: l\'invito non suona', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      await chiedi('/notifiche/dispositivi', {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { token: `dispositivo-${anna.utenteId}`, piattaforma: 'ANDROID' },
      });
      await blocca(anna, bruno.utenteId);

      // Bruno invita l'indirizzo di Anna in una sua aula: l'email parte (gli
      // inviti viaggiano per indirizzo), ma il telefono di Anna non suona.
      const aula = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(bruno.token),
        payload: { titolo: 'Aula di Bruno', visibilita: 'PRIVATO' },
      });
      const invito = await chiedi(`/aule-studio/${aula.json().data.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(bruno.token),
        payload: { destinatario: anna.indirizzo },
      });
      expect(invito.statusCode).toBe(201);

      const perAnna = notifiche.ultimiAvvisi.filter((avviso) =>
        avviso.token.includes(`dispositivo-${anna.utenteId}`),
      );
      expect(perAnna).toHaveLength(0);
    });

    it('la corsa commento-poi-blocco: la preferenza si legge all\'istante dell\'invio', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      await chiedi('/notifiche/dispositivi', {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { token: `dispositivo-${anna.utenteId}`, piattaforma: 'ANDROID' },
      });
      const post = await pubblicaPost(anna, 'Post di Anna');

      // Bruno commenta mentre è ancora visibile; Anna blocca PRIMA che la
      // corsia rapida consegni il fatto. L'avviso non deve partire: il
      // blocco si legge all'invio, non da una copia presa alla nascita.
      expect((await commenta(bruno, post.id, 'Commento veloce')).statusCode).toBe(201);
      await blocca(anna, bruno.utenteId);
      await recapito.eseguiGiro();

      const perAnna = notifiche.ultimiAvvisi.filter(
        (avviso) =>
          avviso.token.includes(`dispositivo-${anna.utenteId}`) &&
          avviso.avviso.percorso.includes(post.id),
      );
      expect(perAnna).toHaveLength(0);
    });
  });

  describe('la privacy sui commenti (E6.2, completata qui)', () => {
    it('il commento di un autore PRIVATO è invisibile a tutti, proprietario del post compreso', async () => {
      const autore = await utentePubblico();
      const riservato = await utentePubblico('Riccardo');
      const post = await pubblicaPost(autore, 'Post pubblico');
      await commenta(riservato, post.id, 'Commento di Riccardo');

      // Riccardo si chiude DOPO aver commentato: il cambio vale subito,
      // anche sul passato (SE2), come per i post.
      await chiedi('/profilo/me/privacy', {
        method: 'PUT',
        headers: comeUtente(riservato.token),
        payload: { visibilita: 'PRIVATO' },
      });

      // Invisibile all'autore del post e a un terzo; visibile a sé stesso.
      // È l'asimmetria che qualcuno tratterà da difetto: la schermata delle
      // impostazioni promette «vale per i post e i commenti che pubblichi»,
      // e PRIVATO significa «solo tu» — anche sotto il post di un altro.
      const terzo = await utentePubblico();
      expect(await testiDeiCommentiPer(autore, post.id)).toEqual([]);
      expect(await testiDeiCommentiPer(terzo, post.id)).toEqual([]);
      expect(await testiDeiCommentiPer(riservato, post.id)).toEqual(['Commento di Riccardo']);
    });

    it('i commenti di un post che non vedo rispondono 404, e il conteggio segue il filtro', async () => {
      const autore = await utentePubblico();
      const estraneo = await utentePubblico();
      const post = await pubblicaPost(autore, 'Post');
      await commenta(autore, post.id, 'Primo');

      // L'autore si chiude: per l'estraneo il post — e la sua discussione —
      // non esistono più.
      await chiedi('/profilo/me/privacy', {
        method: 'PUT',
        headers: comeUtente(autore.token),
        payload: { visibilita: 'PRIVATO' },
      });
      const risposta = await chiedi(`/bacheca/${post.id}/commenti`, {
        headers: comeUtente(estraneo.token),
      });
      expect(risposta.statusCode).toBe(404);

      // Per l'autore la discussione c'è, e il totale conta ciò che si vede.
      const perAutore = await chiedi(`/bacheca/${post.id}/commenti`, {
        headers: comeUtente(autore.token),
      });
      expect(perAutore.json().meta.pagination.total).toBe(1);
    });
  });

  describe('la segnalazione', () => {
    async function segnala(
      utente: Utente,
      payload: Record<string, unknown>,
    ): Promise<ReturnType<typeof chiedi>> {
      return chiedi('/segnalazioni', {
        method: 'POST',
        headers: comeUtente(utente.token),
        payload,
      });
    }

    it('si segnala un post visibile: riga scritta, email al supporto con l\'estratto', async () => {
      const autore = await utentePubblico();
      const segnalante = await utentePubblico();
      // 301+ caratteri: l'estratto si tronca a 300, il resto non viaggia.
      const testo = 'x'.repeat(301);
      const post = await pubblicaPost(autore, testo);

      const risposta = await segnala(segnalante, {
        tipo: 'POST',
        soggettoId: post.id,
        motivo: 'SPAM',
      });
      expect(risposta.statusCode).toBe(201);

      expect(
        await prisma.segnalazione.count({
          where: { segnalanteId: segnalante.utenteId, soggettoId: post.id },
        }),
      ).toBe(1);

      const arrivate = email.segnalazioniPer(post.id);
      expect(arrivate).toHaveLength(1);
      expect(arrivate[0]!.estratto).toHaveLength(300);
      expect(arrivate[0]!.motivo).toBe('SPAM');
    });

    it('la doppia segnalazione è un\'operazione senza effetto: una riga, una email', async () => {
      const autore = await utentePubblico();
      const segnalante = await utentePubblico();
      const post = await pubblicaPost(autore, 'Contenuto molesto');

      const prima = await segnala(segnalante, {
        tipo: 'POST',
        soggettoId: post.id,
        motivo: 'MOLESTIE',
      });
      const seconda = await segnala(segnalante, {
        tipo: 'POST',
        soggettoId: post.id,
        motivo: 'MOLESTIE',
      });
      expect(prima.statusCode).toBe(201);
      expect(seconda.statusCode).toBe(201);

      expect(
        await prisma.segnalazione.count({
          where: { segnalanteId: segnalante.utenteId, soggettoId: post.id },
        }),
      ).toBe(1);
      expect(email.segnalazioniPer(post.id)).toHaveLength(1);
    });

    it('si segnala anche un commento', async () => {
      const autore = await utentePubblico();
      const commentatore = await utentePubblico();
      const segnalante = await utentePubblico();
      const post = await pubblicaPost(autore, 'Post');
      const commento = await commenta(commentatore, post.id, 'Commento da segnalare');
      const commentoId = commento.json().data.id as string;

      const risposta = await segnala(segnalante, {
        tipo: 'COMMENTO',
        soggettoId: commentoId,
        motivo: 'CONTENUTO_INAPPROPRIATO',
      });
      expect(risposta.statusCode).toBe(201);
      expect(email.segnalazioniPer(commentoId)).toHaveLength(1);
    });

    it('si segnala solo ciò che si vede: un post invisibile risponde 404', async () => {
      const autore = await utentePubblico();
      const segnalante = await utentePubblico();
      const post = await pubblicaPost(autore, 'Post che sparirà');
      await chiedi('/profilo/me/privacy', {
        method: 'PUT',
        headers: comeUtente(autore.token),
        payload: { visibilita: 'PRIVATO' },
      });

      const risposta = await segnala(segnalante, {
        tipo: 'POST',
        soggettoId: post.id,
        motivo: 'SPAM',
      });
      expect(risposta.statusCode).toBe(404);
      expect(email.segnalazioniPer(post.id)).toHaveLength(0);
    });

    it('motivo o tipo fuori dall\'elenco chiuso: 400, mai una stringa libera', async () => {
      const autore = await utentePubblico();
      const segnalante = await utentePubblico();
      const post = await pubblicaPost(autore, 'Post');

      const motivoLibero = await segnala(segnalante, {
        tipo: 'POST',
        soggettoId: post.id,
        motivo: 'NON_MI_PIACE',
      });
      expect(motivoLibero.statusCode).toBe(400);
      expect(motivoLibero.json().errorCode).toBe('V001');

      const tipoLibero = await segnala(segnalante, {
        tipo: 'MESSAGGIO',
        soggettoId: post.id,
        motivo: 'SPAM',
      });
      expect(tipoLibero.statusCode).toBe(400);
    });

    it('senza sessione non si segnala niente', async () => {
      const risposta = await chiedi('/segnalazioni', {
        method: 'POST',
        payload: { tipo: 'POST', soggettoId: '00000000-0000-0000-0000-000000000000', motivo: 'SPAM' },
      });
      expect(risposta.statusCode).toBe(401);
    });
  });

  describe('cancellazione ed esportazione', () => {
    it('la cancellazione porta via i blocchi da entrambi i lati e le mie segnalazioni', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const carla = await utentePubblico();
      await blocca(anna, bruno.utenteId); // anna bloccante
      await blocca(carla, anna.utenteId); // anna bloccata
      const post = await pubblicaPost(bruno, 'Post');
      await chiedi('/segnalazioni', {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { tipo: 'POST', soggettoId: post.id, motivo: 'SPAM' },
      });

      await chiedi('/account/cancellazione', { method: 'POST', headers: comeUtente(anna.token) });
      // Si invecchia la richiesta oltre la grazia invece di aspettare 14
      // giorni, come fa cancellazione.spec.
      await prisma.richiestaDiCancellazione.update({
        where: { utenteId: anna.utenteId },
        data: { eseguibileDal: new Date(Date.now() - 1000) },
      });
      await app.get(CancellazioneService).eseguiGiro();

      expect(
        await prisma.blocco.count({
          where: { OR: [{ bloccanteId: anna.utenteId }, { bloccatoId: anna.utenteId }] },
        }),
      ).toBe(0);
      expect(
        await prisma.segnalazione.count({ where: { segnalanteId: anna.utenteId } }),
      ).toBe(0);
    });

    it('l\'export dice chi ho bloccato (senza nomi) e cosa ho segnalato, mai chi mi ha bloccato', async () => {
      const anna = await utentePubblico();
      const bruno = await utentePubblico();
      const carla = await utentePubblico();
      await blocca(anna, bruno.utenteId);
      await blocca(carla, anna.utenteId);
      const post = await pubblicaPost(bruno, 'Post');
      await chiedi('/segnalazioni', {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { tipo: 'POST', soggettoId: post.id, motivo: 'MOLESTIE' },
      });

      const risposta = await chiedi('/account/dati', { headers: comeUtente(anna.token) });
      expect(risposta.statusCode).toBe(200);
      const dati = risposta.json().data as {
        profilo: { bloccati: Array<{ utenteId: string }> };
        segnalazioni: Array<{ soggettoId: string; motivo: string }>;
      };

      // Chi ho bloccato: l'identificativo sì, il nome no — è un dato suo.
      expect(dati.profilo.bloccati.map((b) => b.utenteId)).toEqual([bruno.utenteId]);
      expect(JSON.stringify(dati.profilo.bloccati)).not.toContain('nome');

      // Chi mi ha bloccato non è un mio dato: è una scelta di Carla, e non
      // deve comparire da nessuna parte in questo documento.
      expect(JSON.stringify(dati)).not.toContain(carla.utenteId);

      expect(dati.segnalazioni).toEqual([
        expect.objectContaining({ soggettoId: post.id, motivo: 'MOLESTIE' }),
      ]);
    });
  });
});
