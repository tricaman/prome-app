/**
 * Codici errore del contesto Bacheca (BA001-BA999).
 * Solo localizzatori: vedi profilo/constants/error-codes.ts per la convenzione.
 */
export const BachecaErrorCode = {
  POST_NOT_FOUND: 'BA001',

  // Invarianti dell'aggregato Post: sono violazioni di dominio, non di forma,
  // e per questo escono con 422 e non con l'errore di validazione.
  TESTO_VUOTO: 'BA002',
  TESTO_TROPPO_LUNGO: 'BA003',
  ALLEGATO_INCOMPLETO: 'BA004',
  ALLEGATO_DIMENSIONE: 'BA005',

  // Allegati: il percorso fra pre-autorizzazione e creazione del post.
  ALLEGATO_SCONOSCIUTO: 'BA006',
  ALLEGATO_NON_CARICATO: 'BA007',
  ALLEGATO_GIA_USATO: 'BA008',
  TROPPI_ALLEGATI: 'BA009',

  // Post: operazioni oltre la creazione.
  NON_SEI_AUTORE: 'BA010',

  // Commenti.
  COMMENTO_NOT_FOUND: 'BA011',
  COMMENTO_TESTO_VUOTO: 'BA012',
  COMMENTO_TESTO_TROPPO_LUNGO: 'BA013',
  NON_PUOI_MODERARE: 'BA014',
  /** Lettura per la segnalazione: commento inesistente o non visibile, stessa risposta. */
  COMMENTO_NON_VISIBILE: 'BA015',
} as const;

export type BachecaErrorCode = (typeof BachecaErrorCode)[keyof typeof BachecaErrorCode];
