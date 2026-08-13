import { Body, Controller, Get, HttpStatus, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import type { PaginatedResult } from '@prome/contracts';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { AppException } from '../src/common/exceptions';
import { ProfiloErrorCode } from '../src/common/constants/error-codes';
import { ResponseMessage, SkipResponseWrapper } from '../src/common/decorators';
import { SenzaAccesso } from '../src/modules/facciata/guardia-accesso';

/**
 * Test dell'infrastruttura trasversale della facciata: envelope di successo,
 * errori tradotti (priorità ?lang > x-lang > Accept-Language, ripiego inglese
 * come per i client), validazione campo per campo e mascheramento dei 5xx.
 * Il modulo di prova esiste solo qui: nessun endpoint fittizio in produzione.
 */

class CreaProvaDto {
  @IsNotEmpty()
  @IsString()
  titolo!: string;

  @IsInt()
  @Min(1)
  quantita!: number;
}

// La guardia della facciata nega per difetto: questi endpoint esistono per
// provare l'infrastruttura, non risorse da proteggere, e lo dichiarano.
@SenzaAccesso()
@Controller('prova')
class ProvaController {
  @Get('errore-dominio')
  erroreDominio(): never {
    throw new AppException(ProfiloErrorCode.NOT_FOUND, 'PROFILO_NOT_FOUND', HttpStatus.NOT_FOUND, {
      utenteId: 'abc',
    });
  }

  @Get('errore-imprevisto')
  erroreImprevisto(): never {
    throw new Error('dettaglio interno che non deve uscire');
  }

  @Get('paginata')
  paginata(): PaginatedResult<number> {
    return { data: [1, 2, 3], meta: { total: 3, page: 1, limit: 20, totalPages: 1 } };
  }

  @Get('raw')
  @SkipResponseWrapper()
  raw(): Record<string, boolean> {
    return { ciao: true };
  }

  @Post()
  @ResponseMessage('successes.DEFAULT')
  crea(@Body() dto: CreaProvaDto): CreaProvaDto {
    return dto;
  }
}

@Module({ controllers: [ProvaController] })
class ProvaModule {}

describe('Infrastruttura della facciata REST', () => {
  let app: NestFastifyApplication;

  const inietta = async (opzioni: {
    method?: 'GET' | 'POST';
    url: string;
    headers?: Record<string, string>;
    payload?: unknown;
  }) => {
    const risposta = await app.getHttpAdapter().getInstance().inject({
      method: opzioni.method ?? 'GET',
      url: opzioni.url,
      headers: { 'content-type': 'application/json', ...opzioni.headers },
      payload: opzioni.payload as never,
    });
    return { status: risposta.statusCode, body: JSON.parse(risposta.body) };
  };

  /** Richiesta esplicita in italiano: la seconda lingua del prodotto. */
  const IN_ITALIANO = { 'accept-language': 'it' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ProvaModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useLogger(false);
    app.useGlobalPipes(creaValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('envelope di successo', () => {
    it('wrappa i dati in { data, meta } con messaggio tradotto', async () => {
      const { status, body } = await inietta({ url: '/health' });
      expect(status).toBe(200);
      expect(body.data).toEqual({ status: 'ok', role: 'app', version: 'v1' });
      expect(body.meta.status).toBe(200);
      expect(body.meta.timestamp).toEqual(expect.any(String));
    });

    it('senza preferenze di lingua ripiega sull’inglese', async () => {
      const { body } = await inietta({ url: '/health' });
      expect(body.meta.message).toBe('The service is up');
    });

    it('traduce in italiano quando la richiesta lo chiede', async () => {
      const { body } = await inietta({ url: '/health', headers: IN_ITALIANO });
      expect(body.meta.message).toBe('Il servizio è attivo');
    });

    it('sposta la paginazione in meta.pagination e traduce il messaggio di default', async () => {
      const { body } = await inietta({ url: '/prova/paginata', headers: IN_ITALIANO });
      expect(body.data).toEqual([1, 2, 3]);
      expect(body.meta.pagination).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
      expect(body.meta.message).toBe('Operazione completata');
    });

    it('@SkipResponseWrapper lascia la risposta raw', async () => {
      const { body } = await inietta({ url: '/prova/raw' });
      expect(body).toEqual({ ciao: true });
      expect(body.meta).toBeUndefined();
    });
  });

  describe('priorità della lingua', () => {
    it('x-lang batte Accept-Language', async () => {
      const { body } = await inietta({
        url: '/health',
        headers: { 'x-lang': 'it', 'accept-language': 'en' },
      });
      expect(body.meta.message).toBe('Il servizio è attivo');
    });

    it('?lang batte x-lang', async () => {
      const { body } = await inietta({
        url: '/health?lang=it',
        headers: { 'x-lang': 'en' },
      });
      expect(body.meta.message).toBe('Il servizio è attivo');
    });
  });

  describe('errori di dominio (AppException)', () => {
    it('risponde con errorCode del punto di lancio e messaggio tradotto', async () => {
      const { status, body } = await inietta({
        url: '/prova/errore-dominio',
        headers: IN_ITALIANO,
      });
      expect(status).toBe(404);
      expect(body.errorCode).toBe('PR001');
      expect(body.message).toBe('Profilo non trovato');
      expect(body.errorId).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.timestamp).toEqual(expect.any(String));
    });

    it('senza preferenze di lingua usa l’inglese', async () => {
      const { body } = await inietta({ url: '/prova/errore-dominio' });
      expect(body.message).toBe('Profile not found');
    });
  });

  describe('errori di validazione', () => {
    it('traduce ogni vincolo violato, campo per campo', async () => {
      const { status, body } = await inietta({
        method: 'POST',
        url: '/prova',
        headers: IN_ITALIANO,
        payload: { quantita: 0 },
      });
      expect(status).toBe(400);
      expect(body.errorCode).toBe('V001');
      expect(body.message).toBe('Errore di validazione');

      const perCampo = Object.fromEntries(
        body.details.map((d: { field: string; message: string }) => [d.field, d.message]),
      );
      expect(perCampo['titolo']).toBe('Campo obbligatorio');
      expect(perCampo['quantita']).toBe('Valore troppo piccolo');
    });

    it('rifiuta i campi non previsti dal DTO', async () => {
      const { body } = await inietta({
        method: 'POST',
        url: '/prova',
        payload: { titolo: 'ok', quantita: 1, campoIntruso: true },
      });
      expect(body.errorCode).toBe('V001');
      const intruso = body.details.find((d: { field: string }) => d.field === 'campoIntruso');
      expect(intruso.constraint).toBe('whitelistValidation');
      expect(intruso.message).toBe('Unexpected field');
    });
  });

  describe('errori standard e imprevisti', () => {
    it('traduce i default di Nest: rotta inesistente → H404', async () => {
      const { status, body } = await inietta({
        url: '/rotta-inesistente',
        headers: IN_ITALIANO,
      });
      expect(status).toBe(404);
      expect(body.errorCode).toBe('H404');
      expect(body.message).toBe('Risorsa non trovata');
    });

    it('maschera i 5xx non intenzionali: il dettaglio non esce mai', async () => {
      const { status, body } = await inietta({ url: '/prova/errore-imprevisto' });
      expect(status).toBe(500);
      expect(body.errorCode).toBe('S001');
      expect(body.message).toBe('Internal server error');
      expect(JSON.stringify(body)).not.toContain('dettaglio interno');
    });
  });
});
