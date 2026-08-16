import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { LUNGHEZZA_MASSIMA_MESSAGGIO } from '@prome/contracts';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { TRASPORTO_TEMPO_REALE } from '../src/infrastruttura/tempo-reale/trasporto';
import { TrasportoAssente } from '../src/infrastruttura/tempo-reale/trasporto-assente';
import {
  assicuraCatalogoDiProva,
  type CatalogoDiProva,
} from './catalogo';

/**
 * La chat dell'aula studio (E4).
 *
 * Due garanzie sopra tutte, ed entrambe si vedono solo se provate:
 *
 * 1. **il permesso di scrivere si legge fresco all'invio** (MA2), e revocarlo
 *    zittisce da quel momento senza cancellare ciò che è già stato detto —
 *    è un'ammissione, quindi il test viene prima del codice;
 * 2. **il messaggio è persistito prima e pubblicato dopo**: con il trasporto
 *    in tempo reale spento la conversazione continua a esistere e a essere
 *    leggibile. Il tempo reale è un'accelerazione, non il luogo dove i
 *    messaggi vivono.
 *
 * I test girano con il trasporto **assente**, che è anche la degradazione
 * dichiarata: se passassero solo col fornitore acceso, non direbbero nulla
 * sul giorno in cui il fornitore cade.
 */
