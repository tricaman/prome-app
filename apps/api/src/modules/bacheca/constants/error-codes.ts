/**
 * Codici errore del contesto Bacheca (BA001-BA999).
 * Solo localizzatori: vedi profilo/constants/error-codes.ts per la convenzione.
 */
export const BachecaErrorCode = {
  POST_NOT_FOUND: 'BA001',
} as const;

export type BachecaErrorCode = (typeof BachecaErrorCode)[keyof typeof BachecaErrorCode];
