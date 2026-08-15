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

  // Ingresso. Stanno qui, e non in un contesto "Accesso", perché Accesso non è
  // un contesto modellato: la sua unica presenza nel dominio è
  // PortaIdentitàUtente, che Profilo possiede. Chi possiede la porta possiede
  // anche i modi in cui può fallire.
  CODICE_NON_VALIDO: 'PR003',
  CODICE_SCADUTO: 'PR004',
  TROPPI_TENTATIVI: 'PR005',
  ACCESSO_RICHIESTO: 'PR006',
  INVIO_CODICE_FALLITO: 'PR007',
  VERIFICA_FALLITA: 'PR008',
  /** IP2: si cambia un asse o l'altro, ma una richiesta vuota non è un cambio. */
  PRIVACY_SENZA_MODIFICHE: 'PR009',
  /** Bloccare sé stessi non significa niente, e la riga vieterebbe di vedersi. */
  BLOCCO_DI_SE_STESSI: 'PR010',
} as const;

export type ProfiloErrorCode = (typeof ProfiloErrorCode)[keyof typeof ProfiloErrorCode];
