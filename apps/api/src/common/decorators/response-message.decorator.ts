import { SetMetadata } from '@nestjs/common';
import type { SuccessMessageKey } from '../constants/error-codes';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';

/**
 * Riferimento a una chiave di successes.json ('successes.CHIAVE', autocompletata)
 * oppure una stringa semplice che passa invariata (senza traduzione).
 */
export type ResponseMessageValue = `successes.${SuccessMessageKey}` | (string & {});

/**
 * Sovrascrive meta.message dell'envelope per l'endpoint decorato.
 * Da usare SEMPRE su POST/PATCH/DELETE: il default generico non descrive l'esito.
 *
 * ```typescript
 * @Post()
 * @ResponseMessage('successes.POST_CREATO') // tradotto nella lingua della richiesta
 * crea(...) {}
 * ```
 */
export const ResponseMessage = (message: ResponseMessageValue) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
