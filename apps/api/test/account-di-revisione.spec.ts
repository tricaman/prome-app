import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { env } from '../src/config/env';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { INDIRIZZI_DI_REVISIONE } from '../src/infrastruttura/accesso/better-auth';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { RecapitoFattiDellaBachecaService } from '../src/modules/bacheca/recapito-fatti.service';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * The store review accounts, written before the code.
 *
 * Stores test the app with them, so nothing they write may reach a real user:
 * each sees its own content, nobody else does, whatever its privacy settings
 * say. Their rooms and groups are private, their invitations never leave, and
 * they cannot enter anyone else's space. The leak is invisible from their side,
 * which is exactly why it is tested.
 */
describe('Account di revisione', () => {
  let app: NestFastifyApplication;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let recapito: RecapitoFattiDellaBachecaService;

  let contatore = 0;
  const nuovoIndirizzo = () => `revisione-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  async function entra(indirizzo: string, codice?: string): Promise<string> {
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: codice ?? email.ultimoCodicePer(indirizzo) },
    });

    // Undefined on a refused verify, so the review sign-in below can retry.
    return verifica.json().data?.token as string;
  }

  /** Completes the profile and opens it to everyone: privacy must not be what hides it. */
  async function pubblico(token: string, nome: string): Promise<string> {
    await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { nome, cognome: 'Rossi', corsoId: catalogo.corsoInformatica },
    });
    await chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { visibilita: 'PUBBLICO' },
    });

    return token;
  }

  const utente = async (nome = 'Marta') => pubblico(await entra(nuovoIndirizzo()), nome);

  async function pubblica(token: string, testo: string): Promise<string> {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);

    return risposta.json().data.id as string;
  }

  const commenta = (token: string, postId: string, testo: string) =>
    chiedi(`/bacheca/${postId}/commenti`, {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo },
    });

  async function vedeNelFeed(token: string, postId: string): Promise<boolean> {
    const feed = await chiedi('/bacheca?limit=100', { headers: comeUtente(token) });

    return (feed.json().data as Array<{ id: string }>).some((post) => post.id === postId);
  }

  const dettaglio = async (token: string, postId: string) =>
    (await chiedi(`/bacheca/${postId}`, { headers: comeUtente(token) })).statusCode;

  async function creaAula(token: string, visibilita?: string): Promise<{ id: string; visibilita: string }> {
    const risposta = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { titolo: 'Analisi 1', ...(visibilita ? { visibilita } : {}) },
    });
    expect(risposta.statusCode).toBe(201);

    return risposta.json().data;
  }

  async function creaGruppo(token: string, visibilita?: string): Promise<{ id: string; visibilita: string }> {
    const risposta = await chiedi('/gruppi', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { nome: 'Gruppo di studio', ...(visibilita ? { visibilita } : {}) },
    });
    expect(risposta.statusCode).toBe(201);

    return risposta.json().data;
  }

  const invita = (token: string, spazio: 'aule-studio' | 'gruppi', id: string, destinatario: string) =>
    chiedi(`/${spazio}/${id}/inviti`, {
      method: 'POST',
      headers: comeUtente(token),
      payload: { destinatario },
    });

  const revisione: Record<string, string> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    catalogo = await assicuraCatalogoDiProva(app.get(PrismaService));
    email = app.get(CanaleEmailSviluppo);
    recapito = app.get(RecapitoFattiDellaBachecaService);
    for (const indirizzo of INDIRIZZI_DI_REVISIONE) {
      // The access spec signs these accounts in too, in parallel: a verify of
      // theirs can consume our pending code, so a missed token is retried.
      let token: string | undefined;
      for (let tentativo = 0; !token && tentativo < 5; tentativo += 1) {
        token = await entra(indirizzo, env.CODICE_REVISIONE);
      }
      revisione[indirizzo] = await pubblico(token!, 'Review');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe.each(INDIRIZZI_DI_REVISIONE)('%s', (indirizzo) => {
    const io = () => revisione[indirizzo];

    describe('bacheca', () => {
      it('its posts are visible to itself only, PUBBLICO notwithstanding', async () => {
        const altro = await utente();
        const post = await pubblica(io(), 'Written by the store review');

        expect(await dettaglio(altro, post)).toBe(404);
        expect(await vedeNelFeed(altro, post)).toBe(false);
        expect(await dettaglio(io(), post)).toBe(200);
        expect(await vedeNelFeed(io(), post)).toBe(true);
      });

      it('its comments stay hidden and never notify the author of the post', async () => {
        const autrice = await utente('Anna');
        const altro = await utente('Bruno');
        const suo = await pubblica(autrice, 'Commented by the store review');
        const controllo = await pubblica(autrice, 'Commented by a real user');

        expect((await commenta(io(), suo, 'Review comment')).statusCode).toBe(201);
        expect((await commenta(altro, controllo, 'Real comment')).statusCode).toBe(201);
        await recapito.eseguiGiro();

        const commenti = await chiedi(`/bacheca/${suo}/commenti`, { headers: comeUtente(autrice) });
        const avvisi = await chiedi('/notifiche?limit=100', { headers: comeUtente(autrice) });
        const risorse = (avvisi.json().data as Array<{ risorsaId: string }>).map((n) => n.risorsaId);

        expect(commenti.json().data).toHaveLength(0);
        // The control proves delivery ran: only the review comment stays silent.
        expect(risorse).toContain(controllo);
        expect(risorse).not.toContain(suo);
      });
    });

    describe('aule studio', () => {
      it('its rooms are born private and stay so, whatever it asks', async () => {
        const altro = await utente();
        const aula = await creaAula(io(), 'PUBBLICO');
        const modificata = await chiedi(`/aule-studio/${aula.id}`, {
          method: 'PATCH',
          headers: comeUtente(io()),
          payload: { visibilita: 'PUBBLICO' },
        });
        const ingresso = await chiedi(`/aule-studio/${aula.id}/ingresso`, {
          method: 'POST',
          headers: comeUtente(altro),
        });

        expect(aula.visibilita).toBe('PRIVATO');
        expect(modificata.json().data.visibilita).toBe('PRIVATO');
        expect(ingresso.statusCode).toBe(403);
      });

      it("cannot enter someone else's room", async () => {
        const altro = await utente();
        const aula = await creaAula(altro, 'PUBBLICO');

        const ingresso = await chiedi(`/aule-studio/${aula.id}/ingresso`, {
          method: 'POST',
          headers: comeUtente(io()),
        });

        expect(ingresso.statusCode).toBe(403);
        expect(ingresso.json().errorCode).toBe('AS024');
      });

      it("cannot accept an invitation to someone else's room", async () => {
        const altro = await utente();
        const aula = await creaAula(altro);
        const invito = await invita(altro, 'aule-studio', aula.id, indirizzo);

        const accettazione = await chiedi(`/inviti/${invito.json().data.id}/accettazione`, {
          method: 'POST',
          headers: comeUtente(io()),
        });

        expect(accettazione.statusCode).toBe(403);
        expect(accettazione.json().errorCode).toBe('AS025');
      });

      it('its room invitations are written but never delivered', async () => {
        const destinatario = nuovoIndirizzo();
        const aula = await creaAula(io());

        const invito = await invita(io(), 'aule-studio', aula.id, destinatario);

        expect(invito.statusCode).toBe(201);
        expect(email.ultimoInvitoPer(destinatario)).toBeUndefined();
      });
    });

    describe('gruppi', () => {
      it('its groups are born private and stay so, whatever it asks', async () => {
        const gruppo = await creaGruppo(io(), 'PUBBLICO');
        const modificato = await chiedi(`/gruppi/${gruppo.id}`, {
          method: 'PATCH',
          headers: comeUtente(io()),
          payload: { visibilita: 'PUBBLICO' },
        });

        expect(gruppo.visibilita).toBe('PRIVATO');
        expect(modificato.json().data.visibilita).toBe('PRIVATO');
      });

      it("cannot accept an invitation to someone else's group", async () => {
        const altro = await utente();
        const gruppo = await creaGruppo(altro, 'PUBBLICO');
        const invito = await invita(altro, 'gruppi', gruppo.id, indirizzo);

        const accettazione = await chiedi(`/inviti-gruppo/${invito.json().data.id}/accettazione`, {
          method: 'POST',
          headers: comeUtente(io()),
        });

        expect(accettazione.statusCode).toBe(403);
        expect(accettazione.json().errorCode).toBe('GR012');
      });

      it('its group invitations are written but never delivered', async () => {
        const destinatario = nuovoIndirizzo();
        const gruppo = await creaGruppo(io());

        const invito = await invita(io(), 'gruppi', gruppo.id, destinatario);

        expect(invito.statusCode).toBe(201);
        expect(email.ultimoInvitoAlGruppoPer(destinatario)).toBeUndefined();
      });
    });
  });
});