describe('Chat dell\'aula studio (E4)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let trasporto: TrasportoAssente;

  let contatore = 0;
  const nuovoIndirizzo = () => `chat-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
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

  const scrivi = (token: string, aulaId: string, testo: string) =>
    chiedi(`/aule-studio/${aulaId}/messaggi`, {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo },
    });

  const leggi = (token: string, aulaId: string) =>
    chiedi(`/aule-studio/${aulaId}/messaggi?limit=50`, { headers: comeUtente(token) });

  const permesso = (
    token: string,
    aulaId: string,
    utenteId: string,
    quale: 'scrivere',
    metodo: 'POST' | 'DELETE',
  ) =>
    chiedi(`/aule-studio/${aulaId}/partecipanti/${utenteId}/permessi/${quale}`, {
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
    // Il catalogo è chiuso: senza, nessun onboarding arriva in fondo.
    catalogo = await assicuraCatalogoDiProva(prisma);
    email = app.get(CanaleEmailSviluppo);
    trasporto = app.get(TRASPORTO_TEMPO_REALE);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('scrivere in aula (MA1, MA2)', () => {
    it('il moderatore scrive e il messaggio compare nella cronologia', async () => {
      const { moderatore, aulaId } = await aulaConDue();

      const invio = await scrivi(moderatore.token, aulaId, '  Ci vediamo alle 21  ');

      expect(invio.statusCode).toBe(201);
      expect(invio.json().data.testo).toBe('Ci vediamo alle 21');
      expect(invio.json().data.autore.nome).toBe('Marta');

      const cronologia = await leggi(moderatore.token, aulaId);
      expect(cronologia.json().data).toHaveLength(1);
      expect(cronologia.json().meta.pagination.total).toBe(1);
    });

    it('chi è in sola lettura non scrive: è dentro, ma assiste', async () => {
      const { tale, aulaId } = await aulaConDue();

      // Chi entra è in sola lettura: nessun permesso, stato legittimo.
      const tentativo = await scrivi(tale.token, aulaId, 'Posso parlare?');

      expect(tentativo.statusCode).toBe(403);
      expect(tentativo.json().errorCode).toBe('AS018');
      expect(await prisma.messaggioDiChat.count({ where: { aulaStudioId: aulaId } })).toBe(0);
    });

    it('concesso il permesso scrive, revocato smette — ma ciò che ha detto resta (MA2)', async () => {
      const { moderatore, tale, aulaId } = await aulaConDue();
      await permesso(moderatore.token, aulaId, tale.utenteId, 'scrivere', 'POST');

      const primo = await scrivi(tale.token, aulaId, 'Arrivo fra dieci minuti');
      expect(primo.statusCode).toBe(201);

      await permesso(moderatore.token, aulaId, tale.utenteId, 'scrivere', 'DELETE');

      const dopo = await scrivi(tale.token, aulaId, 'E questo no');
      expect(dopo.statusCode).toBe(403);

      // Si governa il presente, non si riscrive il passato.
      const cronologia = await leggi(moderatore.token, aulaId);
      const testi = cronologia.json().data.map((m: { testo: string }) => m.testo);
      expect(testi).toContain('Arrivo fra dieci minuti');
      expect(testi).not.toContain('E questo no');
    });

    it('un estraneo non scrive e non legge nemmeno la cronologia', async () => {
      const { aulaId } = await aulaConDue();
      const estraneo = await utenteCompleto();

      expect((await scrivi(estraneo.token, aulaId, 'Ciao a tutti')).statusCode).toBe(403);
      // Non è partecipante: la conversazione non è cosa sua.
      expect((await leggi(estraneo.token, aulaId)).statusCode).toBe(403);
    });

    it('rifiuta un messaggio vuoto e uno oltre il limite (MA1)', async () => {
      const { moderatore, aulaId } = await aulaConDue();

      expect((await scrivi(moderatore.token, aulaId, '   ')).statusCode).toBe(400);
      expect(
        (await scrivi(moderatore.token, aulaId, 'a'.repeat(LUNGHEZZA_MASSIMA_MESSAGGIO + 1)))
          .statusCode,
      ).toBe(400);
    });

    it('il messaggio è immutabile: non esiste modo di cambiarlo', async () => {
      const { moderatore, aulaId } = await aulaConDue();
      const invio = await scrivi(moderatore.token, aulaId, 'Detto è detto');

      const tentativo = await chiedi(
        `/aule-studio/${aulaId}/messaggi/${invio.json().data.id}`,
        { method: 'PATCH', headers: comeUtente(moderatore.token), payload: { testo: 'Ripensato' } },
      );

      // Un messaggio è un fatto, non un documento: la strada non esiste.
      expect(tentativo.statusCode).toBe(404);
    });
  });

  describe('la cronologia', () => {
    it('si legge dal più vecchio: una conversazione ha un ordine', async () => {
      const { moderatore, aulaId } = await aulaConDue();
      for (const testo of ['primo', 'secondo', 'terzo']) {
        await scrivi(moderatore.token, aulaId, testo);
      }

      const cronologia = await leggi(moderatore.token, aulaId);
      expect(cronologia.json().data.map((m: { testo: string }) => m.testo)).toEqual([
        'primo',
        'secondo',
        'terzo',
      ]);
    });

    it('sopravvive a tutto: è nel database, non nel trasporto', async () => {
      const { moderatore, tale, aulaId } = await aulaConDue();
      await permesso(moderatore.token, aulaId, tale.utenteId, 'scrivere', 'POST');
      await scrivi(moderatore.token, aulaId, 'Prima parte');
      await scrivi(tale.token, aulaId, 'Seconda parte');

      // La rilettura è quella che farebbe un client dopo un refresh.
      const cronologia = await leggi(tale.token, aulaId);
      expect(cronologia.json().data).toHaveLength(2);
      expect(cronologia.json().data[1].autore.utenteId).toBe(tale.utenteId);
    });

    it('mostra «Utente rimosso» per chi non ha più un profilo', async () => {
      const { moderatore, aulaId } = await aulaConDue();
      await scrivi(moderatore.token, aulaId, 'Resto anche senza di lui');
      await prisma.messaggioDiChat.create({
        data: { aulaStudioId: aulaId, autoreId: 'anonimo-sparito', testo: 'Scritto da chi non c\'è più' },
      });

      const cronologia = await leggi(moderatore.token, aulaId);
      const orfano = cronologia
        .json()
        .data.find((m: { autore: { utenteId: string } }) => m.autore.utenteId === 'anonimo-sparito');
      expect(orfano.autore.nome).toBeNull();
      expect(orfano.autore.rimosso).toBe(true);
    });
  });

  describe('il trasporto in tempo reale', () => {
    it('il messaggio è persistito PRIMA e pubblicato DOPO', async () => {
      const { moderatore, aulaId } = await aulaConDue();
      trasporto.azzera();

      const invio = await scrivi(moderatore.token, aulaId, 'Guardate qui');

      const pubblicati = trasporto.pubblicati();
      expect(pubblicati).toHaveLength(1);
      expect(pubblicati[0]!.stanza).toBe(`aula-studio:${aulaId}`);
      expect(pubblicati[0]!.evento).toBe('messaggio');
      // Ciò che viaggia è il messaggio già accettato, con il suo
      // identificativo: è quello che permette al client di deduplicare se
      // gli arriva due volte.
      expect((pubblicati[0]!.dato as { id: string }).id).toBe(invio.json().data.id);
    });

    it('se il trasporto fallisce il messaggio resta comunque scritto', async () => {
      const { moderatore, aulaId } = await aulaConDue();
      const rotto = jest
        .spyOn(trasporto, 'pubblicaInStanza')
        .mockRejectedValue(new Error('trasporto giù'));

      let invio;
      try {
        invio = await scrivi(moderatore.token, aulaId, 'Passa lo stesso');
      } finally {
        rotto.mockRestore();
      }

      // La sopravvivenza della cronologia non dipende dalla disponibilità del
      // fornitore di trasporto: chi riapre l'aula lo trova.
      expect(invio!.statusCode).toBe(201);
      const cronologia = await leggi(moderatore.token, aulaId);
      expect(cronologia.json().data.map((m: { testo: string }) => m.testo)).toContain(
        'Passa lo stesso',
      );
    });
  });

  describe('la chat e la vita dell\'aula', () => {
    it('un\'aula con messaggi non si elimina con un gesto', async () => {
      const { moderatore, aulaId } = await aulaConDue();
      await scrivi(moderatore.token, aulaId, 'C\'è una conversazione qui');

      const eliminazione = await chiedi(`/aule-studio/${aulaId}`, {
        method: 'DELETE',
        headers: comeUtente(moderatore.token),
      });

      expect(eliminazione.statusCode).toBe(422);
      expect(eliminazione.json().errorCode).toBe('AS007');
    });
  });
});
