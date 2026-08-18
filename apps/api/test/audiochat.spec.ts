import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { PORTA_AUDIOCHAT } from '../src/infrastruttura/audiochat/audiochat';
import { AudiochatAssente } from '../src/infrastruttura/audiochat/audiochat-assente';
import { AudiochatLiveKit } from '../src/infrastruttura/audiochat/audiochat-livekit';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * L'audiochat dell'aula (E5.1).
 *
 * Due garanzie, e nessuna delle due si vede senza provarla.
 *
 * 1. **Si entra se e solo se si ha il Permesso di Parlare**, letto adesso e
 *    non da una copia presa all'ingresso: concederlo apre la porta, revocarlo
 *    la richiude al gesto successivo.
 * 2. **RE4**: con l'audio indisponibile l'aula resta operativa al 100% in
 *    tutto ciò che non è audio. La suite gira con `AUDIOCHAT=assente`, che è
 *    esattamente quella condizione — un test che passasse solo col fornitore
 *    acceso non direbbe nulla sul giorno in cui il nodo è giù.
 *
 * Il percorso felice completo non è provabile qui, perché richiede un nodo
 * vero: quello che si può provare è che il **lasciapassare sia coniato
 * stretto**, e lo fa l'ultimo blocco sull'adattatore in isolamento.
 */
