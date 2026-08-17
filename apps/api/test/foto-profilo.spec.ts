import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { ArchivioLocale } from '../src/infrastruttura/archivio-file/archivio-locale';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { ProfiloService } from '../src/modules/profilo/profilo.service';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * La foto del profilo — scritta prima del codice, perché qui i difetti
 * invisibili sono tre e nessuno produce un errore a schermo:
 *
 * - **adottare la chiave di un altro**: chi indovina un indirizzo si mette la
 *   foto di qualcun altro, e nessuno se ne accorge perché il profilo funziona;
 * - **confermare senza byte**: il profilo mostra un'immagine rotta, che è
 *   peggio delle iniziali — e sul server sembra tutto riuscito;
 * - **la foto che sopravvive all'account**: è il ritratto di una persona, e
 *   qui è l'opposto degli allegati dei post, che restano dietro un autore
 *   anonimizzato. Un file rimasto nell'archivio non lo nota nessuno, mai.
 */
describe('Foto del profilo', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let archivio: ArchivioLocale;
  let profili: ProfiloService;

  let contatore = 0;
  const nuovoIndirizzo = () => `foto-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  /** I tre tempi: dichiara, manda i byte all'archivio, conferma. */
  async function caricaFoto(token: string, contenuto = 'byte-di-una-foto'): Promise<string> {
    const preautorizzazione = await chiedi('/profilo/me/foto/pre-autorizzazione', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { nome: 'ritratto.jpg', dimensione: Buffer.byteLength(contenuto) },
    });
    const { chiave, url } = preautorizzazione.json().data;
    await chiedi(url.replace(/^https?:\/\/[^/]+/, ''), { method: 'PUT', payload: contenuto });
    return chiave as string;
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
    archivio = app.get(ArchivioLocale);
    profili = app.get(ProfiloService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('la foto si carica in tre tempi e compare sul profilo', async () => {
    const marta = await utente();

    // Prima: nessuna foto, e non è uno stato incompleto.
    const prima = await chiedi('/profilo/me', { headers: comeUtente(marta.token) });
    expect(prima.json().data.foto).toBeNull();

    const chiave = await caricaFoto(marta.token);
    const conferma = await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave },
    });

    expect(conferma.statusCode).toBe(200);
    expect(conferma.json().data.foto).toContain(chiave);

    // E si rilegge dal profilo, non solo dalla risposta della conferma.
    const dopo = await chiedi('/profilo/me', { headers: comeUtente(marta.token) });
    expect(dopo.json().data.foto).toContain(chiave);
  });

  it('non si adotta la chiave di un altro, nemmeno conoscendola', async () => {
    const marta = await utente();
    const bruno = await utente();

    const chiaveDiMarta = await caricaFoto(marta.token);

    const furto = await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(bruno.token),
      payload: { chiave: chiaveDiMarta },
    });

    expect(furto.statusCode).toBe(422);
    expect(furto.json().errorCode).toBe('PR015');

    const profiloDiBruno = await chiedi('/profilo/me', { headers: comeUtente(bruno.token) });
    expect(profiloDiBruno.json().data.foto).toBeNull();
  });

  it('senza byte non si conferma: meglio le iniziali di un’immagine rotta', async () => {
    const marta = await utente();

    // Pre-autorizzazione sì, caricamento no.
    const preautorizzazione = await chiedi('/profilo/me/foto/pre-autorizzazione', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: { nome: 'mai-arrivata.jpg', dimensione: 1024 },
    });
    const { chiave } = preautorizzazione.json().data;

    const conferma = await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave },
    });

    expect(conferma.statusCode).toBe(422);
    expect(conferma.json().errorCode).toBe('PR016');
  });

  it('una foto troppo pesante si rifiuta prima di spendere banda', async () => {
    const marta = await utente();

    const risposta = await chiedi('/profilo/me/foto/pre-autorizzazione', {
      method: 'POST',
      headers: comeUtente(marta.token),
      payload: { nome: 'enorme.jpg', dimensione: 6 * 1024 * 1024 },
    });

    // Il limite sta nel DTO (400, campo per campo) prima ancora del dominio.
    expect(risposta.statusCode).toBe(400);
  });

  it('cambiare foto porta via la precedente dall’archivio', async () => {
    const marta = await utente();

    const vecchia = await caricaFoto(marta.token, 'la-prima');
    await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave: vecchia },
    });

    const nuova = await caricaFoto(marta.token, 'la-seconda');
    await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave: nuova },
    });

    expect(await archivio.eStatoCaricato(nuova)).toBe(true);
    // Lasciarla vorrebbe dire pagare spazio per il ritratto che una persona
    // ha deciso di non avere più.
    expect(await archivio.eStatoCaricato(vecchia)).toBe(false);
  });

  it('togliere la foto riporta alle iniziali e svuota l’archivio', async () => {
    const marta = await utente();
    const chiave = await caricaFoto(marta.token);
    await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave },
    });

    const rimozione = await chiedi('/profilo/me/foto', {
      method: 'DELETE',
      headers: comeUtente(marta.token),
    });

    expect(rimozione.statusCode).toBe(200);
    expect(rimozione.json().data.foto).toBeNull();
    expect(await archivio.eStatoCaricato(chiave)).toBe(false);
  });

  it('la foto muore con l’account: nessun file resta nell’archivio', async () => {
    const marta = await utente();
    const chiave = await caricaFoto(marta.token);
    await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave },
    });

    // Il passo della catena che possiede il dato: è Profilo a sapere che il
    // proprio ritratto si elimina, come sa che il profilo si elimina.
    await profili.eliminaDatiDi(marta.utenteId);

    expect(await archivio.eStatoCaricato(chiave)).toBe(false);
    expect(await profili.contaResiduiDi(marta.utenteId)).toBe(0);
  });

  it('anche una foto caricata e mai confermata muore con l’account', async () => {
    const marta = await utente();
    // Caricata davvero, ma senza conferma: i byte ci sono lo stesso.
    const chiave = await caricaFoto(marta.token, 'mai-confermata');

    await profili.eliminaDatiDi(marta.utenteId);

    expect(await archivio.eStatoCaricato(chiave)).toBe(false);
  });

  it('l’esportazione dei dati porta anche la foto', async () => {
    const marta = await utente();
    const chiave = await caricaFoto(marta.token);
    await chiedi('/profilo/me/foto', {
      method: 'PUT',
      headers: comeUtente(marta.token),
      payload: { chiave },
    });

    const dati = await profili.datiPersonaliDi(marta.utenteId);
    expect(dati?.foto).toContain(chiave);
  });
});
