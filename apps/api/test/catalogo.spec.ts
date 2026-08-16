import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { assicuraCatalogoDiProva, NOME_ATENEO, type CatalogoDiProva } from './catalogo';

/**
 * Il catalogo accademico.
 *
 * È l'elenco da cui si sceglie, e il catalogo è **chiuso**: se un corso non
 * compare qui, la persona che lo studia non entra in Prome. Per questo i casi
 * provati non sono «l'endpoint risponde», ma i tre modi in cui l'elenco può
 * mentire — un corso ritirato che si può ancora scegliere, una ricerca che non
 * trova un ateneo cercato con la sigla che tutti usano, una semina che a ogni
 * giro duplica le righe e cambia gli identificativi già finiti nei profili.
 */
describe('Catalogo accademico', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;
  let catalogo: CatalogoDiProva;

  let contatore = 0;
  const nuovoIndirizzo = () => `catalogo-${Date.now()}-${(contatore += 1)}@studenti.it`;

  const chiedi = (percorso: string, opzioni: Record<string, unknown> = {}) =>
    app.inject({
      url: percorso,
      method: 'GET',
      ...opzioni,
      headers: { 'x-lang': 'it', ...(opzioni.headers as Record<string, string>) },
    } as Parameters<NestFastifyApplication['inject']>[0]);

  async function sessione(): Promise<Record<string, string>> {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    return { authorization: `Bearer ${verifica.json().data.token as string}` };
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
    catalogo = await assicuraCatalogoDiProva(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('elenca gli atenei e li trova anche cercandoli per sigla', async () => {
    const intestazioni = await sessione();

    const perNome = await chiedi('/catalogo/universita?ricerca=Università di Prova', {
      headers: intestazioni,
    });
    expect(perNome.statusCode).toBe(200);
    expect(perNome.json().data.map((u: { nome: string }) => u.nome)).toContain(NOME_ATENEO);

    // Chi cerca «uniprova» sta cercando il proprio ateneo con il nome che usa
    // davvero: un elenco che risponde «nessun risultato» ferma un onboarding.
    const perSigla = await chiedi('/catalogo/universita?ricerca=uniprova', {
      headers: intestazioni,
    });
    expect(perSigla.json().data.map((u: { id: string }) => u.id)).toContain(catalogo.ateneoId);
  });

  it('dà i corsi di un ateneo con classe e durata, e solo i suoi', async () => {
    const intestazioni = await sessione();

    const risposta = await chiedi(`/catalogo/universita/${catalogo.ateneoId}/corsi`, {
      headers: intestazioni,
    });

    expect(risposta.statusCode).toBe(200);
    const corsi = risposta.json().data as {
      id: string;
      nome: string;
      durataAnni: number;
      classe: { codice: string };
      universita: { id: string };
    }[];
    expect(corsi.map((c) => c.id)).toEqual(
      expect.arrayContaining([catalogo.corsoInformatica, catalogo.corsoLettere]),
    );
    expect(corsi.map((c) => c.id)).not.toContain(catalogo.altroCorso);
    expect(corsi.every((c) => c.universita.id === catalogo.ateneoId)).toBe(true);

    const informatica = corsi.find((c) => c.id === catalogo.corsoInformatica)!;
    expect(informatica.classe.codice).toBe('L-8');
    expect(informatica.durataAnni).toBe(3);
  });

  it('non offre un corso ritirato: chi c\'è resta, chi arriva non lo sceglie', async () => {
    const ritirato = await prisma.corso.create({
      data: {
        universitaId: catalogo.ateneoId,
        codice: `PROVA-FUORI-${Date.now()}`,
        nome: 'Corso non più offerto',
        classeCodice: 'L-8',
        durataAnni: 3,
        attivo: false,
      },
    });

    const risposta = await chiedi(`/catalogo/universita/${catalogo.ateneoId}/corsi`, {
      headers: await sessione(),
    });

    expect(risposta.json().data.map((c: { id: string }) => c.id)).not.toContain(ritirato.id);

    await prisma.corso.delete({ where: { id: ritirato.id } });
  });

  it('il catalogo non si legge senza sessione', async () => {
    const risposta = await chiedi('/catalogo/universita');

    expect(risposta.statusCode).toBe(401);
    expect(risposta.json().errorCode).toBe('PR006');
  });

  it('la semina è idempotente: due giri, stesse righe e stessi identificativi', async () => {
    const prima = await prisma.corso.findUnique({ where: { id: catalogo.corsoInformatica } });
    const quantiPrima = await prisma.corso.count({ where: { universitaId: catalogo.ateneoId } });

    const dopo = await assicuraCatalogoDiProva(prisma);

    // Gli identificativi sono già finiti nei profili delle persone: cambiarli
    // a ogni rilascio staccherebbe ognuno dal proprio corso.
    expect(dopo.corsoInformatica).toBe(catalogo.corsoInformatica);
    expect(await prisma.corso.count({ where: { universitaId: catalogo.ateneoId } })).toBe(
      quantiPrima,
    );
    expect((await prisma.corso.findUnique({ where: { id: catalogo.corsoInformatica } }))!.creatoIl)
      .toEqual(prima!.creatoIl);
  });
});
