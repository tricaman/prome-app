import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode, ErrorMessageKey } from '../constants/error-codes';

/**
 * Eccezione applicativa: l'UNICO modo per segnalare errori di dominio al client.
 *
 * errorCode e messageKey sono completamente indipendenti:
 * - errorCode: localizzatore (PR001, BA002, S001...) del punto esatto in cui
 *   l'errore è stato lanciato — vedi modules/{contesto}/constants/error-codes.ts;
 * - messageKey: chiave i18n TIPIZZATA (autocompletata da errors.json) che il
 *   filtro globale traduce nella lingua della richiesta.
 *
 * Uso:
 * ```typescript
 * throw new AppException(ProfiloErrorCode.NOT_FOUND, 'PROFILO_NOT_FOUND', HttpStatus.NOT_FOUND, { utenteId });
 * ```
 */
export class AppException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly messageKey: ErrorMessageKey;
  public readonly params?: Record<string, unknown>;

  constructor(
    errorCode: ErrorCode,
    messageKey: ErrorMessageKey,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    params?: Record<string, unknown>,
  ) {
    super(messageKey, statusCode);
    this.errorCode = errorCode;
    this.messageKey = messageKey;
    this.params = params;
  }
}
