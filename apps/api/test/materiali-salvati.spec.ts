import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { CancellazioneAulaStudioService } from '../src/modules/aula-studio/cancellazione-aula-studio.service';
import { assicuraCatalogoDiProva, type CatalogoDiProva } from './catalogo';

/**
 * I materiali salvati — la raccolta personale, scritta prima del codice.
 *
 * I difetti invisibili di quest'area sono due, e sono di privacy:
 *
 * - **salvare ciò che non si vede**: chi indovina un identificativo si mette
 *   in raccolta il materiale di un'aula in cui non è mai entrato, e da lì lo
 *   legge — la raccolta diventerebbe una porta di servizio verso i contenuti
 *   di tutti;
 * - **continuare a vedere dopo essere usciti**: chi lascia un'aula (o ne viene
 *   rimosso) non deve più vederne i materiali, nemmeno quelli che aveva messo
 *   da parte. La riga resta — rientrando li ritrova — ma la lettura la filtra.
 *
 * Il terzo caso è la cancellazione dell'account: un segnalibro non è un
 * contributo a chi studia, è l'elenco di ciò che una persona teneva da parte.
 * Se ne va con lei, e la verifica del residuo lo conta.
 */
describe('Materiali salvati', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoDiProva;
  let email: CanaleEmailSviluppo;
  let cancellazioneAule: CancellazioneAulaStudioService;

  let contatore = 0;
  const nuovoIndirizzo = () => `salvati-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  async function utente(nome = 'Marta'): Promise<Utente> {
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
    return { token, utenteId: profilo.json().data.utenteId as string };
  }

  /** Un'aula con dentro un materiale: il minimo per avere qualcosa da salvare. */
  async function aulaConMateriale(
    proprietario: Utente,
    contenuto = 'appunti',
  ): Promise<{ aulaId: string; materialeId: string }> {
    const aula = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(proprietario.token),
      payload: { titolo: 'Analisi 1', visibilita: 'PUBBLICO' },
    });
    const aulaId = aula.json().data.id as string;

    const preautorizzazione = await chiedi(`/aule-studio/${aulaId}/allegati/pre-autorizzazione`, {
      method: 'POST',
      headers: comeUtente(proprietario.token),
      payload: { nome: 'esercizi.txt', tipo: 'TESTO', dimensione: Buffer.byteLength(contenuto) },
    });
    const { chiave, url } = preautorizzazione.json().data;
    await chiedi(url.replace(/^https?:\/\/[^/]+/, ''), { method: 'PUT', payload: contenuto });

    const materiale = await chiedi(`/aule-studio/${aulaId}/allegati`, {
      method: 'POST',
      headers: comeUtente(proprietario.token),
      payload: { chiave },
    });

    return { aulaId, materialeId: materiale.json().data.id as string };
  }

  const raccoltaDi = async (chi: Utente) =>
    (await chiedi('/materiali-salvati', { headers: comeUtente(chi.token) })).json().data as Array<{
      materiale: { id: string; salvato?: boolean };
      titoloAula: string;
    }>;

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
    cancellazioneAule = app.get(CancellazioneAulaStudioService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('si salva, si ritrova con l’aula da cui viene, e la sala lo sa', async () => {
    const marta = await utente();
    const { aulaId, materialeId } = await aulaConMateriale(marta);

    const salvataggio = await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(marta.token),
    });
    expect(salvataggio.statusCode).toBe(200);

    const raccolta = await raccoltaDi(marta);
    expect(raccolta).toHaveLength(1);
    expect(raccolta[0]?.materiale.id).toBe(materialeId);
    // Senza provenienza sarebbe un elenco di nomi di file.
    expect(raccolta[0]?.titoloAula).toBe('Analisi 1');

    // E la sala dichiara che è già in raccolta: dedurlo nel client vorrebbe
    // dire incrociare a mano due elenchi in ogni schermata.
    const sala = await chiedi(`/aule-studio/${aulaId}/sala`, { headers: comeUtente(marta.token) });
    const materiale = (sala.json().data.allegati as Array<{ id: string; salvato: boolean }>).find(
      (a) => a.id === materialeId,
    );
    expect(materiale?.salvato).toBe(true);
  });

  it('salvare due volte è un’operazione senza effetto, non un errore', async () => {
    const marta = await utente();
    const { materialeId } = await aulaConMateriale(marta);

    await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(marta.token),
    });
    const secondo = await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(marta.token),
    });

    expect(secondo.statusCode).toBe(200);
    expect(await raccoltaDi(marta)).toHaveLength(1);
  });

  it('non si salva il materiale di un’aula in cui non si è dentro', async () => {
    const proprietaria = await utente('Anna');
    const estraneo = await utente('Bruno');
    const { materialeId } = await aulaConMateriale(proprietaria);

    const tentativo = await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(estraneo.token),
    });

    // 404 e non 403: «esiste ma non puoi» racconta comunque che esiste.
    expect(tentativo.statusCode).toBe(404);
    expect(await raccoltaDi(estraneo)).toHaveLength(0);
  });

  it('uscendo dall’aula la raccolta smette di mostrarlo, e rientrando torna', async () => {
    const proprietaria = await utente('Anna');
    const ospite = await utente('Bruno');
    const { aulaId, materialeId } = await aulaConMateriale(proprietaria);

    // Aula pubblica: si entra e si salva.
    await chiedi(`/aule-studio/${aulaId}/ingresso`, {
      method: 'POST',
      headers: comeUtente(ospite.token),
    });
    await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(ospite.token),
    });
    expect(await raccoltaDi(ospite)).toHaveLength(1);

    await chiedi(`/aule-studio/${aulaId}/partecipanti/${ospite.utenteId}`, {
      method: 'DELETE',
      headers: comeUtente(ospite.token),
    });

    // La riga resta, la lettura la filtra: è la visibilità risolta adesso.
    expect(await raccoltaDi(ospite)).toHaveLength(0);
    expect(await prisma.materialeSalvato.count({ where: { utenteId: ospite.utenteId } })).toBe(1);

    await chiedi(`/aule-studio/${aulaId}/ingresso`, {
      method: 'POST',
      headers: comeUtente(ospite.token),
    });
    expect(await raccoltaDi(ospite)).toHaveLength(1);
  });

  it('si toglie dalla raccolta, e toglierlo due volte non è un errore', async () => {
    const marta = await utente();
    const { materialeId } = await aulaConMateriale(marta);
    await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(marta.token),
    });

    const prima = await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'DELETE',
      headers: comeUtente(marta.token),
    });
    const seconda = await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'DELETE',
      headers: comeUtente(marta.token),
    });

    expect(prima.statusCode).toBe(200);
    expect(seconda.statusCode).toBe(200);
    expect(await raccoltaDi(marta)).toHaveLength(0);
  });

  it('la raccolta se ne va con l’account, e il residuo la conta', async () => {
    const marta = await utente();
    const { materialeId } = await aulaConMateriale(marta);
    await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(marta.token),
    });

    // Prima: la verifica del residuo la vede. Se non la contasse, si
    // dichiarerebbe «totale» senza esserlo.
    expect(await cancellazioneAule.contaResiduiDi(marta.utenteId, null)).toBeGreaterThan(0);

    await cancellazioneAule.eliminaMaterialiSalvatiDi(marta.utenteId);

    expect(await prisma.materialeSalvato.count({ where: { utenteId: marta.utenteId } })).toBe(0);
  });

  it('eliminare il materiale porta via i segnalibri di tutti', async () => {
    const proprietaria = await utente('Anna');
    const ospite = await utente('Bruno');
    const { aulaId, materialeId } = await aulaConMateriale(proprietaria);

    await chiedi(`/aule-studio/${aulaId}/ingresso`, {
      method: 'POST',
      headers: comeUtente(ospite.token),
    });
    await chiedi(`/materiali-salvati/${materialeId}`, {
      method: 'PUT',
      headers: comeUtente(ospite.token),
    });

    await chiedi(`/aule-studio/${aulaId}/allegati/${materialeId}`, {
      method: 'DELETE',
      headers: comeUtente(proprietaria.token),
    });

    // Un segnalibro a un materiale che non c'è più non è un dato: è un
    // riferimento rotto.
    expect(await prisma.materialeSalvato.count({ where: { materialeId } })).toBe(0);
    expect(await raccoltaDi(ospite)).toHaveLength(0);
  });
});
