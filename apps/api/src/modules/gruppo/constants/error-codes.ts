/**
 * Codici errore del contesto Gruppo (GR001-GR999).
 * Solo localizzatori: vedi profilo/constants/error-codes.ts per la convenzione.
 */
export const GruppoErrorCode = {
  /** Inesistente, oppure esistente e non visibile: la risposta è la stessa. */
  NOT_FOUND: 'GR001',
  NOME_VUOTO: 'GR002',
  /** Il gesto è di amministrazione e chi lo chiede non modera il gruppo. */
  NON_SEI_MODERATORE: 'GR003',
  /** G2: l'ultimo moderatore non si rimuove né si retrocede. */
  ULTIMO_MODERATORE: 'GR004',
  MEMBRO_NOT_FOUND: 'GR005',
  NON_SEI_MEMBRO: 'GR006',
  INVITO_NOT_FOUND: 'GR007',
  INVITO_SCADUTO: 'GR008',
  /** IG2: gli stati conclusivi sono terminali. */
  INVITO_GIA_CHIUSO: 'GR009',
  INVITO_DI_UN_ALTRO: 'GR010',
  /** Due gesti concorrenti sullo stesso insieme di membri. */
  CONFLITTO_DI_VERSIONE: 'GR011',
} as const;

export type GruppoErrorCode = (typeof GruppoErrorCode)[keyof typeof GruppoErrorCode];
