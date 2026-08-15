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
 * Notifiche (E8.1) — quando il prodotto interrompe qualcuno, e cosa dice.
 *
 * Scritti prima del codice, perché i difetti di quest'area sono invisibili in
 * tre modi diversi:
 *
 * - **un avviso che porta fuori un dato personale** non lo vede nessuno di
 *   noi: attraversa un fornitore, due sistemi operativi e la schermata di
 *   blocco di un telefono che in quel momento può essere in mano a chiunque;
 * - **un avviso che non arriva** non produce alcun sintomo, e chi lo aspettava
 *   pensa che non sia successo niente;
 * - **un avviso di troppo** — a sé stessi, o a chi l'ha disattivato — sembra
 *   un dettaglio finché non diventa la ragione per cui si disinstalla l'app.
 *
 * Il fornitore non c'è per scelta: si verifica quindi ciò che **sarebbe
 * partito**, che è esattamente la parte che il fornitore non decide.
 */
describe('Notifiche (E8)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;
  let notifiche: CanaleNotificheSenzaFornitore;
  let recapito: RecapitoFattiDellaBachecaService;

  let contatore = 0;
  const nuovoIndirizzo = () => `avvisi-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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
      payload: {
        nome,
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });
    // Contenuti visibili a tutti: qui si provano gli avvisi, non la privacy,
    // e da E6.2 completata commentare esige di vedere il post (chi nasce
    // PRIVATO non è visibile a nessuno, e il commento risponderebbe 404).
    await chiedi('/profilo/me/privacy', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: { visibilita: 'PUBBLICO' },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  /** Registra un dispositivo e ritorna il token con cui è stato registrato. */
  async function registraDispositivo(utente: Utente): Promise<string> {
    const token = `dispositivo-${utente.utenteId}`;
    const risposta = await chiedi('/notifiche/dispositivi', {
      method: 'POST',
      headers: comeUtente(utente.token),
      payload: { token, piattaforma: 'ANDROID' },
    });
    expect(risposta.statusCode).toBe(201);
    return token;
  }

  /**
   * Gli avvisi partiti per un certo post.
   *
   * Le suite girano in parallelo sullo stesso database e la corsia dei fatti
   * è una sola: contare *tutti* gli avvisi renderebbe questi casi sensibili a
   * ciò che sta facendo un'altra suite, ed è il modo tipico in cui una prova
   * su un'area a difetti invisibili diventa rumore che si impara a ignorare.
   */
  const avvisiPer = (postId: string) =>
    notifiche.ultimiAvvisi.filter((recapitato) => recapitato.avviso.percorso.includes(postId));

  async function pubblicaPost(utente: Utente, testo: string) {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(utente.token),
      payload: { testo },
    });
    return risposta.json().data as { id: string };
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

  beforeEach(() => notifiche.svuota());

  afterAll(async () => {
    await app.close();
  });

  describe('i dispositivi', () => {
    it('registra un dispositivo, e registrarlo due volte non lo sdoppia', async () => {
      const io = await utenteCompleto();

      await registraDispositivo(io);
      await registraDispositivo(io);

      expect(await prisma.dispositivoDiNotifica.count({ where: { utenteId: io.utenteId } })).toBe(1);
    });

    it('un dispositivo si toglie: chi esce da un telefono non ci riceve più niente', async () => {
      const io = await utenteCompleto();
      const token = await registraDispositivo(io);

      const risposta = await chiedi(`/notifiche/dispositivi/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: comeUtente(io.token),
      });

      expect(risposta.statusCode).toBe(200);
      expect(await prisma.dispositivoDiNotifica.count({ where: { utenteId: io.utenteId } })).toBe(0);
    });

    it('lo stesso token registrato da un altro account passa a lui', async () => {
      // È il caso vero di un telefono prestato, o di un account cambiato sullo
      // stesso apparecchio: il token è unico, e deve seguire chi è entrato per
      // ultimo — altrimenti gli avvisi del primo continuerebbero ad arrivare
      // a chi ora ha quel telefono in mano.
      const primo = await utenteCompleto();
      const secondo = await utenteCompleto();
      const token = 'dispositivo-condiviso';

      for (const utente of [primo, secondo]) {
        await chiedi('/notifiche/dispositivi', {
          method: 'POST',
          headers: comeUtente(utente.token),
          payload: { token, piattaforma: 'IOS' },
        });
      }

      const righe = await prisma.dispositivoDiNotifica.findMany({ where: { token } });
      expect(righe).toHaveLength(1);
      expect(righe[0]!.utenteId).toBe(secondo.utenteId);
    });

    it('senza sessione non si registra niente', async () => {
      const risposta = await chiedi('/notifiche/dispositivi', {
        method: 'POST',
        payload: { token: 'qualunque', piattaforma: 'ANDROID' },
      });

      expect(risposta.statusCode).toBe(401);
    });
  });

  describe('le preferenze', () => {
    it('nascono accese: un avviso che non arriva non espone nulla, ma fa sembrare morto il prodotto', async () => {
      const io = await utenteCompleto();

      const risposta = await chiedi('/notifiche/preferenze', { headers: comeUtente(io.token) });

      expect(risposta.statusCode).toBe(200);
      expect(risposta.json().data).toEqual({ commenti: true, inviti: true });
    });

    it('si spengono una per volta, e l\'altra resta com\'era', async () => {
      const io = await utenteCompleto();

      const risposta = await chiedi('/notifiche/preferenze', {
        method: 'PUT',
        headers: comeUtente(io.token),
        payload: { commenti: false },
      });

      expect(risposta.json().data).toEqual({ commenti: false, inviti: true });
    });
  });

  describe('quando arriva un avviso, e a chi', () => {
    it('chi commenta il mio post me lo fa sapere', async () => {
      const autore = await utenteCompleto('Marta');
      await registraDispositivo(autore);
      const post = await pubblicaPost(autore, 'Appunti di Analisi 2');

      const altro = await utenteCompleto('Giulia');
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(altro.token),
        payload: { testo: 'Grazie, mi servivano!' },
      });

      // L'avviso parte **fuori dal percorso della richiesta**: chi commenta
      // non aspetta un fornitore di notifiche per vedere il proprio commento.
      expect(avvisiPer(post.id)).toHaveLength(0);
      await recapito.eseguiGiro();

      expect(avvisiPer(post.id)).toHaveLength(1);
    });

    it('ma NON porta fuori il testo del commento né il nome di chi lo ha scritto', async () => {
      const autore = await utenteCompleto('Marta');
      await registraDispositivo(autore);
      const post = await pubblicaPost(autore, 'Appunti di Analisi 2');

      const altro = await utenteCompleto('Giulia');
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(altro.token),
        payload: { testo: 'Il mio numero è 3331234567' },
      });
      await recapito.eseguiGiro();

      // Un avviso finisce sulla schermata di blocco di un telefono che in quel
      // momento può essere in mano a chiunque: è il posto meno protetto in cui
      // un dato personale possa capitare.
      const partito = JSON.stringify(avvisiPer(post.id)[0]!.avviso);
      expect(partito).not.toContain('3331234567');
      expect(partito).not.toContain('Giulia');
      expect(partito).not.toContain(altro.indirizzo);
      expect(partito).not.toContain(altro.utenteId);
    });

    it('non avvisa me di me stesso', async () => {
      const io = await utenteCompleto();
      await registraDispositivo(io);
      const post = await pubblicaPost(io, 'Una domanda');

      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(io.token),
        payload: { testo: 'Rispondo da solo' },
      });
      await recapito.eseguiGiro();

      expect(avvisiPer(post.id)).toHaveLength(0);
    });

    it('non avvisa chi ha spento quel tipo di avviso', async () => {
      const autore = await utenteCompleto();
      await registraDispositivo(autore);
      await chiedi('/notifiche/preferenze', {
        method: 'PUT',
        headers: comeUtente(autore.token),
        payload: { commenti: false },
      });
      const post = await pubblicaPost(autore, 'Appunti');

      const altro = await utenteCompleto();
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(altro.token),
        payload: { testo: 'Ciao' },
      });
      await recapito.eseguiGiro();

      expect(avvisiPer(post.id)).toHaveLength(0);
    });

    it('non avvisa chi non ha registrato alcun dispositivo', async () => {
      const autore = await utenteCompleto();
      const post = await pubblicaPost(autore, 'Appunti');

      const altro = await utenteCompleto();
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(altro.token),
        payload: { testo: 'Ciao' },
      });
      await recapito.eseguiGiro();

      expect(avvisiPer(post.id)).toHaveLength(0);
    });

    it('lo stesso fatto consegnato due volte non produce due avvisi', async () => {
      const autore = await utenteCompleto();
      await registraDispositivo(autore);
      const post = await pubblicaPost(autore, 'Appunti');

      const altro = await utenteCompleto();
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(altro.token),
        payload: { testo: 'Ciao' },
      });
      // La corsia rapida gira ogni secondo: il giro successivo ritrova la
      // stessa tabella e non deve ritrovare quel fatto. Un avviso ripetuto è
      // la forma più fastidiosa di difetto, e qui la ripetizione non è resa
      // innocua da alcuna invariante — a differenza di un'ammissione doppia.
      await recapito.eseguiGiro();
      await recapito.eseguiGiro();

      expect(avvisiPer(post.id)).toHaveLength(1);
    });
  });

  describe("l'invito", () => {
    /** Crea un'aula e invita l'indirizzo indicato. */
    async function invita(chiInvita: Utente, destinatario: string): Promise<void> {
      const aula = await chiedi('/aule-studio', {
        method: 'POST',
        headers: comeUtente(chiInvita.token),
        payload: { titolo: 'Analisi I', visibilita: 'PRIVATO' },
      });
      const risposta = await chiedi(`/aule-studio/${aula.json().data.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(chiInvita.token),
        payload: { destinatario },
      });
      expect(risposta.statusCode).toBe(201);
    }

    it('avvisa chi è invitato, e il messaggio non nomina nessuno', async () => {
      const chiInvita = await utenteCompleto('Giulia');
      const invitato = await utenteCompleto('Marco');
      await registraDispositivo(invitato);

      await invita(chiInvita, invitato.indirizzo);

      expect(notifiche.ultimiAvvisi).toHaveLength(1);
      const partito = JSON.stringify(notifiche.ultimiAvvisi[0]!.avviso);
      // Chi invita ha un nome e un indirizzo: nessuno dei due esce di qui, e
      // nemmeno il titolo dell'aula — lo scrive una persona.
      expect(partito).not.toContain('Giulia');
      expect(partito).not.toContain(chiInvita.indirizzo);
      expect(partito).not.toContain(invitato.indirizzo);
      expect(partito).not.toContain('Analisi I');
    });

    it('un invito a un indirizzo senza account non avvisa nessuno e non fallisce', async () => {
      const chiInvita = await utenteCompleto();

      await invita(chiInvita, `mai-visto-${Date.now()}@studenti.unibo.it`);

      expect(notifiche.ultimiAvvisi).toHaveLength(0);
    });

    it('chi ha spento gli inviti non li riceve, ma i commenti continuano ad arrivargli', async () => {
      const chiInvita = await utenteCompleto();
      const invitato = await utenteCompleto();
      await registraDispositivo(invitato);
      await chiedi('/notifiche/preferenze', {
        method: 'PUT',
        headers: comeUtente(invitato.token),
        payload: { inviti: false },
      });

      await invita(chiInvita, invitato.indirizzo);
      expect(notifiche.ultimiAvvisi).toHaveLength(0);

      // L'altro asse è rimasto acceso: i due interruttori sono indipendenti.
      const post = await pubblicaPost(invitato, 'Qualcuno ha gli appunti?');
      await chiedi(`/bacheca/${post.id}/commenti`, {
        method: 'POST',
        headers: comeUtente(chiInvita.token),
        payload: { testo: 'Io!' },
      });
      await recapito.eseguiGiro();
      expect(notifiche.ultimiAvvisi).toHaveLength(1);
    });
  });

  describe('cancellazione dell\'account', () => {
    it('porta via dispositivi e preferenze', async () => {
      const io = await utenteCompleto();
      await registraDispositivo(io);

      await chiedi('/account/cancellazione', { method: 'POST', headers: comeUtente(io.token) });
      await prisma.richiestaDiCancellazione.update({
        where: { utenteId: io.utenteId },
        data: { eseguibileDal: new Date(Date.now() - 1000) },
      });
      await app.get(CancellazioneService).eseguiGiro();

      expect(await prisma.dispositivoDiNotifica.count({ where: { utenteId: io.utenteId } })).toBe(0);
      expect(await prisma.preferenzeDiNotifica.count({ where: { utenteId: io.utenteId } })).toBe(0);
    });
  });
});
