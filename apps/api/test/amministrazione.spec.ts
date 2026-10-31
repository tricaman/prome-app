import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * The admin panel API, written before the code.
 *
 * The invisible defect here is a leak: a list that ignores privacy and blocks
 * by design must answer to one person only, and to everyone else it must
 * look like a route that does not exist.
 */
describe('Amministrazione', () => {
  let app: NestFastifyApplication;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;

  let contatore = 0;
  const nuovoIndirizzo = () => `admin-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;
  const ENDPOINT = ['/admin/utenti', '/admin/segnalazioni', '/admin/post'] as const;

  type Richiesta = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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

  async function entra(indirizzo: string): Promise<string> {
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });

    return verifica.json().data.token as string;
  }

  async function utente(visibilita: 'PRIVATO' | 'PUBBLICO', nome = 'Marta'): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    const token = await entra(indirizzo);
    const profilo = await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { nome, cognome: 'Rossi', corsoId: catalogo.corsoInformatica },
    });
    await chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { visibilita },
    });

    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  async function pubblicaPost(autore: Utente, testo: string): Promise<string> {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(autore.token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);

    return risposta.json().data.id as string;
  }

  let amministratore: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    catalogo = await assicuraCatalogoDiProva(app.get(PrismaService));
    email = app.get(CanaleEmailSviluppo);
    // Mixed case on purpose: the address is compared case-insensitively.
    amministratore = await entra(process.env.EMAIL_AMMINISTRATORE!.toUpperCase());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('who gets in', () => {
    it.each(ENDPOINT)('%s without a session answers 401', async (percorso) => {
      expect((await chiedi(percorso)).statusCode).toBe(401);
    });

    it.each(ENDPOINT)('%s for anyone but the admin looks like a missing route', async (percorso) => {
      const qualcuno = await utente('PUBBLICO');
      const risposta = await chiedi(percorso, { headers: comeUtente(qualcuno.token) });
      const inesistente = await chiedi('/admin/non-esiste', { headers: comeUtente(qualcuno.token) });

      expect(risposta.statusCode).toBe(404);
      // Same code AND same translated message: either one differing tells the route exists.
      expect(risposta.json()).toMatchObject({
        errorCode: inesistente.json().errorCode,
        message: inesistente.json().message,
      });
    });
  });

  describe('registered users', () => {
    it('lists the newest users with email, name and course', async () => {
      const marta = await utente('PRIVATO', 'Marta');

      const risposta = await chiedi('/admin/utenti?limit=100', {
        headers: comeUtente(amministratore),
      });

      expect(risposta.statusCode).toBe(200);
      expect(risposta.json().meta.pagination).toMatchObject({ page: 1, limit: 100 });
      const riga = (risposta.json().data as Array<Record<string, unknown>>).find(
        (u) => u.utenteId === marta.utenteId,
      );

      expect(riga).toMatchObject({
        email: marta.indirizzo,
        nome: 'Marta',
        cognome: 'Rossi',
        onboardingCompletato: true,
        inCancellazioneDal: null,
      });
      expect(riga?.corso).toEqual(expect.any(String));
      expect(riga?.universita).toEqual(expect.any(String));
      expect(riga?.registratoIl).toEqual(expect.any(String));
    });
  });

  describe('posts', () => {
    it('lists every post, private authors included', async () => {
      const riservata = await utente('PRIVATO');
      const postId = await pubblicaPost(riservata, 'Visible to its author and to the admin only');

      const risposta = await chiedi('/admin/post?limit=100', {
        headers: comeUtente(amministratore),
      });

      expect(risposta.statusCode).toBe(200);
      const post = (risposta.json().data as Array<{ id: string; testo: string }>).find(
        (p) => p.id === postId,
      );

      expect(post?.testo).toBe('Visible to its author and to the admin only');
    });
  });

  describe('reports', () => {
    it('shows who reported what, the content as it is now, and its author', async () => {
      const autrice = await utente('PUBBLICO', 'Anna');
      const segnalante = await utente('PUBBLICO', 'Bruno');
      const postId = await pubblicaPost(autrice, 'Buy cheap notes here');
      await chiedi('/segnalazioni', {
        method: 'POST',
        headers: comeUtente(segnalante.token),
        payload: { tipo: 'POST', soggettoId: postId, motivo: 'SPAM' },
      });

      const riga = await segnalazioneSu(postId);

      expect(riga).toMatchObject({
        tipo: 'POST',
        motivo: 'SPAM',
        soggettoId: postId,
        postId,
        testo: 'Buy cheap notes here',
        segnalanteId: segnalante.utenteId,
        segnalanteNome: 'Bruno Rossi',
        autoreId: autrice.utenteId,
        autoreNome: 'Anna Rossi',
      });
    });

    it('a report on a deleted post stays, with no content', async () => {
      const autrice = await utente('PUBBLICO');
      const segnalante = await utente('PUBBLICO');
      const postId = await pubblicaPost(autrice, 'Gone soon');
      await chiedi('/segnalazioni', {
        method: 'POST',
        headers: comeUtente(segnalante.token),
        payload: { tipo: 'POST', soggettoId: postId, motivo: 'MOLESTIE' },
      });
      await chiedi(`/bacheca/${postId}`, { method: 'DELETE', headers: comeUtente(autrice.token) });

      expect(await segnalazioneSu(postId)).toMatchObject({
        motivo: 'MOLESTIE',
        testo: null,
        autoreId: null,
        autoreNome: null,
      });
    });

    async function segnalazioneSu(soggettoId: string) {
      const risposta = await chiedi('/admin/segnalazioni?limit=100', {
        headers: comeUtente(amministratore),
      });
      expect(risposta.statusCode).toBe(200);

      return (risposta.json().data as Array<{ soggettoId: string }>).find(
        (s) => s.soggettoId === soggettoId,
      );
    }
  });
});
