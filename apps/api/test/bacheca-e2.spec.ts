import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { LUNGHEZZA_MASSIMA_COMMENTO } from '@prome/contracts';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { ArchivioLocale } from '../src/infrastruttura/archivio-file/archivio-locale';
import { PuliziaBachecaService } from '../src/modules/bacheca/pulizia-bacheca.service';

/**
 * Post completi e commenti (E2.1, E2.2, E2.4).
 *
 * Le due cose che questi test difendono sono i permessi — chi può modificare,
 * eliminare, moderare — e la differenza di modello fra allegato e commento:
 * il primo sparisce **con** il post, il secondo **dopo**, ed è una scelta, non
 * una dimenticanza.
 */
describe('Bacheca — post completi e commenti (E2)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;
  let archivio: ArchivioLocale;
  let pulizia: PuliziaBachecaService;

  let contatore = 0;
  const nuovoIndirizzo = () => `e2-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  async function utenteCompleto(): Promise<string> {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const token = verifica.json().data.token as string;
    await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });
    return token;
  }

  /**
   * Apre la visibilità dei contenuti. Da E6.2 completata (privacy applicata
   * anche ai commenti), commentare o leggere i commenti esige di **vedere**
   * il post e i loro autori: chi nasce PRIVATO non è visibile a nessuno.
   * Si passa dall'API, la sola via che un utente ha davvero.
   */
  async function visibileATutti(token: string): Promise<void> {
    const risposta = await chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { visibilita: 'PUBBLICO' },
    });
    expect(risposta.statusCode).toBe(200);
  }

  async function pubblicaPost(token: string, testo: string, allegati: string[] = []) {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo, allegati },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
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
    pulizia = app.get(PuliziaBachecaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('modifica del post (E2.1)', () => {
    it('l\'autore corregge il testo', async () => {
      const token = await utenteCompleto();
      const post = await pubblicaPost(token, 'Testo con un errrore');

      const risposta = await chiedi(`/bacheca/${post.id}`, {
        method: 'PATCH',
        headers: comeUtente(token),
        payload: { testo: '  Testo corretto  ' },
      });

      expect(risposta.statusCode).toBe(200);
      expect(risposta.json().data.testo).toBe('Testo corretto');
      expect(risposta.json().meta.message).toBe('Post aggiornato');
    });

    it('un altro utente non può modificarlo', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Roba mia');

      const risposta = await chiedi(`/bacheca/${post.id}`, {
        method: 'PATCH',
        headers: comeUtente(estraneo),
        payload: { testo: 'Ci scrivo io' },
      });

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('BA010');
      expect(risposta.json().message).toBe('Puoi modificare o eliminare solo i tuoi post');
    });

    it('un post inesistente è 404, non 403: sono due azioni diverse per l\'utente', async () => {
      const token = await utenteCompleto();
      const risposta = await chiedi('/bacheca/00000000-0000-0000-0000-000000000000', {
        method: 'PATCH',
        headers: comeUtente(token),
        payload: { testo: 'Ciao' },
      });
      expect(risposta.statusCode).toBe(404);
      expect(risposta.json().errorCode).toBe('BA001');
    });

    it('la modifica non aggira le invarianti del testo', async () => {
      const token = await utenteCompleto();
      const post = await pubblicaPost(token, 'Va bene così');

      const risposta = await chiedi(`/bacheca/${post.id}`, {
        method: 'PATCH',
        headers: comeUtente(token),
        payload: { testo: '   ' },
      });
      expect(risposta.statusCode).toBe(400);
    });
  });

  describe('eliminazione del post (E2.1)', () => {
    it('porta via gli allegati nella stessa scrittura e i file dall\'archivio', async () => {
      const token = await utenteCompleto();
      const chiave = await caricaFile(token, 'da-eliminare.txt', 'contenuto');
      const post = await pubblicaPost(token, 'Con allegato', [chiave]);

      expect(await archivio.eStatoCaricato(chiave)).toBe(true);

      const risposta = await chiedi(`/bacheca/${post.id}`, {
        method: 'DELETE',
        headers: comeUtente(token),
      });

      expect(risposta.statusCode).toBe(200);
      expect(risposta.json().meta.message).toBe('Post eliminato');
      expect(await prisma.allegato.count({ where: { postId: post.id } })).toBe(0);
      // Il file esce dall'archivio: lasciarlo vorrebbe dire pagare spazio per
      // un contenuto che l'utente ha cancellato.
      expect(await archivio.eStatoCaricato(chiave)).toBe(false);
    });

    it('un altro utente non può eliminarlo', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Roba mia');

      const risposta = await chiedi(`/bacheca/${post.id}`, {
        method: 'DELETE',
        headers: comeUtente(estraneo),
      });

      expect(risposta.statusCode).toBe(403);
      expect(await prisma.post.count({ where: { id: post.id } })).toBe(1);
    });
  });

  describe('commenti (E2.4)', () => {
    it('si commenta un post e il commento compare nella discussione', async () => {
      const autore = await utenteCompleto();
      const lettore = await utenteCompleto();
      await visibileATutti(autore);
      const post = await pubblicaPost(autore, 'Domanda sugli integrali');

      const commento = await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(lettore),
        payload: { testo: '  Ti rispondo io  ' },
      });

      expect(commento.statusCode).toBe(201);
      expect(commento.json().data.testo).toBe('Ti rispondo io');
      expect(commento.json().meta.message).toBe('Commento pubblicato');

      const discussione = await chiedi(`/bacheca/${post.id}/commenti`, {
        headers: comeUtente(lettore),
      });
      expect(discussione.json().data).toHaveLength(1);
      expect(discussione.json().meta.pagination.total).toBe(1);
    });

    it('i commenti si leggono dal più vecchio: una discussione ha un ordine', async () => {
      const autore = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Discussione');
      for (const testo of ['primo', 'secondo', 'terzo']) {
        await chiedi(`/bacheca/${post.id}/commenti`, {
          method: 'POST',
          headers: comeUtente(autore),
          payload: { testo },
        });
      }

      const discussione = await chiedi(`/bacheca/${post.id}/commenti`, {
        headers: comeUtente(autore),
      });
      expect(discussione.json().data.map((c: { testo: string }) => c.testo)).toEqual([
        'primo',
        'secondo',
        'terzo',
      ]);
    });

    it('rifiuta un commento vuoto o oltre i 2.000 caratteri (C1)', async () => {
      const token = await utenteCompleto();
      const post = await pubblicaPost(token, 'Post');

      const vuoto = await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: '  ' },
      });
      expect(vuoto.statusCode).toBe(400);

      const lungo = await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'a'.repeat(LUNGHEZZA_MASSIMA_COMMENTO + 1) },
      });
      expect(lungo.statusCode).toBe(400);
    });

    it('non si commenta un post che non esiste (verifica al comando, C3)', async () => {
      const token = await utenteCompleto();
      const risposta = await chiedi('/bacheca/00000000-0000-0000-0000-000000000000/commenti', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Ciao' },
      });
      expect(risposta.statusCode).toBe(404);
      expect(risposta.json().errorCode).toBe('BA001');
    });
  });

  describe('moderazione dei commenti (E2.4)', () => {
    it('chi ha scritto il commento può eliminarlo', async () => {
      const autore = await utenteCompleto();
      const commentatore = await utenteCompleto();
      await visibileATutti(autore);
      await visibileATutti(commentatore);
      const post = await pubblicaPost(autore, 'Post');
      const commento = await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(commentatore),
        payload: { testo: 'Mio commento' },
      });

      const risposta = await chiedi(`/bacheca/commenti/${commento.json().data.id}`, {
        method: 'DELETE',
        headers: comeUtente(commentatore),
      });
      expect(risposta.statusCode).toBe(200);
    });

    it('l\'autore del post modera ciò che sta sotto al suo contenuto', async () => {
      const autore = await utenteCompleto();
      const commentatore = await utenteCompleto();
      await visibileATutti(autore);
      await visibileATutti(commentatore);
      const post = await pubblicaPost(autore, 'Post');
      const commento = await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(commentatore),
        payload: { testo: 'Fuori tema' },
      });

      const risposta = await chiedi(`/bacheca/commenti/${commento.json().data.id}`, {
        method: 'DELETE',
        headers: comeUtente(autore),
      });
      expect(risposta.statusCode).toBe(200);
      expect(await prisma.commento.count({ where: { postId: post.id } })).toBe(0);
    });

    it('un estraneo non può eliminare il commento di un altro', async () => {
      const autore = await utenteCompleto();
      const commentatore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      await visibileATutti(autore);
      await visibileATutti(commentatore);
      const post = await pubblicaPost(autore, 'Post');
      const commento = await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(commentatore),
        payload: { testo: 'Commento' },
      });

      const risposta = await chiedi(`/bacheca/commenti/${commento.json().data.id}`, {
        method: 'DELETE',
        headers: comeUtente(estraneo),
      });
      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('BA014');
    });

    it('dice al client chi può eliminare cosa, invece di farglielo indovinare', async () => {
      const autore = await utenteCompleto();
      const commentatore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      await visibileATutti(autore);
      await visibileATutti(commentatore);
      const post = await pubblicaPost(autore, 'Post');
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(commentatore),
        payload: { testo: 'Commento' },
      });

      const perAutore = await chiedi(`/bacheca/${post.id}/commenti`, { headers: comeUtente(autore) });
      const perEstraneo = await chiedi(`/bacheca/${post.id}/commenti`, {
        headers: comeUtente(estraneo),
      });

      expect(perAutore.json().data[0].puoEliminare).toBe(true);
      expect(perEstraneo.json().data[0].puoEliminare).toBe(false);
    });
  });

  describe('lettura di un singolo post (E2.3)', () => {
    it('l\'autore lo legge dal suo indirizzo', async () => {
      const token = await utenteCompleto();
      const post = await pubblicaPost(token, 'Dettaglio del post');

      const risposta = await chiedi(`/bacheca/${post.id}`, { headers: comeUtente(token) });
      expect(risposta.statusCode).toBe(200);
      expect(risposta.json().data.testo).toBe('Dettaglio del post');
    });

    it('un post non visibile risponde 404 come uno inesistente', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Privato per difetto');

      // Stessa risposta del post che non esiste: dire «esiste ma non puoi
      // vederlo» racconta comunque che esiste.
      const risposta = await chiedi(`/bacheca/${post.id}`, { headers: comeUtente(estraneo) });
      expect(risposta.statusCode).toBe(404);
      expect(risposta.json().errorCode).toBe('BA001');
    });
  });

  describe('permessi dichiarati al client', () => {
    it('dice se chi legge può modificare il post, invece di farglielo dedurre', async () => {
      const autore = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Post con permessi');

      const perAutore = await chiedi(`/bacheca/${post.id}`, { headers: comeUtente(autore) });
      expect(perAutore.json().data.puoModificare).toBe(true);

      // Si cerca il post per id: il feed condiviso può contenere anche
      // contenuti anonimizzati di altre suite, visibili a tutti per progetto.
      const bacheca = await chiedi('/bacheca?limit=50', { headers: comeUtente(autore) });
      const nelFeed = bacheca
        .json()
        .data.find((p: { id: string }) => p.id === post.id);
      expect(nelFeed.puoModificare).toBe(true);
    });
  });

  describe('coerenza differita', () => {
    it('i commenti di un post eliminato spariscono al giro dell\'unità lavoratrice', async () => {
      const autore = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Post con discussione');
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(autore),
        payload: { testo: 'Un commento' },
      });

      await chiedi(`/bacheca/${post.id}`, { method: 'DELETE', headers: comeUtente(autore) });

      // Subito dopo la cancellazione i commenti ci sono ancora: è voluto, e
      // non è un difetto — il commento è un aggregato autonomo e nessuno lo
      // sta aspettando.
      expect(await prisma.commento.count({ where: { postId: post.id } })).toBe(1);

      // Un giro solo, di proposito: la query della pulizia chiede al database
      // direttamente gli orfani (NOT EXISTS), quindi un post eliminato coi
      // suoi commenti DEVE cadere al primo passaggio anche con altre suite
      // in corsa. La versione a lotto ciechi — che poteva saltarlo — è stata
      // corretta proprio perché questo test la mostrava a intermittenza.
      await pulizia.eseguiGiro();
      expect(await prisma.commento.count({ where: { postId: post.id } })).toBe(0);
    });

    it('la pulizia non tocca i commenti dei post ancora vivi', async () => {
      const autore = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Post vivo');
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(autore),
        payload: { testo: 'Resto qui' },
      });

      await pulizia.eseguiGiro();
      expect(await prisma.commento.count({ where: { postId: post.id } })).toBe(1);
    });

    it('raccoglie i caricamenti abbandonati, ma non quelli appena iniziati', async () => {
      const token = await utenteCompleto();
      const recente = await caricaFile(token, 'appena-caricato.txt', 'byte');
      const vecchia = await caricaFile(token, 'dimenticato.txt', 'byte');

      // Si invecchia una sola prenotazione: l'altra deve sopravvivere, perché
      // potrebbe avere un caricamento ancora in corso.
      await prisma.allegatoInAttesa.updateMany({
        where: { chiave: vecchia },
        data: { creatoIl: new Date(Date.now() - 60 * 60 * 1000) },
      });

      const esito = await pulizia.eseguiGiro();

      expect(esito.prenotazioni).toBeGreaterThanOrEqual(1);
      expect(await prisma.allegatoInAttesa.count({ where: { chiave: vecchia } })).toBe(0);
      expect(await archivio.eStatoCaricato(vecchia)).toBe(false);
      expect(await prisma.allegatoInAttesa.count({ where: { chiave: recente } })).toBe(1);
      expect(await archivio.eStatoCaricato(recente)).toBe(true);
    });
  });
});
