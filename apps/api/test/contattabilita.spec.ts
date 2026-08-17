import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * «Chi può messaggiarmi» — la contattabilità, applicata dove non racconta
 * niente.
 *
 * L'impostazione esisteva da E6.1 e **non era applicata da nessuna regola**.
 * Applicarla agli inviti per indirizzo sarebbe stato un oracolo di esistenza:
 * chiunque, con il modulo d'invito, avrebbe potuto scoprire se una certa email
 * ha un account su Prome — e come quella persona si è impostata. Per questo
 * qui si prova **una cosa e il suo contrario**:
 *
 * - sull'invito **per utente** — che nasce dalla sala di un'aula che si sta già
 *   guardando, quindi verso una persona che si sa esistere — la regola decide
 *   davvero, nei tre livelli e sopra a tutto il blocco;
 * - sull'invito **per indirizzo** la regola **non** si applica, e il test lo
 *   sorveglia: è la riga che impedisce a qualcuno di «sistemare»
 *   l'incoerenza apparente e introdurre la fuga.
 *
 * Il flag `contattabile` nella sala è la stessa decisione, dichiarata prima
 * del gesto: il client spegne il pulsante invece di far scoprire il divieto
 * con un errore.
 */
describe('Contattabilità', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;

  let contatore = 0;
  const nuovoIndirizzo = () => `contatto-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  async function utente(
    nome: string,
    contattabilita?: 'PRIVATO' | 'ATENEO' | 'PUBBLICO',
    corsoId?: string,
  ): Promise<Utente> {
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
      payload: { nome, cognome: 'Rossi', corsoId: corsoId ?? catalogo.corsoInformatica },
    });
    if (contattabilita) {
      await chiedi('/profilo/me/privacy', {
        method: 'PUT',
        headers: comeUtente(token),
        payload: { contattabilita },
      });
    }
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  /** Un'aula pubblica: la sala si apre anche da fuori, ed è lì che si vedono le persone. */
  async function aulaPubblicaDi(chi: Utente): Promise<string> {
    const aula = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(chi.token),
      payload: { titolo: 'Aula aperta', visibilita: 'PUBBLICO' },
    });
    return aula.json().data.id as string;
  }

  const invitaPerUtente = (chi: Utente, aulaId: string, destinatarioId: string) =>
    chiedi(`/aule-studio/${aulaId}/inviti/utente`, {
      method: 'POST',
      headers: comeUtente(chi.token),
      payload: { utenteId: destinatarioId },
    });

  const contattabileNellaSala = async (chi: Utente, aulaId: string, chiGuardo: string) => {
    const sala = await chiedi(`/aule-studio/${aulaId}/sala`, { headers: comeUtente(chi.token) });
    const partecipanti = sala.json().data.partecipanti as Array<{
      utenteId: string;
      contattabile?: boolean;
    }>;
    return partecipanti.find((p) => p.utenteId === chiGuardo)?.contattabile;
  };

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('l’invito a una persona che si vede', () => {
    it('«Privato» rifiuta chi non condivide nessuno spazio', async () => {
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'PRIVATO');

      // Bruno sta in una sua aula pubblica: Anna lo vede senza esserci dentro.
      const aulaDiBruno = await aulaPubblicaDi(bruno);
      const aulaDiAnna = await aulaPubblicaDi(anna);

      expect(await contattabileNellaSala(anna, aulaDiBruno, bruno.utenteId)).toBe(false);

      const invito = await invitaPerUtente(anna, aulaDiAnna, bruno.utenteId);
      expect(invito.statusCode).toBe(403);
      expect(invito.json().errorCode).toBe('AS021');
    });

    it('«Pubblico» accetta chiunque sia iscritto a Prome', async () => {
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'PUBBLICO');

      const aulaDiBruno = await aulaPubblicaDi(bruno);
      const aulaDiAnna = await aulaPubblicaDi(anna);

      expect(await contattabileNellaSala(anna, aulaDiBruno, bruno.utenteId)).toBe(true);

      const invito = await invitaPerUtente(anna, aulaDiAnna, bruno.utenteId);
      expect(invito.statusCode).toBe(201);
    });

    it('«Ateneo» accetta chi studia nello stesso ateneo', async () => {
      // Stesso catalogo di prova: stesso corso, quindi stesso ateneo.
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'ATENEO');

      const aulaDiAnna = await aulaPubblicaDi(anna);
      const invito = await invitaPerUtente(anna, aulaDiAnna, bruno.utenteId);

      expect(invito.statusCode).toBe(201);
    });

    it('«Privato» accetta chi è già insieme: la sala condivisa È lo spazio', async () => {
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'PRIVATO');

      // Bruno entra nell'aula di Anna: da quel momento sono già insieme.
      const aulaDiAnna = await aulaPubblicaDi(anna);
      await chiedi(`/aule-studio/${aulaDiAnna}/ingresso`, {
        method: 'POST',
        headers: comeUtente(bruno.token),
      });

      expect(await contattabileNellaSala(anna, aulaDiAnna, bruno.utenteId)).toBe(true);

      // E un invito verso un'altra aula di Anna passa.
      const altraAula = await aulaPubblicaDi(anna);
      const invito = await invitaPerUtente(anna, altraAula, bruno.utenteId);
      expect(invito.statusCode).toBe(201);
    });

    it('il blocco vince su qualunque impostazione, anche «Pubblico»', async () => {
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'PUBBLICO');

      await chiedi(`/profilo/me/blocchi/${anna.utenteId}`, {
        method: 'PUT',
        headers: comeUtente(bruno.token),
      });

      const aulaDiAnna = await aulaPubblicaDi(anna);
      const invito = await invitaPerUtente(anna, aulaDiAnna, bruno.utenteId);

      expect(invito.statusCode).toBe(403);
      expect(invito.json().errorCode).toBe('AS021');
    });

    it('serve comunque moderare l’aula in cui si invita', async () => {
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'PUBBLICO');
      const carla = await utente('Carla', 'PUBBLICO');

      const aulaDiAnna = await aulaPubblicaDi(anna);
      await chiedi(`/aule-studio/${aulaDiAnna}/ingresso`, {
        method: 'POST',
        headers: comeUtente(bruno.token),
      });

      // Bruno è dentro ma non modera: non può invitare nessuno qui.
      const invito = await invitaPerUtente(bruno, aulaDiAnna, carla.utenteId);
      expect(invito.statusCode).toBe(403);
      expect(invito.json().errorCode).not.toBe('AS021');
    });
  });

  describe('l’invito per indirizzo non rivela niente', () => {
    it('parte anche verso chi ha «Privato» e non condivide nulla', async () => {
      const anna = await utente('Anna');
      const bruno = await utente('Bruno', 'PRIVATO');
      const aulaDiAnna = await aulaPubblicaDi(anna);

      const invito = await chiedi(`/aule-studio/${aulaDiAnna}/inviti`, {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { destinatario: bruno.indirizzo },
      });

      // **Questa riga è la protezione**: se un giorno qualcuno applicasse la
      // contattabilità anche qui, il modulo d'invito diventerebbe un modo per
      // sapere se un indirizzo è iscritto a Prome, e come si è impostato.
      expect(invito.statusCode).toBe(201);
    });

    it('e verso un indirizzo che non ha alcun account risponde allo stesso modo', async () => {
      const anna = await utente('Anna');
      const aulaDiAnna = await aulaPubblicaDi(anna);

      const invito = await chiedi(`/aule-studio/${aulaDiAnna}/inviti`, {
        method: 'POST',
        headers: comeUtente(anna.token),
        payload: { destinatario: `mai-vista-${Date.now()}@studenti.unibo.it` },
      });

      expect(invito.statusCode).toBe(201);
    });
  });
});
