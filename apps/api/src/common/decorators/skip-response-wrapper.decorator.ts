import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_WRAPPER_KEY = 'skipResponseWrapper';

/**
 * Esclude l'endpoint dal wrapping automatico nell'envelope.
 * Solo per risposte che DEVONO essere raw: stream, redirect, webhook di terzi.
 */
export const SkipResponseWrapper = () => SetMetadata(SKIP_RESPONSE_WRAPPER_KEY, true);
