import { randomUUID } from 'node:crypto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  type ValidationError,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { I18nContext } from 'nestjs-i18n';
import type { ApiErrorResponse, ValidationErrorDetail } from '@prome/contracts';
import { AppException } from '../exceptions/app.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { SystemErrorCode, type ErrorMessageKey } from '../constants/error-codes';

/** Fallback errorCode per le HttpException standard, per status. */
const STATUS_A_CODICE: Record<number, string> = {
  400: SystemErrorCode.HTTP_BAD_REQUEST,
  401: SystemErrorCode.HTTP_UNAUTHORIZED,
  403: SystemErrorCode.HTTP_FORBIDDEN,
  404: SystemErrorCode.HTTP_NOT_FOUND,
  405: SystemErrorCode.HTTP_METHOD_NOT_ALLOWED,
  406: SystemErrorCode.HTTP_NOT_ACCEPTABLE,
  408: SystemErrorCode.HTTP_REQUEST_TIMEOUT,
  409: SystemErrorCode.HTTP_CONFLICT,
  410: SystemErrorCode.HTTP_GONE,
  413: SystemErrorCode.HTTP_PAYLOAD_TOO_LARGE,
  422: SystemErrorCode.HTTP_UNPROCESSABLE_ENTITY,
  429: SystemErrorCode.HTTP_TOO_MANY_REQUESTS,
  500: SystemErrorCode.HTTP_INTERNAL_SERVER_ERROR,
  501: SystemErrorCode.HTTP_NOT_IMPLEMENTED,
  502: SystemErrorCode.HTTP_BAD_GATEWAY,
  503: SystemErrorCode.HTTP_SERVICE_UNAVAILABLE,
  504: SystemErrorCode.HTTP_GATEWAY_TIMEOUT,
};

/** Chiave i18n generica per gli status delle HttpException standard. */
const STATUS_A_CHIAVE: Record<number, ErrorMessageKey> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Mappa vincolo class-validator → chiave di validation.json.
 * Un vincolo non mappato mantiene il messaggio originale (in inglese):
 * aggiungerlo qui e nei due validation.json quando serve.
 */
const VINCOLO_A_CHIAVE: Record<string, string> = {
  isDefined: 'REQUIRED',
  isNotEmpty: 'REQUIRED',
  isString: 'INVALID_STRING',
  isNumber: 'INVALID_NUMBER',
  isNumberString: 'INVALID_NUMBER',
  isInt: 'INVALID_INTEGER',
  isBoolean: 'INVALID_BOOLEAN',
  isArray: 'INVALID_ARRAY',
  isEnum: 'INVALID_OPTION',
  isIn: 'INVALID_OPTION',
  isEmail: 'INVALID_EMAIL',
  isDate: 'INVALID_DATE',
  isDateString: 'INVALID_DATE',
  isIso8601: 'INVALID_DATE',
  isUuid: 'INVALID_UUID',
  isUrl: 'INVALID_URL',
  matches: 'INVALID_FORMAT',
  minLength: 'TOO_SHORT',
  maxLength: 'TOO_LONG',
  min: 'TOO_SMALL',
  max: 'TOO_BIG',
  arrayMinSize: 'TOO_FEW_ITEMS',
  arrayMaxSize: 'TOO_MANY_ITEMS',
  isPositive: 'MUST_BE_POSITIVE',
  whitelistValidation: 'UNKNOWN_FIELD',
};

