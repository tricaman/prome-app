/**
 * Codici errore del contesto Gruppo (GR001-GR999).
 * Solo localizzatori: vedi profilo/constants/error-codes.ts per la convenzione.
 */
export const GruppoErrorCode = {
  NOT_FOUND: 'GR001',
} as const;

export type GruppoErrorCode = (typeof GruppoErrorCode)[keyof typeof GruppoErrorCode];
