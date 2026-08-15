import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { TENTATIVI_CONSENTITI } from '../src/infrastruttura/accesso/better-auth';

/**
 * Il percorso di ingresso, provato per intero contro un database vero.
 *
 * L'accesso è un'area a difetti invisibili — un errore qui non si vede finché
 * non entra qualcuno che non doveva — quindi i percorsi infelici contano
 * quanto quello felice: codice sbagliato, codice scaduto, troppi tentativi,
 * richiesta senza sessione. Sono i quattro modi in cui questo endpoint può
 * sbagliare, e ciascuno deve produrre un errore spiegato, non un 500 muto.
 *
 * Serve un Postgres raggiungibile: `pnpm db:up` prima di `pnpm test`.
 */
describe('Accesso e profilo (E0.2 + E0.4)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;

  /** Indirizzo diverso a ogni test: nessun test eredita lo stato di un altro. */
  let contatore = 0;
  const nuovoIndirizzo = () => `prova-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

  type Richiesta = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
  };

  /**
   * Ogni richiesta dichiara la lingua, come fanno i client veri. Senza, l'API
   * ripiega sull'inglese: giusto, ma renderebbe il test una verifica del
   * ripiego invece che della traduzione.
   */
  const chiedi = (percorso: string, opzioni: Richiesta = {}) =>
    app.inject({
      url: percorso,
      method: 'GET',
      ...opzioni,
      headers: { 'x-lang': 'it', ...opzioni.headers },
    });

  /** Chiede il codice e lo legge dal canale di sviluppo, come farebbe la posta. */
  async function codicePer(indirizzo: string): Promise<string> {
    const risposta = await chiedi('/accesso/codice', {
      method: 'POST',
      payload: { email: indirizzo },
    });
    expect(risposta.statusCode).toBe(200);
    const codice = email.ultimoCodicePer(indirizzo);
    expect(codice).toBeDefined();
    return codice!;
  }

  /** Percorso completo fino alla sessione. */
  async function entra(indirizzo: string): Promise<{ token: string; onboardingCompletato: boolean }> {
    const codice = await codicePer(indirizzo);
    const risposta = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice },
    });
    expect(risposta.statusCode).toBe(200);
    return risposta.json().data;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('richiesta del codice', () => {
    it('manda un codice e dice quando scade', async () => {
      const indirizzo = nuovoIndirizzo();
      const risposta = await chiedi('/accesso/codice', {
        method: 'POST',
        payload: { email: indirizzo },
      });

      expect(risposta.statusCode).toBe(200);
      const corpo = risposta.json();
      expect(corpo.meta.message).toBe('Ti abbiamo mandato un codice via email');
      expect(new Date(corpo.data.scadeIl).getTime()).toBeGreaterThan(Date.now());
      expect(email.ultimoCodicePer(indirizzo)).toMatch(/^\d{6}$/);
    });

    it('non rivela se l\'indirizzo è già iscritto', async () => {
      const conosciuto = nuovoIndirizzo();
      await entra(conosciuto);

      const primaVolta = await chiedi('/accesso/codice', {
        method: 'POST',
        payload: { email: nuovoIndirizzo() },
      });
      const giaIscritto = await chiedi('/accesso/codice', {
        method: 'POST',
        payload: { email: conosciuto },
      });

      // Stesso stato e stesso messaggio: da fuori i due casi sono
      // indistinguibili, altrimenti l'endpoint direbbe chi è su Prome.
      expect(primaVolta.statusCode).toBe(giaIscritto.statusCode);
      expect(primaVolta.json().meta.message).toBe(giaIscritto.json().meta.message);
    });

    it('rifiuta un indirizzo non valido con l\'errore di validazione tradotto', async () => {
      const risposta = await chiedi('/accesso/codice', {
        method: 'POST',
        payload: { email: 'non-è-un-indirizzo' },
      });

      expect(risposta.statusCode).toBe(400);
      const corpo = risposta.json();
      expect(corpo.errorCode).toBe('V001');
      expect(corpo.details[0].field).toBe('email');
      expect(corpo.errorId).toBeDefined();
    });

    it('tratta l\'indirizzo senza distinguere maiuscole e spazi', async () => {
      const indirizzo = nuovoIndirizzo();
      await chiedi('/accesso/codice', {
        method: 'POST',
        payload: { email: `  ${indirizzo.toUpperCase()}  ` },
      });
      expect(email.ultimoCodicePer(indirizzo)).toBeDefined();
    });
  });

  describe('verifica del codice', () => {
    it('al primo ingresso crea account, profilo e impostazioni di privacy chiuse', async () => {
      const indirizzo = nuovoIndirizzo();
      const sessione = await entra(indirizzo);

      expect(sessione.token).toBeTruthy();
      // Chi entra per la prima volta non ha ancora un profilo compilato: il
      // client deve portarlo all'onboarding, e lo sa da qui.
      expect(sessione.onboardingCompletato).toBe(false);

      const profilo = await chiedi('/profilo/me', {
        headers: { authorization: `Bearer ${sessione.token}` },
      });
      const dati = profilo.json().data;
      expect(dati.nome).toBeNull();
      expect(dati.onboardingCompletato).toBe(false);
      // Default restrittivo: chi non ha ancora scelto non espone niente.
      expect(dati.impostazioniPrivacy).toEqual({
        contattabilita: 'PRIVATO',
        visibilita: 'PRIVATO',
      });
    });

    it('al secondo ingresso non duplica il profilo', async () => {
      const indirizzo = nuovoIndirizzo();
      const prima = await entra(indirizzo);
      const dopo = await entra(indirizzo);

      const profiloPrima = await chiedi('/profilo/me', {
        headers: { authorization: `Bearer ${prima.token}` },
      });
      const profiloDopo = await chiedi('/profilo/me', {
        headers: { authorization: `Bearer ${dopo.token}` },
      });

      expect(profiloDopo.json().data.utenteId).toBe(profiloPrima.json().data.utenteId);
    });

    it('rifiuta un codice sbagliato con PR003 e messaggio tradotto', async () => {
      const indirizzo = nuovoIndirizzo();
      await codicePer(indirizzo);

      const risposta = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: indirizzo, codice: '000000' },
      });

      expect(risposta.statusCode).toBe(401);
      const corpo = risposta.json();
      expect(corpo.errorCode).toBe('PR003');
      expect(corpo.message).toBe('Codice non valido. Controlla le cifre e riprova.');
      expect(corpo.errorId).toBeDefined();
    });

    it('rifiuta un codice scaduto con PR004', async () => {
      const indirizzo = nuovoIndirizzo();
      const codice = await codicePer(indirizzo);

      // Si sposta indietro la scadenza invece di aspettare dieci minuti: il
      // comportamento provato è lo stesso, il tempo di esecuzione no.
      await prisma.verification.updateMany({
        where: { identifier: { contains: indirizzo } },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const risposta = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: indirizzo, codice },
      });

      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR004');
      expect(risposta.json().message).toBe('Il codice è scaduto. Chiedine uno nuovo.');
    });

    it('brucia il codice dopo troppi tentativi sbagliati (PR005)', async () => {
      const indirizzo = nuovoIndirizzo();
      const codice = await codicePer(indirizzo);

      const sbaglia = () =>
        chiedi('/accesso/verifica', {
          method: 'POST',
          payload: { email: indirizzo, codice: '000000' },
        });

      // Finché i tentativi restano, la risposta è "codice sbagliato".
      for (let tentativo = 0; tentativo < TENTATIVI_CONSENTITI; tentativo += 1) {
        const risposta = await sbaglia();
        expect(risposta.statusCode).toBe(401);
        expect(risposta.json().errorCode).toBe('PR003');
      }

      // Il tentativo di troppo cambia risposta: non è più "hai sbagliato", è
      // "hai finito", ed è un 429 perché il limite è di frequenza.
      const oltre = await sbaglia();
      expect(oltre.statusCode).toBe(429);
      expect(oltre.json().errorCode).toBe('PR005');
      expect(oltre.json().message).toBe(
        'Troppi tentativi con questo codice. Chiedine uno nuovo.',
      );

      // E il codice è bruciato davvero: quello GIUSTO non apre più niente.
      // Senza questa riga il test proverebbe solo che il messaggio cambia.
      const conIlCodiceGiusto = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: indirizzo, codice },
      });
      expect(conIlCodiceGiusto.statusCode).toBe(401);
      expect(conIlCodiceGiusto.json().data).toBeUndefined();
    });

    it('rifiuta un codice di forma sbagliata prima di consumarlo', async () => {
      const indirizzo = nuovoIndirizzo();
      await codicePer(indirizzo);

      const risposta = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: indirizzo, codice: '12ab34' },
      });

      expect(risposta.statusCode).toBe(400);
      expect(risposta.json().errorCode).toBe('V001');
      // Il codice vero è ancora buono: una richiesta malformata non deve
      // costare un tentativo a chi ha solo incollato male.
      const codice = email.ultimoCodicePer(indirizzo)!;
      const dopo = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: indirizzo, codice },
      });
      expect(dopo.statusCode).toBe(200);
    });
  });

  describe('quando il canale email non risponde', () => {
    it('lo dice, invece di promettere un codice che non partirà (PR007)', async () => {
      // È la degradazione dichiarata del fornitore email, e va provata: senza
      // questo test l'unica prova che il guasto sia visibile è la lettura del
      // codice — e finché l'invio è stato un lavoro di sfondo del fornitore,
      // quella lettura diceva il falso.
      const guasto = jest
        .spyOn(email, 'inviaCodiceAccesso')
        .mockRejectedValue(new Error('SMTP irraggiungibile'));

      let risposta;
      try {
        risposta = await chiedi('/accesso/codice', {
          method: 'POST',
          payload: { email: nuovoIndirizzo() },
        });
      } finally {
        guasto.mockRestore();
      }

      expect(risposta.statusCode).toBe(503);
      expect(risposta.json().errorCode).toBe('PR007');
      expect(risposta.json().message).toBe(
        'Non siamo riusciti a mandare il codice. Riprova fra poco.',
      );
      // Il dettaglio tecnico resta nei log: all'utente arriva una frase che
      // dice cosa fare, mai il messaggio del fornitore.
      expect(JSON.stringify(risposta.json())).not.toContain('SMTP');
    });

    it('e non lascia credere che un codice sia arrivato', async () => {
      const indirizzo = nuovoIndirizzo();
      const guasto = jest
        .spyOn(email, 'inviaCodiceAccesso')
        .mockRejectedValue(new Error('SMTP irraggiungibile'));
      try {
        await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
      } finally {
        guasto.mockRestore();
      }

      // Il codice esiste nel database — è generato prima dell'invio — ma
      // nessuno lo conosce, perché non è mai uscito. Chi riprova ne riceve uno
      // nuovo, e quello vecchio scade da sé.
      expect(email.ultimoCodicePer(indirizzo)).toBeUndefined();
    });
  });

  describe('sessione', () => {
    it('nega il profilo senza sessione, con PR006', async () => {
      const risposta = await chiedi('/profilo/me');

      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR006');
      expect(risposta.json().message).toBe('Devi accedere per continuare');
    });

    it('nega il profilo con un token inventato', async () => {
      const risposta = await chiedi('/profilo/me', {
        headers: { authorization: 'Bearer token-che-non-esiste' },
      });
      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR006');
    });

    it('dopo l\'uscita il token non vale più', async () => {
      const sessione = await entra(nuovoIndirizzo());
      const intestazioni = { authorization: `Bearer ${sessione.token}` };

      const uscita = await chiedi('/accesso/esci', { method: 'POST', headers: intestazioni });
      expect(uscita.statusCode).toBe(200);
      expect(uscita.json().data).toBeNull();

      const dopo = await chiedi('/profilo/me', { headers: intestazioni });
      expect(dopo.statusCode).toBe(401);
    });

    it('traduce i messaggi nella lingua della richiesta', async () => {
      const risposta = await chiedi('/profilo/me', { headers: { 'x-lang': 'en' } });
      expect(risposta.json().message).toBe('You need to sign in to continue');
    });
  });

  describe('onboarding del profilo', () => {
    it('completa il profilo con i quattro dati e lo dichiara completo', async () => {
      const sessione = await entra(nuovoIndirizzo());
      const intestazioni = { authorization: `Bearer ${sessione.token}` };

      const risposta = await chiedi('/profilo/me', {
        method: 'PUT',
        headers: intestazioni,
        payload: {
          nome: '  Marta ',
          cognome: 'Rossi',
          universita: 'Università di Bologna',
          corso: 'Ingegneria informatica',
        },
      });

      expect(risposta.statusCode).toBe(200);
      const dati = risposta.json().data;
      expect(risposta.json().meta.message).toBe('Profilo completato');
      expect(dati.nome).toBe('Marta');
      expect(dati.onboardingCompletato).toBe(true);
    });

    it('rifiuta un onboarding parziale: i quattro dati sono uno solo', async () => {
      const sessione = await entra(nuovoIndirizzo());

      const risposta = await chiedi('/profilo/me', {
        method: 'PUT',
        headers: { authorization: `Bearer ${sessione.token}` },
        payload: { nome: 'Marta', cognome: 'Rossi' },
      });

      expect(risposta.statusCode).toBe(400);
      const campi = risposta.json().details.map((d: { field: string }) => d.field);
      expect(campi).toEqual(expect.arrayContaining(['universita', 'corso']));
    });

    it('rifiuta campi non previsti invece di ignorarli', async () => {
      const sessione = await entra(nuovoIndirizzo());

      const risposta = await chiedi('/profilo/me', {
        method: 'PUT',
        headers: { authorization: `Bearer ${sessione.token}` },
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita: 'Università di Bologna',
          corso: 'Ingegneria informatica',
          // Chi prova a scriversi onboarding completato da sé deve sentirsi
          // dire di no, non essere ignorato in silenzio.
          onboardingCompletato: true,
        },
      });

      expect(risposta.statusCode).toBe(400);
      expect(risposta.json().errorCode).toBe('V001');
    });

    it('al rientro l\'onboarding risulta già fatto', async () => {
      const indirizzo = nuovoIndirizzo();
      const prima = await entra(indirizzo);
      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: { authorization: `Bearer ${prima.token}` },
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita: 'Università di Bologna',
          corso: 'Ingegneria informatica',
        },
      });

      const dopo = await entra(indirizzo);
      expect(dopo.onboardingCompletato).toBe(true);
    });
  });
});
