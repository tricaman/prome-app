import { ValidationPipe } from '@nestjs/common';
import { ValidationException } from '../exceptions/validation.exception';

/**
 * ValidationPipe globale dell'API — unica per main.ts e per i test, così il
 * comportamento in produzione e quello verificato coincidono sempre.
 *
 * - whitelist + forbidNonWhitelisted: i campi non previsti dal DTO sono errori;
 * - transform + enableImplicitConversion: query/param arrivano già tipizzati;
 * - exceptionFactory: gli errori diventano ValidationException, che il filtro
 *   globale traduce campo per campo.
 */
export function creaValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errori) => new ValidationException(errori),
  });
}