describe("Audiochat dell'aula studio (E5.1)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let audiochat: AudiochatAssente;

  let contatore = 0;
  const nuovoIndirizzo = () => `audio-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  type Utente = { token: string; utenteId: string };

  async function utenteCompleto(): Promise<Utente> {
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
      payload: { nome: 'Marta', cognome: 'Rossi', corsoId: catalogo.corsoInformatica },
    });
    return { token, utenteId: profilo.json().data.utenteId as string };
  }

  async function aulaConDue() {
    const moderatore = await utenteCompleto();
    const tale = await utenteCompleto();
    const creazione = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(moderatore.token),
      payload: { titolo: 'Analisi 1 – giovedì', visibilita: 'PUBBLICO' },
    });
    const aulaId = creazione.json().data.id as string;
    await chiedi(`/aule-studio/${aulaId}/ingresso`, {
      method: 'POST',
      headers: comeUtente(tale.token),
    });
    return { moderatore, tale, aulaId };
  }

  const entraInAudio = (token: string, aulaId: string) =>
    chiedi(`/aule-studio/${aulaId}/audiochat/accesso`, {
      method: 'POST',
      headers: comeUtente(token),
    });

  const permessoParlare = (
    token: string,
    aulaId: string,
    utenteId: string,
    metodo: 'POST' | 'DELETE',
  ) =>
    chiedi(`/aule-studio/${aulaId}/partecipanti/${utenteId}/permessi/parlare`, {
      method: metodo,
      headers: comeUtente(token),
    });

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
    audiochat = app.get(PORTA_AUDIOCHAT);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('chi può entrare (AS4, AS5)', () => {
    it("chi è appena entrato in aula non può parlare: nasce senza permessi", async () => {
      const { tale, aulaId } = await aulaConDue();

      const risposta = await entraInAudio(tale.token, aulaId);

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('AS022');
    });

    it('il moderatore ha sempre il permesso di parlare, senza che gli venga concesso', async () => {
      const { moderatore, aulaId } = await aulaConDue();

      const risposta = await entraInAudio(moderatore.token, aulaId);

      // Non 403: il permesso c'è. Che poi il canale non si apra è un'altra
      // faccenda, ed è il blocco sulla degradazione qui sotto.
      expect(risposta.statusCode).not.toBe(403);
    });

    it('concedere il permesso apre la porta, revocarlo la richiude al gesto dopo', async () => {
      const { moderatore, tale, aulaId } = await aulaConDue();

      expect((await entraInAudio(tale.token, aulaId)).statusCode).toBe(403);

      await permessoParlare(moderatore.token, aulaId, tale.utenteId, 'POST');
      expect((await entraInAudio(tale.token, aulaId)).statusCode).not.toBe(403);

      // Il permesso si legge **adesso**, non da una copia presa all'ingresso.
      await permessoParlare(moderatore.token, aulaId, tale.utenteId, 'DELETE');
      const dopo = await entraInAudio(tale.token, aulaId);
      expect(dopo.statusCode).toBe(403);
      expect(dopo.json().errorCode).toBe('AS022');
    });

    it("chi non partecipa non entra, e non scopre nulla dell'aula", async () => {
      const { aulaId } = await aulaConDue();
      const estraneo = await utenteCompleto();

      const risposta = await entraInAudio(estraneo.token, aulaId);

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('AS005');
    });

    it("un'aula che non esiste risponde 404", async () => {
      const tale = await utenteCompleto();

      const risposta = await entraInAudio(tale.token, '00000000-0000-4000-8000-000000000000');

      expect(risposta.statusCode).toBe(404);
    });

    it('senza sessione non si entra', async () => {
      const { aulaId } = await aulaConDue();

      const risposta = await chiedi(`/aule-studio/${aulaId}/audiochat/accesso`, { method: 'POST' });

      expect(risposta.statusCode).toBe(401);
    });
  });

  describe('degradazione dichiarata (RE4)', () => {
    it("con l'audio indisponibile risponde 503, non 500: non è un guasto dell'aula", async () => {
      const { moderatore, aulaId } = await aulaConDue();

      const risposta = await entraInAudio(moderatore.token, aulaId);

      expect(risposta.statusCode).toBe(503);
      expect(risposta.json().errorCode).toBe('AS023');
      // Il messaggio dice cosa succede, non «errore interno».
      expect(risposta.json().message).toMatch(/resto dell'aula/i);
    });

    it("la porta è stata interrogata: il rifiuto viene dall'audio, non da un controllo saltato", async () => {
      const { moderatore, aulaId } = await aulaConDue();
      audiochat.azzera();

      await entraInAudio(moderatore.token, aulaId);

      expect(audiochat.richiesti()).toContainEqual({
        aulaStudioId: aulaId,
        utenteId: moderatore.utenteId,
      });
    });

    it("**tutto il resto dell'aula continua a funzionare al 100%**", async () => {
      const { moderatore, tale, aulaId } = await aulaConDue();

      // L'audio non c'è.
      expect((await entraInAudio(moderatore.token, aulaId)).statusCode).toBe(503);

      // La sala si apre.
      const sala = await chiedi(`/aule-studio/${aulaId}/sala`, { headers: comeUtente(tale.token) });
      expect(sala.statusCode).toBe(200);

      // Si scrive e si legge.
      await permessoParlare(moderatore.token, aulaId, tale.utenteId, 'POST');
      const messaggio = await chiedi(`/aule-studio/${aulaId}/messaggi`, {
        method: 'POST',
        headers: comeUtente(moderatore.token),
        payload: { testo: 'Cominciamo senza voce' },
      });
      expect(messaggio.statusCode).toBe(201);

      const cronologia = await chiedi(`/aule-studio/${aulaId}/messaggi?limit=50`, {
        headers: comeUtente(tale.token),
      });
      expect(cronologia.statusCode).toBe(200);
      expect(cronologia.json().data).toHaveLength(1);

      // E la moderazione dei permessi.
      const revoca = await permessoParlare(moderatore.token, aulaId, tale.utenteId, 'DELETE');
      expect(revoca.statusCode).toBeLessThan(300);
    });
  });

  describe('il lasciapassare, coniato stretto', () => {
    // L'adattatore vero si prova in isolamento: non si collega a niente, conia
    // un gettone firmato e si guarda cosa contiene. È l'unica parte del
    // percorso felice verificabile senza un nodo, ed è anche quella che conta
    // di più — un gettone troppo largo è una porta aperta.
    const rivendicazioni = (gettone: string) =>
      JSON.parse(Buffer.from(gettone.split('.')[1], 'base64url').toString());

    it('vale per quella stanza e per quella persona, e per nient altro', async () => {
      const accesso = await new AudiochatLiveKit().apriCanale({
        aulaStudioId: 'aula-x',
        utenteId: 'utente-y',
      });

      expect(accesso).not.toBeNull();
      const dentro = rivendicazioni(accesso!.lasciapassare);
      expect(dentro.sub).toBe('utente-y');
      expect(dentro.video.room).toBe('aula-studio:aula-x');
      expect(dentro.video.roomJoin).toBe(true);
      expect(dentro.video.canPublish).toBe(true);
      expect(dentro.video.canSubscribe).toBe(true);
    });

    it('non concede amministrazione né registrazione (A3: solo transito)', async () => {
      const accesso = await new AudiochatLiveKit().apriCanale({
        aulaStudioId: 'aula-x',
        utenteId: 'utente-y',
      });

      const dentro = rivendicazioni(accesso!.lasciapassare);
      expect(dentro.video.roomAdmin).toBeFalsy();
      expect(dentro.video.roomCreate).toBeFalsy();
      expect(dentro.video.roomList).toBeFalsy();
      expect(dentro.video.recorder).toBeFalsy();
    });

    it('scade, e la scadenza è dichiarata a chi lo riceve', async () => {
      const accesso = await new AudiochatLiveKit().apriCanale({
        aulaStudioId: 'aula-x',
        utenteId: 'utente-y',
      });

      const dentro = rivendicazioni(accesso!.lasciapassare);
      expect(dentro.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(new Date(accesso!.scadeIl).getTime()).toBeGreaterThan(Date.now());
      // Corto: se finisce in un log smette di valere quasi subito.
      expect(dentro.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(15 * 60 + 5);
    });

    it("due aule diverse non finiscono nella stessa stanza", async () => {
      const uno = await new AudiochatLiveKit().apriCanale({ aulaStudioId: 'a', utenteId: 'u' });
      const due = await new AudiochatLiveKit().apriCanale({ aulaStudioId: 'b', utenteId: 'u' });

      expect(rivendicazioni(uno!.lasciapassare).video.room).not.toBe(
        rivendicazioni(due!.lasciapassare).video.room,
      );
    });
  });
});
