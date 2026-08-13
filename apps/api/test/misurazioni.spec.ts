import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { MisurazioniSenzaFornitore } from '../src/infrastruttura/misurazioni/misurazioni-senza-fornitore';

/**
 * Strumentazione degli eventi di prodotto (E1.6).
 *
 * Il work package **non attiva un prodotto di analisi**: predispone i punti di
 * emissione e li prova. Questi test sono quindi l'unica cosa che tiene in vita
 * quei punti — senza, un rifacimento li toglierebbe senza che nulla si accorga,
 * e il giorno in cui arrivasse un fornitore non ci sarebbe niente da collegare.
 *
 * Il secondo scopo conta quanto il primo: **nessun dato personale negli
 * eventi**. È la condizione a cui la scelta del fornitore è sospesa, e qui la
 * si difende adesso, non quando il fornitore arriverà.
 */
describe('Misurazioni di utilizzo (E1.6)', () => {
  let app: NestFastifyApplication;
  let email: CanaleEmailSviluppo;
  let misurazioni: MisurazioniSenzaFornitore;

  let contatore = 0;
  const nuovoIndirizzo = () => `misure-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

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

  const eventi = () => misurazioni.emessi().map((e) => e.evento);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    email = app.get(CanaleEmailSviluppo);
    misurazioni = app.get(MisurazioniSenzaFornitore);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => misurazioni.azzera());

  it('segna il percorso di ingresso, dal codice al primo post', async () => {
    const indirizzo = nuovoIndirizzo();

    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    expect(eventi()).toContain('codice_richiesto');

    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const token = verifica.json().data.token as string;
    const autorizzazione = { authorization: `Bearer ${token}` };

    await chiedi('/profilo/me', {
      method: 'PUT',
      headers: autorizzazione,
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });

    await chiedi('/bacheca', {
      method: 'POST',
      headers: autorizzazione,
      payload: { testo: 'Il mio primo post' },
    });

    // È il percorso che l'epica dichiara di voler misurare: quanti chiedono un
    // codice, quanti entrano, quanti completano il profilo, quanti pubblicano.
    expect(eventi()).toEqual([
      'codice_richiesto',
      'accesso_effettuato',
      'onboarding_completato',
      'post_pubblicato',
    ]);
  });

  it('distingue chi arriva la prima volta da chi torna', async () => {
    const indirizzo = nuovoIndirizzo();
    const entra = async () => {
      await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
      return chiedi('/accesso/verifica', {
        method: 'POST',
        payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
      });
    };

    const prima = await entra();
    await chiedi('/profilo/me', {
      method: 'PUT',
      headers: { authorization: `Bearer ${prima.json().data.token}` },
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });
    await entra();

    const accessi = misurazioni
      .emessi()
      .filter((e) => e.evento === 'accesso_effettuato')
      .map((e) => e.proprieta?.primoIngresso);

    expect(accessi).toEqual([true, false]);
  });

  it('non emette nulla quando il gesto fallisce', async () => {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    misurazioni.azzera();

    await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: '000000' },
    });

    // Un accesso fallito non è un accesso: contarlo gonfierebbe la sola
    // misura su cui il prodotto dovrà decidere qualcosa.
    expect(eventi()).not.toContain('accesso_effettuato');
  });

  it('non porta dati personali negli eventi', async () => {
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
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });
    await chiedi('/bacheca', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      payload: { testo: 'Testo riservato del post' },
    });

    const tutto = JSON.stringify(misurazioni.emessi());

    // Indirizzo, nome, ateneo e contenuto non devono comparire da nessuna
    // parte: è la condizione a cui è sospesa la scelta del fornitore, e vale
    // già adesso che il fornitore non c'è.
    expect(tutto).not.toContain(indirizzo);
    expect(tutto).not.toContain('Marta');
    expect(tutto).not.toContain('Università di Bologna');
    expect(tutto).not.toContain('Testo riservato del post');
  });

  it('conta gli allegati senza dire quali', async () => {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const autorizzazione = { authorization: `Bearer ${verifica.json().data.token}` };
    await chiedi('/profilo/me', {
      method: 'PUT',
      headers: autorizzazione,
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        universita: 'Università di Bologna',
        corso: 'Ingegneria informatica',
      },
    });

    const contenuto = 'contenuto';
    const preautorizzazione = await chiedi('/bacheca/allegati/pre-autorizzazione', {
      method: 'POST',
      headers: autorizzazione,
      payload: {
        nome: 'segretissimo.pdf',
        tipo: 'PDF',
        dimensione: Buffer.byteLength(contenuto),
      },
    });
    const { chiave, url } = preautorizzazione.json().data;
    await chiedi(url.replace(/^https?:\/\/[^/]+/, ''), { method: 'PUT', payload: contenuto });
    await chiedi('/bacheca', {
      method: 'POST',
      headers: autorizzazione,
      payload: { testo: 'Con allegato', allegati: [chiave] },
    });

    const caricamento = misurazioni.emessi().find((e) => e.evento === 'allegato_caricato');
    const pubblicazione = misurazioni.emessi().find((e) => e.evento === 'post_pubblicato');

    expect(caricamento?.proprieta?.tipo).toBe('PDF');
    expect(pubblicazione?.proprieta?.allegati).toBe(1);
    expect(JSON.stringify(misurazioni.emessi())).not.toContain('segretissimo.pdf');
  });
});
