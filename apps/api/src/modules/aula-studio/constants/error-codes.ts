/**
 * Codici errore del contesto Aula studio (AS001-AS999).
 * Solo localizzatori: vedi profilo/constants/error-codes.ts per la convenzione.
 */
export const AulaStudioErrorCode = {
  NOT_FOUND: 'AS001',
} as const;

export type AulaStudioErrorCode = (typeof AulaStudioErrorCode)[keyof typeof AulaStudioErrorCode];
