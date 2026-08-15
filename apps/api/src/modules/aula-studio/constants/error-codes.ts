/**
 * Codici errore del contesto Aula studio (AS001-AS999).
 * Solo localizzatori: vedi profilo/constants/error-codes.ts per la convenzione.
 */
export const AulaStudioErrorCode = {
  NOT_FOUND: 'AS001',
  TITOLO_VUOTO: 'AS002',
  DATA_NEL_PASSATO: 'AS003',
  /** Il gesto è di moderazione e chi lo chiede non modera. */
  NON_SEI_MODERATORE: 'AS004',
  NON_SEI_PARTECIPANTE: 'AS005',
  /** AS2: l'ultimo moderatore non si rimuove né si retrocede. */
  ULTIMO_MODERATORE: 'AS006',
  /** Un'aula con materiali dentro non si elimina con un gesto. */
  AULA_NON_VUOTA: 'AS007',
  INVITO_NOT_FOUND: 'AS008',
  INVITO_SCADUTO: 'AS009',
  /** IA1: gli stati conclusivi sono terminali. */
  INVITO_GIA_CHIUSO: 'AS010',
  INVITO_DI_UN_ALTRO: 'AS011',
  AMMISSIONE_NEGATA: 'AS012',
  /** AL3: l'argomento non esiste o non è di questa aula. */
  ARGOMENTO_NON_VALIDO: 'AS013',
  ALLEGATO_NOT_FOUND: 'AS014',
  /** AL1: le stesse regole di B3, enunciate di nuovo in questo contesto. */
  FILE_NON_VALIDO: 'AS015',
  /** AL4: il permesso di caricare si legge fresco, nell'istante del gesto. */
  NON_PUOI_CARICARE: 'AS016',
  /** Due gesti concorrenti sullo stesso insieme di partecipanti. */
  CONFLITTO_DI_VERSIONE: 'AS017',
  /** MA2: il permesso di scrivere si legge fresco, nell'istante dell'invio. */
  NON_PUOI_SCRIVERE: 'AS018',
  MESSAGGIO_VUOTO: 'AS019',
  /** AS9: si colloca un'aula solo in un gruppo di cui si fa parte adesso. */
  COLLOCAZIONE_NEGATA: 'AS020',
} as const;

export type AulaStudioErrorCode =
  (typeof AulaStudioErrorCode)[keyof typeof AulaStudioErrorCode];
