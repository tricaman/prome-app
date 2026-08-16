import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DIMENSIONE_MASSIMA_ALLEGATO, LUNGHEZZA_MASSIMA_POST } from '@prome/contracts';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import {
  assicuraCatalogoDiProva,
  type CatalogoDiProva,
} from './catalogo';

/**
 * Post con allegato (E0.5), provato per intero contro un database vero.
 *
 * Il caricamento di file è un'area a difetti invisibili quanto l'accesso: un
 * errore qui non si vede finché qualcuno non scrive dove non doveva, o non
 * legge un file che non è suo. I percorsi infelici contano quindi quanto
 * quello felice — firma sbagliata, autorizzazione scaduta, chiave di un altro,
 * file mai arrivato, chiave riusata, limiti di testo e dimensione.
 */
describe('Bacheca — post con allegato (E0.5)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;

  let contatore = 0;
  const nuovoIndirizzo = () => `bacheca-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  /** Un utente entrato e con l'onboarding fatto: la condizione normale per pubblicare. */
  async function utenteCompleto(corsoId?: string): Promise<string> {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const token = verifica.json().data.token as string;

    await chiedi('/profilo/me', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        corsoId: corsoId ?? catalogo.corsoInformatica,
      },
    });
    return token;
  }

  /** Entra ma non compila il profilo: serve a provare B6. */
  async function utenteSenzaOnboarding(): Promise<string> {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    return verifica.json().data.token;
  }

  const comeUtente = (token: string) => ({ authorization: `Bearer ${token}` });

  /** Pre-autorizza e carica davvero i byte, come farebbe un client. */
  async function caricaFile(
    token: string,
    dati: { nome: string; tipo: string; contenuto: string },
  ): Promise<string> {
    const preautorizzazione = await chiedi('/bacheca/allegati/pre-autorizzazione', {
      method: 'POST',
      headers: comeUtente(token),
      payload: {
        nome: dati.nome,
        tipo: dati.tipo,
        dimensione: Buffer.byteLength(dati.contenuto),
      },
    });
    expect(preautorizzazione.statusCode).toBe(200);
    const { chiave, url } = preautorizzazione.json().data;

    const caricamento = await chiedi(percorsoDi(url), { method: 'PUT', payload: dati.contenuto });
    expect(caricamento.statusCode).toBe(200);
    return chiave;
  }

  /** Dall'URL assoluto della pre-autorizzazione al percorso da iniettare. */
  const percorsoDi = (url: string) => url.replace(/^https?:\/\/[^/]+/, '');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    // Il catalogo è chiuso: senza, nessun onboarding arriva in fondo.
    catalogo = await assicuraCatalogoDiProva(prisma);
    email = app.get(CanaleEmailSviluppo);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('pubblicare un post', () => {
    it('pubblica un post di solo testo', async () => {
      const token = await utenteCompleto();
      const risposta = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: '  Ho caricato gli esercizi di Analisi 2  ' },
      });

      expect(risposta.statusCode).toBe(201);
      const corpo = risposta.json();
      expect(corpo.meta.message).toBe('Post pubblicato');
      expect(corpo.data.testo).toBe('Ho caricato gli esercizi di Analisi 2');
      expect(corpo.data.autore.nome).toBe('Marta');
      expect(corpo.data.allegati).toEqual([]);
      // B5: il post non porta alcuna visibilità, e non deve comparire.
      expect(corpo.data).not.toHaveProperty('visibilita');
    });

    it('pubblica un post con allegato, e i byte non passano dagli endpoint di dominio', async () => {
      const token = await utenteCompleto();
      const chiave = await caricaFile(token, {
        nome: 'esercizi integrali.pdf',
        tipo: 'PDF',
        contenuto: '%PDF-1.7 finti byte',
      });

      const risposta = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Ecco gli esercizi', allegati: [chiave] },
      });

      expect(risposta.statusCode).toBe(201);
      const allegato = risposta.json().data.allegati[0];
      expect(allegato.nome).toBe('esercizi integrali.pdf');
      expect(allegato.tipo).toBe('PDF');
      expect(allegato.url).toContain(chiave);

      // Il file si rilegge da dove è stato scritto.
      const scaricato = await chiedi(percorsoDi(allegato.url));
      expect(scaricato.statusCode).toBe(200);
      expect(scaricato.body).toBe('%PDF-1.7 finti byte');
    });

    it('la chiave non contiene l\'identificativo dell\'utente', async () => {
      const token = await utenteCompleto();
      const profilo = await chiedi('/profilo/me', { headers: comeUtente(token) });
      const utenteId = profilo.json().data.utenteId;

      const chiave = await caricaFile(token, {
        nome: 'appunti.txt',
        tipo: 'TESTO',
        contenuto: 'appunti',
      });

      // Una chiave che contenesse chi ha caricato racconterebbe qualcosa
      // sull'utente a chiunque veda un indirizzo, e sopravvivrebbe alla
      // cancellazione dell'account.
      expect(chiave).not.toContain(utenteId);
      expect(chiave.startsWith('bacheca/allegato/')).toBe(true);
    });

    it('rifiuta chi non ha completato l\'onboarding (B6)', async () => {
      const token = await utenteSenzaOnboarding();
      const risposta = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Ciao a tutti' },
      });

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('PR002');
      expect(risposta.json().message).toBe("Completa l'onboarding per continuare");
    });

    it('rifiuta un post senza sessione', async () => {
      const risposta = await chiedi('/bacheca', { method: 'POST', payload: { testo: 'Ciao' } });
      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR006');
    });

    it('rifiuta un testo vuoto e uno oltre i 5.000 caratteri (B1)', async () => {
      const token = await utenteCompleto();

      const vuoto = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: '   ' },
      });
      expect(vuoto.statusCode).toBe(400);
      expect(vuoto.json().errorCode).toBe('V001');

      const lungo = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'a'.repeat(LUNGHEZZA_MASSIMA_POST + 1) },
      });
      expect(lungo.statusCode).toBe(400);
      expect(lungo.json().details[0].field).toBe('testo');
    });
  });

  describe('pre-autorizzazione del caricamento', () => {
    it('rifiuta un tipo non ammesso e una dimensione fuori limite (B3)', async () => {
      const token = await utenteCompleto();

      const tipo = await chiedi('/bacheca/allegati/pre-autorizzazione', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { nome: 'virus.exe', tipo: 'ESEGUIBILE', dimensione: 10 },
      });
      expect(tipo.statusCode).toBe(400);
      expect(tipo.json().details[0].field).toBe('tipo');

      // Rifiutato PRIMA di caricare: è il motivo per cui la dimensione si
      // dichiara invece di scoprirla alla fine.
      const troppoGrande = await chiedi('/bacheca/allegati/pre-autorizzazione', {
        method: 'POST',
        headers: comeUtente(token),
        payload: {
          nome: 'enorme.pdf',
          tipo: 'PDF',
          dimensione: DIMENSIONE_MASSIMA_ALLEGATO + 1,
        },
      });
      expect(troppoGrande.statusCode).toBe(400);

      const vuoto = await chiedi('/bacheca/allegati/pre-autorizzazione', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { nome: 'vuoto.pdf', tipo: 'PDF', dimensione: 0 },
      });
      expect(vuoto.statusCode).toBe(400);
    });

    it('non si carica senza firma valida, né dopo la scadenza', async () => {
      const token = await utenteCompleto();
      const preautorizzazione = await chiedi('/bacheca/allegati/pre-autorizzazione', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { nome: 'note.txt', tipo: 'TESTO', dimensione: 5 },
      });
      const url = percorsoDi(preautorizzazione.json().data.url);

      const senzaFirma = await chiedi(url.split('?')[0]!, { method: 'PUT', payload: 'byte' });
      expect(senzaFirma.statusCode).toBe(403);

      const firmaAltrui = await chiedi(url.replace(/firma=\w+/, 'firma=inventata'), {
        method: 'PUT',
        payload: 'byte',
      });
      expect(firmaAltrui.statusCode).toBe(403);

      // Scadenza nel passato: la firma non copre più quel momento.
      const scaduta = await chiedi(url.replace(/scadenza=\d+/, 'scadenza=1'), {
        method: 'PUT',
        payload: 'byte',
      });
      expect(scaduta.statusCode).toBe(403);
    });

    it('rifiuta byte oltre il limite anche se la dichiarazione era piccola', async () => {
      const token = await utenteCompleto();
      const preautorizzazione = await chiedi('/bacheca/allegati/pre-autorizzazione', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { nome: 'bugiardo.txt', tipo: 'TESTO', dimensione: 10 },
      });

      const risposta = await chiedi(percorsoDi(preautorizzazione.json().data.url), {
        method: 'PUT',
        payload: 'x'.repeat(DIMENSIONE_MASSIMA_ALLEGATO + 1),
      });
      expect(risposta.statusCode).toBe(413);
    });
  });

  describe('chiavi degli allegati', () => {
    it('rifiuta una chiave mai pre-autorizzata', async () => {
      const token = await utenteCompleto();
      const risposta = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Con un allegato inventato', allegati: ['bacheca/allegato/xxx/f.pdf'] },
      });

      expect(risposta.statusCode).toBe(422);
      expect(risposta.json().errorCode).toBe('BA006');
    });

    it('rifiuta la chiave di un altro utente', async () => {
      const primo = await utenteCompleto();
      const secondo = await utenteCompleto();
      const chiave = await caricaFile(primo, {
        nome: 'mio.txt',
        tipo: 'TESTO',
        contenuto: 'roba mia',
      });

      const risposta = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(secondo),
        payload: { testo: 'Provo a prendermelo', allegati: [chiave] },
      });

      expect(risposta.statusCode).toBe(422);
      expect(risposta.json().errorCode).toBe('BA006');
    });

    it('rifiuta una chiave pre-autorizzata ma mai caricata', async () => {
      const token = await utenteCompleto();
      const preautorizzazione = await chiedi('/bacheca/allegati/pre-autorizzazione', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { nome: 'mai-arrivato.pdf', tipo: 'PDF', dimensione: 100 },
      });

      const risposta = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Manca il file', allegati: [preautorizzazione.json().data.chiave] },
      });

      expect(risposta.statusCode).toBe(422);
      expect(risposta.json().errorCode).toBe('BA007');
    });

    it('non lascia usare due volte la stessa chiave', async () => {
      const token = await utenteCompleto();
      const chiave = await caricaFile(token, {
        nome: 'una-volta.txt',
        tipo: 'TESTO',
        contenuto: 'contenuto',
      });

      const primo = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Primo post', allegati: [chiave] },
      });
      expect(primo.statusCode).toBe(201);

      const secondo = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Secondo post con lo stesso file', allegati: [chiave] },
      });
      expect(secondo.statusCode).toBe(422);
      expect(secondo.json().errorCode).toBe('BA008');
    });
  });

  describe('B4 — nessun allegato senza post', () => {
    it('eliminando il post spariscono i suoi allegati, nella stessa scrittura', async () => {
      const token = await utenteCompleto();
      const chiave = await caricaFile(token, {
        nome: 'legato.txt',
        tipo: 'TESTO',
        contenuto: 'contenuto',
      });
      const post = await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(token),
        payload: { testo: 'Con allegato', allegati: [chiave] },
      });
      const postId = post.json().data.id;

      expect(await prisma.allegato.count({ where: { postId } })).toBe(1);
      await prisma.post.delete({ where: { id: postId } });
      // La cascata è l'unica dello schema, ed è qui che si vede a cosa serve.
      expect(await prisma.allegato.count({ where: { postId } })).toBe(0);
    });
  });

  describe('la bacheca in lettura', () => {
    it('mostra i propri post in ordine cronologico, dal più recente', async () => {
      const token = await utenteCompleto();
      for (const testo of ['primo', 'secondo', 'terzo']) {
        await chiedi('/bacheca', { method: 'POST', headers: comeUtente(token), payload: { testo } });
      }

      const risposta = await chiedi('/bacheca?limit=10', { headers: comeUtente(token) });
      expect(risposta.statusCode).toBe(200);
      // Solo i propri post: il feed condiviso può contenere anche contenuti
      // anonimizzati di altre suite (visibili a tutti per progetto, V5).
      const miei = risposta
        .json()
        .data.filter((p: { puoModificare: boolean }) => p.puoModificare)
        .map((p: { testo: string }) => p.testo);
      expect(miei.slice(0, 3)).toEqual(['terzo', 'secondo', 'primo']);
      expect(risposta.json().meta.pagination.limit).toBe(10);
    });

    it('con visibilità PRIVATO i post non si vedono da fuori', async () => {
      const autore = await utenteCompleto();
      const estraneo = await utenteCompleto();
      await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(autore),
        payload: { testo: 'Roba mia e basta' },
      });

      const bacheca = await chiedi('/bacheca?limit=50', { headers: comeUtente(estraneo) });
      const testi = bacheca.json().data.map((p: { testo: string }) => p.testo);
      expect(testi).not.toContain('Roba mia e basta');
    });

    it('con visibilità PUBBLICO li vede ogni iscritto — e la modifica vale subito', async () => {
      const autore = await utenteCompleto();
      const altro = await utenteCompleto();
      const profilo = await chiedi('/profilo/me', { headers: comeUtente(autore) });
      await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(autore),
        payload: { testo: 'Aperto a tutti gli iscritti' },
      });

      await prisma.impostazioniDiPrivacy.update({
        where: { utenteId: profilo.json().data.utenteId },
        data: { visibilita: 'PUBBLICO' },
      });

      // B5: la visibilità si risolve in lettura, quindi il cambio ha effetto
      // su ciò che è già stato pubblicato, senza riscrivere nulla.
      const bacheca = await chiedi('/bacheca?limit=50', { headers: comeUtente(altro) });
      const testi = bacheca.json().data.map((p: { testo: string }) => p.testo);
      expect(testi).toContain('Aperto a tutti gli iscritti');
    });

    it('con visibilità ATENEO li vede solo chi ha dichiarato la stessa università', async () => {
      const autore = await utenteCompleto();
      // Stesso ateneo, corso diverso: la regola guarda l'ateneo.
      const compagno = await utenteCompleto(catalogo.corsoLettere);
      const altrove = await utenteCompleto(catalogo.altroCorso);

      const profilo = await chiedi('/profilo/me', { headers: comeUtente(autore) });
      await chiedi('/bacheca', {
        method: 'POST',
        headers: comeUtente(autore),
        payload: { testo: 'Solo per chi studia nel mio ateneo' },
      });
      await prisma.impostazioniDiPrivacy.update({
        where: { utenteId: profilo.json().data.utenteId },
        data: { visibilita: 'ATENEO' },
      });

      const dentro = await chiedi('/bacheca?limit=50', { headers: comeUtente(compagno) });
      const fuori = await chiedi('/bacheca?limit=50', { headers: comeUtente(altrove) });

      expect(dentro.json().data.map((p: { testo: string }) => p.testo)).toContain(
        'Solo per chi studia nel mio ateneo',
      );
      expect(fuori.json().data.map((p: { testo: string }) => p.testo)).not.toContain(
        'Solo per chi studia nel mio ateneo',
      );
    });

    it('nega la bacheca senza sessione', async () => {
      const risposta = await chiedi('/bacheca');
      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR006');
    });
  });
});
