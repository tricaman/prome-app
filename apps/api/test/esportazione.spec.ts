import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { PrismaService } from '../src/database/prisma.service';
import { registraCorpiBinari } from '../src/config/fastify';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { RecapitoFattiDelGruppoService } from '../src/modules/gruppo/recapito-fatti.service';
import {
  assicuraCatalogoDiProva,
  NOME_ATENEO,
  type CatalogoDiProva,
} from './catalogo';

/**
 * «Scarica i tuoi dati» — la promessa scritta nella privacy policy.
 *
 * Scritti prima del codice, perché qui il difetto invisibile ha il segno
 * peggiore: un'esportazione che contenesse i dati di **qualcun altro** non
 * darebbe alcun sintomo a nessuno dei due — chi scarica non sa di aver
 * ricevuto troppo, e chi è stato esportato non lo sa affatto.
 *
 * Il secondo difetto invisibile è opposto e altrettanto silenzioso: una copia
 * **incompleta** che si dichiara completa. Per questo si verifica detentore
 * per detentore, con gli stessi detentori che la cancellazione deve svuotare.
 */
describe('Esportazione dei propri dati', () => {
  let app: NestFastifyApplication;
  let email: CanaleEmailSviluppo;
  let catalogo: CatalogoDiProva;
  let recapitoGruppo: RecapitoFattiDelGruppoService;

  let contatore = 0;
  const nuovoIndirizzo = () => `dati-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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
      payload: { nome, cognome: 'Rossi', corsoId: catalogo.corsoInformatica },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  const esporta = (token: string) => chiedi('/account/dati', { headers: comeUtente(token) });

  async function pubblicaPost(token: string, testo: string) {
    const risposta = await chiedi('/bacheca', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { testo },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    email = app.get(CanaleEmailSviluppo);
    recapitoGruppo = app.get(RecapitoFattiDelGruppoService);
    catalogo = await assicuraCatalogoDiProva(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('porta il profilo, l\'indirizzo e le impostazioni di privacy', async () => {
    const io = await utenteCompleto();

    const risposta = await esporta(io.token);

    expect(risposta.statusCode).toBe(200);
    const dati = risposta.json().data;
    expect(dati.account).toEqual({ utenteId: io.utenteId, email: io.indirizzo });
    expect(dati.profilo.nome).toBe('Marta');
    expect(dati.profilo.universita).toBe(NOME_ATENEO);
    // Il corso esce per esteso e non come identificativo: una copia dei propri
    // dati deve restare leggibile da sola, senza il catalogo accanto.
    expect(dati.profilo.corso).toEqual({
      nome: 'Ingegneria informatica',
      codiceCorso: 'PROVA-INF',
      classe: 'L-8 — Ingegneria dell\'informazione',
      durataAnni: 3,
    });
    expect(dati.profilo.impostazioniPrivacy).toEqual({
      contattabilita: 'PRIVATO',
      visibilita: 'PRIVATO',
    });
    expect(dati.generataIl).toBeTruthy();
  });

  it('porta i post e i commenti scritti', async () => {
    const io = await utenteCompleto();
    const post = await pubblicaPost(io.token, 'Qualcuno ha gli appunti di Analisi 2?');
    await chiedi(`/bacheca/${post.id}/commenti`, {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { testo: 'Li ho trovati, grazie.' },
    });

    const dati = (await esporta(io.token)).json().data;

    expect(dati.bacheca.post).toHaveLength(1);
    expect(dati.bacheca.post[0].testo).toBe('Qualcuno ha gli appunti di Analisi 2?');
    expect(dati.bacheca.commenti).toHaveLength(1);
    expect(dati.bacheca.commenti[0].testo).toBe('Li ho trovati, grazie.');
    expect(dati.bacheca.commenti[0].postId).toBe(post.id);
  });

  it('porta i gruppi, le aule e i messaggi di chat', async () => {
    const io = await utenteCompleto();
    const gruppo = await chiedi('/gruppi', {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { nome: 'Analisi 2 – gruppo di ripasso' },
    });
    const aula = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { titolo: 'Ripasso di giovedì' },
    });
    const aulaId = aula.json().data.id as string;
    await chiedi(`/aule-studio/${aulaId}/messaggi`, {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { testo: 'Comincio dagli integrali' },
    });

    const dati = (await esporta(io.token)).json().data;

    expect(dati.gruppi).toHaveLength(1);
    expect(dati.gruppi[0]).toMatchObject({
      id: gruppo.json().data.id,
      nome: 'Analisi 2 – gruppo di ripasso',
      moderatore: true,
    });
    expect(dati.auleStudio.partecipazioni).toHaveLength(1);
    expect(dati.auleStudio.partecipazioni[0]).toMatchObject({
      titolo: 'Ripasso di giovedì',
      moderatore: true,
    });
    expect(dati.auleStudio.messaggi).toHaveLength(1);
    expect(dati.auleStudio.messaggi[0].testo).toBe('Comincio dagli integrali');
  });

  it('NON porta i dati di nessun altro, nemmeno dagli spazi condivisi', async () => {
    const io = await utenteCompleto('Marta');
    const altro = await utenteCompleto('Giulia');

    // Un gruppo in comune, un'aula in comune, e messaggi di entrambi.
    const gruppo = await chiedi('/gruppi', {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { nome: 'Gruppo condiviso' },
    });
    const gruppoId = gruppo.json().data.id as string;
    const invito = await chiedi(`/gruppi/${gruppoId}/inviti`, {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { destinatario: altro.indirizzo },
    });
    await chiedi(`/inviti-gruppo/${invito.json().data.id}/accettazione`, {
      method: 'POST',
      headers: comeUtente(altro.token),
    });
    await recapitoGruppo.eseguiGiro();

    const aula = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { titolo: 'Aula condivisa', visibilita: 'PUBBLICO' },
    });
    const aulaId = aula.json().data.id as string;
    await chiedi(`/aule-studio/${aulaId}/ingresso`, {
      method: 'POST',
      headers: comeUtente(altro.token),
    });
    await chiedi(`/aule-studio/${aulaId}/messaggi`, {
      method: 'POST',
      headers: comeUtente(io.token),
      payload: { testo: 'Messaggio mio' },
    });

    const dati = (await esporta(altro.token)).json().data;
    const documento = JSON.stringify(dati);

    // Giulia esporta: c'è la sua appartenenza al gruppo e la sua
    // partecipazione all'aula — sono fatti che la riguardano — ma **non** i
    // messaggi di Marta, non il suo indirizzo, non il suo nome.
    expect(dati.gruppi.map((g: { id: string }) => g.id)).toContain(gruppoId);
    expect(dati.auleStudio.messaggi).toHaveLength(0);
    expect(documento).not.toContain('Messaggio mio');
    expect(documento).not.toContain(io.indirizzo);
    expect(documento).not.toContain(io.utenteId);
  });

  it('non contiene credenziali, token di sessione o codici', async () => {
    const io = await utenteCompleto();

    const risposta = await esporta(io.token);
    const documento = JSON.stringify(risposta.json().data).toLowerCase();

    // Il token della sessione con cui si sta chiedendo è il caso più facile
    // da lasciarsi scappare, ed è quello che non deve esserci.
    expect(documento).not.toContain(io.token.toLowerCase());
    for (const parola of ['token', 'sessione', 'password', 'codice', 'hash']) {
      expect(documento).not.toContain(`"${parola}"`);
    }
  });

  it('senza sessione non si esporta niente', async () => {
    const risposta = await chiedi('/account/dati');

    expect(risposta.statusCode).toBe(401);
    expect(risposta.json().errorCode).toBe('PR006');
  });

  it('funziona anche con l\'onboarding incompleto: i dati sono comunque suoi', async () => {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const token = verifica.json().data.token as string;

    const risposta = await esporta(token);

    expect(risposta.statusCode).toBe(200);
    expect(risposta.json().data.profilo.nome).toBeNull();
    expect(risposta.json().data.profilo.onboardingCompletato).toBe(false);
    expect(risposta.json().data.account.email).toBe(indirizzo);
  });
});
