/**
 * Codici errore del contesto Profilo (PR001-PR999).
 *
 * Sono SOLO localizzatori del punto in cui l'errore è stato lanciato:
 * indipendenti dal messaggio (la chiave i18n viaggia a parte in AppException).
 * Lo stesso messaggio può avere più codici per distinguere punti diversi.
 */
export const ProfiloErrorCode = {
  NOT_FOUND: 'PR001',
  ONBOARDING_INCOMPLETO: 'PR002',
} as const;

export type ProfiloErrorCode = (typeof ProfiloErrorCode)[keyof typeof ProfiloErrorCode];
