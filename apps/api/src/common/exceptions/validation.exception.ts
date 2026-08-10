import { BadRequestException, type ValidationError } from '@nestjs/common';

/**
 * Eccezione sollevata dalla ValidationPipe globale (vedi common/pipes):
 * trasporta gli errori strutturati di class-validator fino al filtro globale,
 * che li traduce campo per campo nella lingua della richiesta.
 */
export class ValidationException extends BadRequestException {
  constructor(public readonly errori: ValidationError[]) {
    super('VALIDATION_ERROR');
  }
}
