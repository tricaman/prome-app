import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { CanaleNotificheSenzaFornitore } from '../src/infrastruttura/avvisi-in-uscita/canale-notifiche-senza-fornitore';
import { TRASPORTO_TEMPO_REALE } from '../src/infrastruttura/tempo-reale/trasporto';
import { TrasportoAssente } from '../src/infrastruttura/tempo-reale/trasporto-assente';
import { RecapitoFattiDellaBachecaService } from '../src/modules/bacheca/recapito-fatti.service';
import { NotificheInAppService } from '../src/modules/profilo/notifiche-in-app.service';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * La casella delle notifiche — la riga che nasce, chi la vede, come muore.
 *
 * Le regole nuove rispetto a E8, e perché vanno provate:
 *
 * - **la riga nasce SEMPRE**, anche a preferenza spenta: la preferenza
 *   significa «non interrompermi», non «nascondimi l'informazione». Il
 *   difetto opposto — riga soppressa dalla preferenza — non produce sintomi:
 *   chi ha spento i commenti semplicemente non saprebbe mai di averne;
 * - **la deduplica è la riga stessa**: l'outbox consegna at-least-once, e la
 *   seconda consegna deve trovare la riga e non rimandare nessun canale;
 * - **la riga non porta dati personali**: né nomi, né testi — solo tipo e
 *   riferimento. Ciò che esce (socket, email) ne porta ancora meno.
 *
 * Le suite girano in parallelo sullo stesso database: si contano SOLO le
 * proprie righe, mai i totali.
 */
