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

  /**
   * Le impostazioni di chi si vuole invitare non ammettono il contatto.
   *
   * 403 e non 404: chi lo riceve **sta già guardando quella persona** in una
   * sala che può aprire, quindi non c'è alcuna esistenza da nascondere — e
   * dirle «non esiste» sarebbe una bugia visibile a occhio nudo.
   */
  NON_CONTATTABILE: 'AS021',

  /**
   * Si chiede di entrare in audiochat senza il Permesso di Parlare.
   *
   * 403 e non 404: l'aula esiste e chi chiede ci è dentro — sta guardando la
   * sala. Non c'è nessuna esistenza da nascondere, solo un permesso che non
   * c'è, e che un moderatore può concedere.
   */
  NON_PUOI_PARLARE: 'AS022',

  /**
   * L'audiochat non è disponibile: nessun fornitore configurato, oppure il
   * nodo non risponde.
   *
   * 503 e non 500, perché **non è un guasto dell'aula** (RE4): tutto il resto
   * continua a funzionare, e il codice dice al client di mostrare la sala
   * senza la voce invece di una schermata di errore.
   */
  AUDIOCHAT_NON_DISPONIBILE: 'AS023',
} as const;

export type AulaStudioErrorCode =
  (typeof AulaStudioErrorCode)[keyof typeof AulaStudioErrorCode];