/**
 * Filtro globale: OGNI eccezione dell'applicazione esce da qui come
 * ApiErrorResponse del contratto client, con il messaggio già tradotto nella
 * lingua della richiesta (`?lang` > header `x-lang` > `Accept-Language`,
 * fallback: italiano).
 *
 * - AppException          → errorCode proprio + messaggio da errors.json
 * - ValidationException   → V001 + dettagli campo per campo da validation.json
 * - HttpException standard→ fallback H4xx/H5xx; i messaggi di default di Nest
 *                           vengono tradotti, quelli custom passano invariati
 * - errore sconosciuto    → 500 generico: il dettaglio resta SOLO nei log
 *
 * L'errorId (UUID) compare sia nella risposta sia nei log: è il riferimento
 * per correlare una segnalazione dell'utente con lo stack trace.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const contesto = host.switchToHttp();
    const risposta = contesto.getResponse<FastifyReply>();
    const richiesta = contesto.getRequest<FastifyRequest>();
    const i18n = I18nContext.current(host);
    const errorId = randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode: string;
    let message: string;
    let details: ValidationErrorDetail[] | undefined;

    if (exception instanceof ValidationException) {
      errorCode = SystemErrorCode.VALIDATION_ERROR;
      message = this.traduci(i18n, 'errors.VALIDATION_ERROR');
      details = this.traduciVincoli(i18n, exception.errori);
    } else if (exception instanceof AppException) {
      errorCode = exception.errorCode;
      message = this.traduci(i18n, `errors.${exception.messageKey}`, exception.params);
    } else if (exception instanceof HttpException) {
      errorCode = STATUS_A_CODICE[status] ?? SystemErrorCode.HTTP_UNKNOWN;
      message = this.messaggioHttpStandard(i18n, exception, status);
    } else {
      errorCode = SystemErrorCode.INTERNAL_SERVER_ERROR;
      message = this.traduci(i18n, 'errors.INTERNAL_SERVER_ERROR');
    }

    // I 5xx non intenzionali non espongono MAI il messaggio reale al client:
    // il dettaglio resta nei log, correlato dall'errorId.
    if (status >= 500 && !(exception instanceof AppException)) {
      message = this.traduci(i18n, 'errors.INTERNAL_SERVER_ERROR');
    }

    this.logger.error(
      JSON.stringify({
        errorId,
        errorCode,
        status,
        method: richiesta.method,
        path: richiesta.url,
        message: exception instanceof Error ? exception.message : 'Errore sconosciuto',
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    const corpo: ApiErrorResponse = {
      statusCode: status,
      errorCode,
      message,
      errorId,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    };

    void risposta.status(status).send(corpo);
  }

  private traduci(
    i18n: I18nContext | undefined,
    chiave: string,
    args?: Record<string, unknown>,
  ): string {
    if (!i18n) return chiave;
    return i18n.translate(chiave, { args }) as string;
  }

  /**
   * HttpException standard di Nest: se il messaggio è quello di default
   * (es. "Not Found", "Cannot GET /x") lo sostituiamo con la traduzione
   * generica per quello status; un messaggio custom passa invariato.
   */
  private messaggioHttpStandard(
    i18n: I18nContext | undefined,
    exception: HttpException,
    status: number,
  ): string {
    const rispostaEccezione = exception.getResponse();
    let messaggio: string;
    let nomeErrore: string | undefined;

    if (typeof rispostaEccezione === 'string') {
      messaggio = rispostaEccezione;
    } else if (typeof rispostaEccezione === 'object' && rispostaEccezione !== null) {
      const oggetto = rispostaEccezione as Record<string, unknown>;
      messaggio = Array.isArray(oggetto.message)
        ? oggetto.message.join(', ')
        : String(oggetto.message ?? '');
      nomeErrore = typeof oggetto.error === 'string' ? oggetto.error : undefined;
    } else {
      messaggio = '';
    }

    const eMessaggioDiDefault =
      messaggio === '' || messaggio === nomeErrore || /^Cannot [A-Z]+ /.test(messaggio);

    if (eMessaggioDiDefault) {
      const chiave =
        STATUS_A_CHIAVE[status] ?? (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
      return this.traduci(i18n, `errors.${chiave}`);
    }
    return messaggio;
  }

  /** Appiattisce gli errori (anche annidati) e traduce ogni vincolo violato. */
  private traduciVincoli(
    i18n: I18nContext | undefined,
    errori: ValidationError[],
    prefisso = '',
  ): ValidationErrorDetail[] {
    const dettagli: ValidationErrorDetail[] = [];
    for (const errore of errori) {
      const campo = prefisso ? `${prefisso}.${errore.property}` : errore.property;
      for (const [vincolo, originale] of Object.entries(errore.constraints ?? {})) {
        dettagli.push({
          field: campo,
          constraint: vincolo,
          message: this.traduciVincolo(i18n, vincolo, originale, campo),
        });
      }
      if (errore.children?.length) {
        dettagli.push(...this.traduciVincoli(i18n, errore.children, campo));
      }
    }
    return dettagli;
  }

  private traduciVincolo(
    i18n: I18nContext | undefined,
    vincolo: string,
    messaggioOriginale: string,
    campo: string,
  ): string {
    // Un DTO può forzare una chiave esplicita: @IsString({ message: 'validation.MIA_CHIAVE' })
    if (/^validation\.[A-Z0-9_]+$/.test(messaggioOriginale)) {
      return this.traduci(i18n, messaggioOriginale, { field: campo });
    }
    const chiave = VINCOLO_A_CHIAVE[vincolo];
    if (chiave) {
      return this.traduci(i18n, `validation.${chiave}`, { field: campo });
    }
    // Vincolo non mappato: meglio il messaggio originale che una chiave nuda.
    return messaggioOriginale;
  }
}