describe('Notifiche in-app (casella e campanella)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let push: CanaleNotificheSenzaFornitore;
  let recapito: RecapitoFattiDellaBachecaService;
  let trasporto: TrasportoAssente;
  let inbox: NotificheInAppService;

  let contatore = 0;
  const nuovoIndirizzo = () => `casella-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  async function utenteCompleto(nome = 'Marta'): Promise<Utente> {
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
      payload: { nome, cognome: 'Rossi', corsoId: catalogo.corsoInformatica },
    });
    await chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { visibilita: 'PUBBLICO' },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  async function pubblicaPost(utente: Utente, testo: string) {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(utente.token),
      payload: { testo },
    });
    return risposta.json().data as { id: string };
  }

  async function commenta(utente: Utente, postId: string, testo: string) {
    const risposta = await chiedi(`/bacheca/${postId}/commenti`, {
      method: 'POST',
      headers: comeUtente(utente.token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
  }

  /** Le righe in casella di un utente, dalla sua API. */
  async function casellaDi(utente: Utente) {
    const risposta = await chiedi('/notifiche', { headers: comeUtente(utente.token) });
    expect(risposta.statusCode).toBe(200);
    return risposta.json() as {
      data: Array<{
        id: string;
        tipo: string;
        risorsaTipo: string;
        risorsaId: string;
        letta: boolean;
        creatoIl: string;
      }>;
      meta: { pagination: { total: number } };
    };
  }

  async function nonLetteDi(utente: Utente): Promise<number> {
    const risposta = await chiedi('/notifiche/conteggio', { headers: comeUtente(utente.token) });
    expect(risposta.statusCode).toBe(200);
    return risposta.json().data.nonLette as number;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    catalogo = await assicuraCatalogoDiProva(prisma);
    email = app.get(CanaleEmailSviluppo);
    push = app.get(CanaleNotificheSenzaFornitore);
    recapito = app.get(RecapitoFattiDellaBachecaService);
    trasporto = app.get(TRASPORTO_TEMPO_REALE);
    inbox = app.get(NotificheInAppService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('la riga nasce', () => {
    it('un commento diventa una riga nella casella del destinatario', async () => {
      const autore = await utenteCompleto('Anna');
      const lettore = await utenteCompleto('Luca');
      const post = await pubblicaPost(autore, 'Appunti di Analisi 2');

      await commenta(lettore, post.id, 'Grazie, utilissimi!');
      await recapito.eseguiGiro();

      const casella = await casellaDi(autore);
      const righe = casella.data.filter((riga) => riga.risorsaId === post.id);
      expect(righe).toHaveLength(1);
      expect(righe[0]).toMatchObject({
        tipo: 'COMMENTO',
        risorsaTipo: 'POST',
        risorsaId: post.id,
        letta: false,
      });
    });

    it('la doppia consegna del fatto non sdoppia la riga né i canali', async () => {
      const autore = await utenteCompleto('Anna');
      const lettore = await utenteCompleto('Luca');
      const post = await pubblicaPost(autore, 'Post da consegnare due volte');
      const commento = await commenta(lettore, post.id, 'Primo!');

      await recapito.eseguiGiro();
      // Si simula la ri-consegna: il fatto torna non consegnato, come dopo
      // un'interruzione a metà giro.
      await prisma.fattoInUscitaDellaBacheca.updateMany({
        where: { aggregatoId: commento.id },
        data: { consegnatoIl: null, prossimoTentativoIl: new Date() },
      });
      await recapito.eseguiGiro();

      const casella = await casellaDi(autore);
      expect(casella.data.filter((riga) => riga.risorsaId === post.id)).toHaveLength(1);
      // E l'email del commento è partita una volta sola: l'ultima registrata
      // per quell'indirizzo punta al post, e la mappa non può dire «due» —
      // quindi si guarda il canale push, che accumula.
      const pushPartiti = push.ultimiAvvisi.filter((r) => r.avviso.percorso.includes(post.id));
      expect(pushPartiti.length).toBeLessThanOrEqual(1);
    });

    it('nessuna riga per un commento al proprio post', async () => {
      const autore = await utenteCompleto('Anna');
      const post = await pubblicaPost(autore, 'Mi rispondo da solo');

      await commenta(autore, post.id, 'Nota per me');
      await recapito.eseguiGiro();

      const casella = await casellaDi(autore);
      expect(casella.data.filter((riga) => riga.risorsaId === post.id)).toHaveLength(0);
    });

    it('nessuna riga fra coppie bloccate', async () => {
      const autore = await utenteCompleto('Anna');
      const lettore = await utenteCompleto('Luca');
      const post = await pubblicaPost(autore, 'Post prima del blocco');
      const commento = await commenta(lettore, post.id, 'Commento prima del blocco');

      // Il blocco arriva DOPO il commento ma PRIMA della consegna: la regola
      // si legge all'istante dell'invio, e la riga non deve nascere.
      await chiedi(`/profilo/me/blocchi/${lettore.utenteId}`, {
        method: 'PUT',
        headers: comeUtente(autore.token),
      });
      await recapito.eseguiGiro();

      const casella = await casellaDi(autore);
      expect(casella.data.filter((riga) => riga.risorsaId === post.id)).toHaveLength(0);
      // Il fatto risulta comunque consegnato: soppresso, non in coda.
      const fatto = await prisma.fattoInUscitaDellaBacheca.findFirst({
        where: { aggregatoId: commento.id },
      });
      expect(fatto?.consegnatoIl).not.toBeNull();
    });

    it('un invito in un gruppo diventa una riga per chi è già iscritto', async () => {
      const moderatore = await utenteCompleto('Anna');
      const invitato = await utenteCompleto('Luca');
      const gruppo = await chiedi('/gruppi', {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { nome: `Gruppo casella ${Date.now()}-${contatore}`, visibilita: 'PRIVATO' },
      });
      const gruppoId = gruppo.json().data.id as string;

      const invito = await chiedi(`/gruppi/${gruppoId}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: invitato.indirizzo },
      });
      expect(invito.statusCode).toBe(201);
      const invitoId = invito.json().data.id as string;

      const casella = await casellaDi(invitato);
      const righe = casella.data.filter((riga) => riga.risorsaId === invitoId);
      expect(righe).toHaveLength(1);
      expect(righe[0]).toMatchObject({ tipo: 'INVITO_GRUPPO', risorsaTipo: 'INVITO_GRUPPO' });
    });

    it('un invito a un indirizzo senza account non lascia righe da nessuna parte', async () => {
      const moderatore = await utenteCompleto('Anna');
      const gruppo = await chiedi('/gruppi', {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { nome: `Gruppo ignoto ${Date.now()}-${contatore}`, visibilita: 'PRIVATO' },
      });
      const gruppoId = gruppo.json().data.id as string;

      const invito = await chiedi(`/gruppi/${gruppoId}/inviti`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { destinatario: nuovoIndirizzo() },
      });
      // 201 comunque: chi invita non deve poter dedurre se l'indirizzo ha un
      // account.
      expect(invito.statusCode).toBe(201);
      const invitoId = invito.json().data.id as string;
      expect(await prisma.notifica.count({ where: { risorsaId: invitoId } })).toBe(0);
    });
  });

  describe('le preferenze governano i canali, mai la riga', () => {
    it('preferenza spenta: la riga nasce, l\'email no', async () => {
      const autore = await utenteCompleto('Anna');
      const lettore = await utenteCompleto('Luca');
      await chiedi('/notifiche/preferenze', {
        method: 'PUT',
        headers: comeUtente(autore.token),
        payload: { commenti: false },
      });
      const post = await pubblicaPost(autore, 'Post con avvisi spenti');

      await commenta(lettore, post.id, 'Un commento silenzioso');
      await recapito.eseguiGiro();

      const casella = await casellaDi(autore);
      expect(casella.data.filter((riga) => riga.risorsaId === post.id)).toHaveLength(1);
      const notifica = email.ultimaNotificaCommentoPer(autore.indirizzo);
      expect(notifica).toBeUndefined();
    });

    it('preferenza accesa: parte l\'email col collegamento al post, e nient\'altro dentro', async () => {
      const autore = await utenteCompleto('Anna');
      const lettore = await utenteCompleto('Luca');
      const post = await pubblicaPost(autore, 'Post con avvisi accesi');

      await commenta(lettore, post.id, 'Commento con nome e cognome dentro');
      await recapito.eseguiGiro();

      const notifica = email.ultimaNotificaCommentoPer(autore.indirizzo);
      expect(notifica).toBeDefined();
      expect(notifica!.collegamento).toContain(`/app/post/${post.id}`);
      // Niente testo del commento, niente nomi, niente indirizzi altrui.
      const testo = JSON.stringify(notifica);
      expect(testo).not.toContain('Commento con nome');
      expect(testo).not.toContain('Luca');
      expect(testo).not.toContain(lettore.indirizzo);
    });
  });

  describe('il tempo reale', () => {
    it('la riga nuova pubblica un evento nella stanza personale, col solo id', async () => {
      const autore = await utenteCompleto('Anna');
      const lettore = await utenteCompleto('Luca');
      const post = await pubblicaPost(autore, 'Post col badge live');

      await commenta(lettore, post.id, 'Ping');
      await recapito.eseguiGiro();

      const eventi = trasporto
        .pubblicati()
        .filter((p) => p.stanza === `utente:${autore.utenteId}` && p.evento === 'notifica');
      expect(eventi.length).toBeGreaterThanOrEqual(1);
      // Il dato è il solo id della riga: né tipo, né testi, né chi.
      const dato = eventi[eventi.length - 1].dato as Record<string, unknown>;
      expect(Object.keys(dato)).toEqual(['id']);
    });
  });

  describe('leggere', () => {
    it('l\'elenco è paginato, dal più recente, e mostra solo le mie', async () => {
      const anna = await utenteCompleto('Anna');
      const luca = await utenteCompleto('Luca');
      const post1 = await pubblicaPost(anna, 'Primo post');
      const post2 = await pubblicaPost(anna, 'Secondo post');
      await commenta(luca, post1.id, 'c1');
      await commenta(luca, post2.id, 'c2');
      await recapito.eseguiGiro();

      const diAnna = await casellaDi(anna);
      const mie = diAnna.data.filter((riga) => [post1.id, post2.id].includes(riga.risorsaId));
      expect(mie).toHaveLength(2);
      // Dal più recente: il secondo post prima del primo.
      expect(mie[0].risorsaId).toBe(post2.id);

      const diLuca = await casellaDi(luca);
      expect(diLuca.data.filter((riga) => [post1.id, post2.id].includes(riga.risorsaId))).toHaveLength(0);
    });

    it('il conteggio scende leggendo, e leggere due volte non è un errore', async () => {
      const anna = await utenteCompleto('Anna');
      const luca = await utenteCompleto('Luca');
      const post = await pubblicaPost(anna, 'Post da leggere');
      await commenta(luca, post.id, 'c');
      await recapito.eseguiGiro();

      const prima = await nonLetteDi(anna);
      const casella = await casellaDi(anna);
      const riga = casella.data.find((r) => r.risorsaId === post.id)!;

      const letta = await chiedi(`/notifiche/${riga.id}/letta`, {
        method: 'PUT',
        headers: comeUtente(anna.token),
      });
      expect(letta.statusCode).toBe(200);
      expect(letta.json().data.letta).toBe(true);

      expect(await nonLetteDi(anna)).toBe(prima - 1);

      // Idempotente: stessa risposta, stesso conteggio.
      const diNuovo = await chiedi(`/notifiche/${riga.id}/letta`, {
        method: 'PUT',
        headers: comeUtente(anna.token),
      });
      expect(diNuovo.statusCode).toBe(200);
      expect(diNuovo.json().data.letta).toBe(true);
      expect(await nonLetteDi(anna)).toBe(prima - 1);
    });

    it('la notifica di un altro risponde 404, come quella che non esiste', async () => {
      const anna = await utenteCompleto('Anna');
      const luca = await utenteCompleto('Luca');
      const post = await pubblicaPost(anna, 'Post riservato');
      await commenta(luca, post.id, 'c');
      await recapito.eseguiGiro();

      const casella = await casellaDi(anna);
      const riga = casella.data.find((r) => r.risorsaId === post.id)!;

      const altrui = await chiedi(`/notifiche/${riga.id}/letta`, {
        method: 'PUT',
        headers: comeUtente(luca.token),
      });
      expect(altrui.statusCode).toBe(404);
      expect(altrui.json().errorCode).toBe('PR013');

      const inesistente = await chiedi(
        '/notifiche/00000000-0000-4000-8000-000000000000/letta',
        { method: 'PUT', headers: comeUtente(anna.token) },
      );
      expect(inesistente.statusCode).toBe(404);
      expect(inesistente.json().errorCode).toBe('PR013');
    });

    it('«segna tutte» azzera il conteggio', async () => {
      const anna = await utenteCompleto('Anna');
      const luca = await utenteCompleto('Luca');
      const post1 = await pubblicaPost(anna, 'p1');
      const post2 = await pubblicaPost(anna, 'p2');
      await commenta(luca, post1.id, 'c1');
      await commenta(luca, post2.id, 'c2');
      await recapito.eseguiGiro();

      const tutte = await chiedi('/notifiche/lette', {
        method: 'PUT',
        headers: comeUtente(anna.token),
      });
      expect(tutte.statusCode).toBe(200);
      expect(tutte.json().data.nonLette).toBe(0);
      expect(await nonLetteDi(anna)).toBe(0);

      const casella = await casellaDi(anna);
      for (const riga of casella.data) expect(riga.letta).toBe(true);
    });
  });

  describe('la casella come detentore', () => {
    it('l\'esportazione contiene le notifiche, senza il riferimento al contenuto altrui', async () => {
      const anna = await utenteCompleto('Anna');
      const luca = await utenteCompleto('Luca');
      const post = await pubblicaPost(anna, 'Post da esportare');
      await commenta(luca, post.id, 'c');
      await recapito.eseguiGiro();

      const copia = await chiedi('/account/dati', { headers: comeUtente(anna.token) });
      expect(copia.statusCode).toBe(200);
      const notifiche = copia.json().data.profilo.notifiche as Array<Record<string, unknown>>;
      expect(notifiche.length).toBeGreaterThanOrEqual(1);
      expect(notifiche[0]).toHaveProperty('tipo');
      expect(notifiche[0]).toHaveProperty('letta');
      expect(notifiche[0]).toHaveProperty('ricevutaIl');
      expect(notifiche[0]).not.toHaveProperty('risorsaId');
      // L'id del post di per sé non è nella copia via notifiche.
      expect(JSON.stringify(notifiche)).not.toContain(post.id);
    });

    it('la pulizia elimina le lette vecchie e risparmia le non lette', async () => {
      const anna = await utenteCompleto('Anna');
      const luca = await utenteCompleto('Luca');
      const post1 = await pubblicaPost(anna, 'letto tempo fa');
      const post2 = await pubblicaPost(anna, 'mai letto');
      await commenta(luca, post1.id, 'c1');
      await commenta(luca, post2.id, 'c2');
      await recapito.eseguiGiro();

      const quarantaGiorniFa = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      // La prima: letta, 40 giorni fa. La seconda: vecchia ma mai letta.
      await prisma.notifica.updateMany({
        where: { destinatarioId: anna.utenteId, risorsaId: post1.id },
        data: { lettaIl: quarantaGiorniFa, creatoIl: quarantaGiorniFa },
      });
      await prisma.notifica.updateMany({
        where: { destinatarioId: anna.utenteId, risorsaId: post2.id },
        data: { creatoIl: quarantaGiorniFa },
      });

      await inbox.eseguiGiro();

      expect(
        await prisma.notifica.count({ where: { destinatarioId: anna.utenteId, risorsaId: post1.id } }),
      ).toBe(0);
      expect(
        await prisma.notifica.count({ where: { destinatarioId: anna.utenteId, risorsaId: post2.id } }),
      ).toBe(1);
    });
  });
});
