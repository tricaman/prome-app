import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * «Scrivici» — la richiesta di aiuto, scritta prima del codice.
 *
 * Qui il difetto invisibile è uno solo e vale la suite intera: **una richiesta
 * che non arriva a nessuno sembra funzionare**. La schermata ringrazia, la
 * persona aspetta, e non esiste una riga da cui accorgersene — perché la
 * decisione è proprio quella di non conservarne nessuna. Se l'email non parte,
 * l'unico modo di saperlo è che l'endpoint lo dica a chi ha scritto.
 *
 * Le altre due cose che si provano sono confini dichiarati: l'elenco chiuso
 * delle categorie (a testo libero la coda smette di essere smistabile) e il
 * fatto che serva una sessione, perché questo non è il modulo di contatto
 * pubblico — quello sta sul sito.
 */
describe('Supporto', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;

  let contatore = 0;
  const nuovoIndirizzo = () => `supporto-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  async function utente(): Promise<{ token: string; utenteId: string }> {
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

  it('la richiesta arriva al supporto con categoria, testo e chi scrive', async () => {
    const marta = await utente();

    const risposta = await chiedi('/supporto', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: {
        categoria: 'BUG',
        testo: 'La chat non si aggiorna quando torno nell’app.',
        contesto: 'Prome 1.0.0 · ios 26.3',
      },
    });

    expect(risposta.statusCode).toBe(201);

    const arrivate = email.richiesteDiSupportoDi(marta.utenteId);
    expect(arrivate).toHaveLength(1);
    expect(arrivate[0]).toMatchObject({
      categoria: 'BUG',
      testo: 'La chat non si aggiorna quando torno nell’app.',
      contesto: 'Prome 1.0.0 · ios 26.3',
    });
  });

  it('l’indirizzo per la risposta viaggia solo se lo si è indicato', async () => {
    const marta = await utente();

    await chiedi('/supporto', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: { categoria: 'DOMANDA', testo: 'Come si esce da un gruppo?' },
    });

    expect(email.richiesteDiSupportoDi(marta.utenteId)[0]?.contatto).toBeUndefined();

    await chiedi('/supporto', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: {
        categoria: 'DOMANDA',
        testo: 'Rispondetemi qui.',
        contatto: 'altra@example.com',
      },
    });

    expect(email.richiesteDiSupportoDi(marta.utenteId)[1]?.contatto).toBe('altra@example.com');
  });

  it('la categoria viene da un elenco chiuso, e il testo non può essere vuoto', async () => {
    const marta = await utente();

    const categoriaInventata = await chiedi('/supporto', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: { categoria: 'LAMENTELA', testo: 'Qualcosa' },
    });
    // 400 con dettagli campo per campo: è la pipe globale (V001), la stessa
    // di ogni altro ingresso.
    expect(categoriaInventata.statusCode).toBe(400);

    const testoVuoto = await chiedi('/supporto', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: { categoria: 'ALTRO', testo: '   ' },
    });
    expect(testoVuoto.statusCode).toBe(400);

    // Niente è partito: nessuna delle due è arrivata al supporto.
    expect(email.richiesteDiSupportoDi(marta.utenteId)).toHaveLength(0);
  });

  it('senza sessione non si scrive al supporto', async () => {
    const risposta = await chiedi('/supporto', {
      method: 'POST',
      payload: { categoria: 'ALTRO', testo: 'Ciao' },
    });

    expect(risposta.statusCode).toBe(401);
  });
});
