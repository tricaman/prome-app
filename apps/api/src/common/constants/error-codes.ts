import errorsIt from '../../i18n/it/errors.json';
import errorsEn from '../../i18n/en/errors.json';
import successesIt from '../../i18n/it/successes.json';
import successesEn from '../../i18n/en/successes.json';
import type { ProfiloErrorCode } from '../../modules/profilo/constants/error-codes';
import type { BachecaErrorCode } from '../../modules/bacheca/constants/error-codes';
import type { GruppoErrorCode } from '../../modules/gruppo/constants/error-codes';
import type { AulaStudioErrorCode } from '../../modules/aula-studio/constants/error-codes';

/**
 * Chiavi i18n auto-estratte da errors.json: garantiscono a compile time che
 * AppException usi solo messaggi che esistono davvero nei file di traduzione.
 */
export type ErrorMessageKey = keyof typeof errorsIt;

/** Chiavi i18n dei messaggi di successo (per @ResponseMessage). */
export type SuccessMessageKey = keyof typeof successesIt;

// Parità dei cataloghi: se una chiave esiste in it ma manca in en (o viceversa)
// queste righe non compilano. Aggiungere sempre le chiavi in ENTRAMBE le lingue.
const _erroriParitaEn: Record<ErrorMessageKey, string> = errorsEn;
const _erroriParitaIt: Record<keyof typeof errorsEn, string> = errorsIt;
const _successiParitaEn: Record<SuccessMessageKey, string> = successesEn;
const _successiParitaIt: Record<keyof typeof successesEn, string> = successesIt;
void _erroriParitaEn, _erroriParitaIt, _successiParitaEn, _successiParitaIt;

/**
 * Codici errore di sistema (S001-S999, V001-V999) e codici di fallback per le
 * HttpException standard di NestJS (H400-H599, H000): usati dal filtro globale
 * quando l'eccezione non è una AppException.
 */
export const SystemErrorCode = {
  INTERNAL_SERVER_ERROR: 'S001',
  VALIDATION_ERROR: 'V001',
  HTTP_BAD_REQUEST: 'H400',
  HTTP_UNAUTHORIZED: 'H401',
  HTTP_FORBIDDEN: 'H403',
  HTTP_NOT_FOUND: 'H404',
  HTTP_METHOD_NOT_ALLOWED: 'H405',
  HTTP_NOT_ACCEPTABLE: 'H406',
  HTTP_REQUEST_TIMEOUT: 'H408',
  HTTP_CONFLICT: 'H409',
  HTTP_GONE: 'H410',
  HTTP_PAYLOAD_TOO_LARGE: 'H413',
  HTTP_UNPROCESSABLE_ENTITY: 'H422',
  HTTP_TOO_MANY_REQUESTS: 'H429',
  HTTP_INTERNAL_SERVER_ERROR: 'H500',
  HTTP_NOT_IMPLEMENTED: 'H501',
  HTTP_BAD_GATEWAY: 'H502',
  HTTP_SERVICE_UNAVAILABLE: 'H503',
  HTTP_GATEWAY_TIMEOUT: 'H504',
  HTTP_UNKNOWN: 'H000',
} as const;

export type SystemErrorCode = (typeof SystemErrorCode)[keyof typeof SystemErrorCode];

/**
 * Tutti i codici errore dell'applicazione. Ogni bounded context definisce i
 * propri in modules/{contesto}/constants/error-codes.ts:
 * - Profilo:     PR001-PR999
 * - Bacheca:     BA001-BA999
 * - Gruppo:      GR001-GR999
 * - Aula studio: AS001-AS999
 * - Sistema:     S/V/H (qui)
 *
 * Un nuovo contesto va aggiunto a questa union e ri-esportato qui sotto.
 */
export type ErrorCode =
  | ProfiloErrorCode
  | BachecaErrorCode
  | GruppoErrorCode
  | AulaStudioErrorCode
  | SystemErrorCode;

export { ProfiloErrorCode } from '../../modules/profilo/constants/error-codes';
export { BachecaErrorCode } from '../../modules/bacheca/constants/error-codes';
export { GruppoErrorCode } from '../../modules/gruppo/constants/error-codes';
export { AulaStudioErrorCode } from '../../modules/aula-studio/constants/error-codes';
