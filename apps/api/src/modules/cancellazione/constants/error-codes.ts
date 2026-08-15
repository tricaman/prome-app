/**
 * Codici errore del contesto CANCELLAZIONE (CA001-CA999).
 *
 * Uno solo, ed è voluto: la richiesta è idempotente (niente «già richiesta»),
 * l'annullamento silenzioso non fallisce, e i guasti d'infrastruttura restano
 * S001. Il codice esiste per l'unico rifiuto che l'utente può incontrare:
 * provare a rientrare quando la grazia è finita.
 */
export const CancellazioneErrorCode = {
  /** Accesso rifiutato: la grazia è finita e la catena è in esecuzione. */
  ACCOUNT_IN_CANCELLAZIONE: 'CA001',
} as const;

export type CancellazioneErrorCode =
  (typeof CancellazioneErrorCode)[keyof typeof CancellazioneErrorCode];
