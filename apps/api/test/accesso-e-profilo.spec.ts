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

    it('la verifica di uno non cancella il codice scaduto di un altro', async () => {
      // Il caso di sopra è stato rosso a intermittenza per mesi, e la causa
      // era qui: il fornitore d'identità, a ogni lettura di una verifica,
      // cancellava TUTTE le righe scadute della tabella — per conto di
      // chiunque. La riga scaduta di una persona spariva mentre un'altra
      // verificava il proprio codice, e «scaduto» diventava indistinguibile
      // da «inesistente»: PR003 invece di PR004, cioè la risposta che non
      // dice cosa fare.
      //
      // Si prova sul comportamento e non sulla concorrenza: due identificativi,
      // uno scaduto e uno vivo, e la verifica del secondo non deve toccare il
      // primo. Un test che tentasse di riprodurre la corsa sarebbe a sua volta
      // a intermittenza.
      const scaduto = nuovoIndirizzo();
      await codicePer(scaduto);
      await prisma.verification.updateMany({
        where: { identifier: { contains: scaduto } },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const vivo = nuovoIndirizzo();
      const codiceVivo = await codicePer(vivo);
      const risposta = await chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: vivo, codice: codiceVivo },
      });
      expect(risposta.statusCode).toBe(200);

      expect(
        await prisma.verification.count({ where: { identifier: { contains: scaduto } } }),
      ).toBe(1);
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

    it("l'uscita chiude una sessione sola: le altre restano vive", async () => {
      // Due ingressi con lo stesso indirizzo: due dispositivi della stessa
      // persona. È la premessa del test che segue, e senza di essa «esci da
      // tutti» passerebbe anche se chiudesse solo la sessione corrente.
      const indirizzo = nuovoIndirizzo();
      const primo = await entra(indirizzo);
      const secondo = await entra(indirizzo);
      expect(primo.token).not.toBe(secondo.token);

      const uscita = await chiedi('/accesso/esci', {
        method: 'POST',
        headers: { authorization: `Bearer ${primo.token}` },
      });
      expect(uscita.statusCode).toBe(200);

      const altroDispositivo = await chiedi('/profilo/me', {
        headers: { authorization: `Bearer ${secondo.token}` },
      });
      expect(altroDispositivo.statusCode).toBe(200);
    });

    it("«esci da tutti» chiude ogni sessione, compresa quella che l'ha chiesto", async () => {
      const indirizzo = nuovoIndirizzo();
      const primo = await entra(indirizzo);
      const secondo = await entra(indirizzo);

      const uscita = await chiedi('/accesso/esci-da-tutti', {
        method: 'POST',
        headers: { authorization: `Bearer ${secondo.token}` },
      });
      expect(uscita.statusCode).toBe(200);
      expect(uscita.json().data).toBeNull();
      expect(uscita.json().meta.message).toBe('Sei uscito da Prome su tutti i dispositivi');

      // Compresa la propria: chi preme questo bottone sospetta che qualcuno sia
      // entrato, e lasciare viva la sessione da cui l'ha premuto sarebbe
      // esattamente il caso in cui il gesto non serve a niente.
      for (const token of [primo.token, secondo.token]) {
        const dopo = await chiedi('/profilo/me', { headers: { authorization: `Bearer ${token}` } });
        expect(dopo.statusCode).toBe(401);
        expect(dopo.json().errorCode).toBe('PR006');
      }
    });

    it('nega «esci da tutti» senza sessione, con PR006', async () => {
      const risposta = await chiedi('/accesso/esci-da-tutti', { method: 'POST' });
      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR006');
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

  /**
   * P3 — «i quattro dati restano modificabili ma mai svuotabili».
   *
   * La metà «modificabili» non era provata da nessuna parte, ed è quella che
   * conta di più per chi usa il prodotto: l'università non è un dato
   * anagrafico qualunque, decide chi vede i suoi contenuti e a quali aule è
   * ammesso. Un errore di battitura, senza questa strada, sarebbe definitivo.
   */
  describe('correggere il profilo (P3)', () => {
    async function profiloCompleto(universita = 'Università di Bologna') {
      const sessione = await entra(nuovoIndirizzo());
      const intestazioni = { authorization: `Bearer ${sessione.token}` };
      const risposta = await chiedi('/profilo/me', {
        method: 'PUT',
        headers: intestazioni,
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita,
          corso: 'Ingegneria informatica',
        },
      });
      return { intestazioni, utenteId: risposta.json().data.utenteId as string };
    }

    it('corregge i quattro dati, e l\'onboarding resta completato', async () => {
      const { intestazioni } = await profiloCompleto();

      const risposta = await chiedi('/profilo/me', {
        method: 'PUT',
        headers: intestazioni,
        payload: {
          nome: 'Marta',
          cognome: 'Rossini',
          universita: 'Politecnico di Milano',
          corso: 'Ingegneria gestionale',
        },
      });

      expect(risposta.statusCode).toBe(200);
      const dati = risposta.json().data;
      expect(dati.cognome).toBe('Rossini');
      expect(dati.universita).toBe('Politecnico di Milano');
      // P3 è a senso unico: da completato non si torna indietro, e correggere
      // non è tornare indietro.
      expect(dati.onboardingCompletato).toBe(true);
    });

    it('non lascia svuotare un campo: svuotarlo sarebbe tornare indietro', async () => {
      const { intestazioni } = await profiloCompleto();

      const risposta = await chiedi('/profilo/me', {
        method: 'PUT',
        headers: intestazioni,
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita: '   ',
          corso: 'Ingegneria informatica',
        },
      });

      expect(risposta.statusCode).toBe(400);
      const campi = risposta.json().details.map((d: { field: string }) => d.field);
      expect(campi).toContain('universita');
    });

    it('cambiare ateneo cambia SUBITO ciò che si vede, senza finestra (SE2)', async () => {
      // Un autore del Politecnico che mostra i contenuti al proprio ateneo.
      const autore = await profiloCompleto('Politecnico di Milano');
      await chiedi('/profilo/me/privacy', {
        method: 'PUT',
        headers: autore.intestazioni,
        payload: { visibilita: 'ATENEO' },
      });
      await chiedi('/bacheca', {
        method: 'POST',
        headers: autore.intestazioni,
        payload: { testo: 'Appunti di Fisica 2' },
      });

      // Un lettore di Bologna: non lo vede.
      const lettore = await profiloCompleto('Università di Bologna');
      const prima = await chiedi('/bacheca', { headers: lettore.intestazioni });
      expect(prima.json().data.map((p: { testo: string }) => p.testo)).not.toContain(
        'Appunti di Fisica 2',
      );

      // Si trasferisce, e alla lettura successiva lo vede. Nessun passaggio
      // intermedio, nessuna cache da svuotare.
      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: lettore.intestazioni,
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita: 'Politecnico di Milano',
          corso: 'Ingegneria informatica',
        },
      });

      const dopo = await chiedi('/bacheca', { headers: lettore.intestazioni });
      expect(dopo.json().data.map((p: { testo: string }) => p.testo)).toContain(
        'Appunti di Fisica 2',
      );
    });

    it('ma NON cambia l\'ateneo di un\'aula già creata, né fa uscire da dove si è già dentro', async () => {
      const { intestazioni, utenteId } = await profiloCompleto('Università di Bologna');
      const aula = await chiedi('/aule-studio', {
        method: 'POST',
        headers: intestazioni,
        payload: { titolo: 'Ripasso di Analisi', visibilita: 'ATENEO' },
      });
      const aulaId = aula.json().data.id as string;
      expect(aula.json().data.ateneo).toBe('Università di Bologna');

      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: intestazioni,
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita: 'Politecnico di Milano',
          corso: 'Ingegneria informatica',
        },
      });

      // AS7: l'ateneo dello spazio è congelato alla creazione. Uno spazio non
      // cambia pubblico perché chi l'ha aperto si è trasferito.
      const sala = await chiedi(`/aule-studio/${aulaId}/sala`, { headers: intestazioni });
      expect(sala.statusCode).toBe(200);
      expect(sala.json().data.aula.ateneo).toBe('Università di Bologna');
      // E chi era già dentro resta dentro: l'ammissione si interroga
      // all'ingresso, e la sola decadenza che insegue chi è dentro è quella
      // dell'appartenenza al gruppo (SE1).
      expect(
        sala.json().data.partecipanti.map((p: { utenteId: string }) => p.utenteId),
      ).toContain(utenteId);
    });
  });
});
