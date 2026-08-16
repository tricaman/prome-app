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

  // Catalogo accademico. Il catalogo è chiuso: un corso che non c'è non si
  // sceglie, e i due casi si distinguono perché a chi li riceve dicono cose
  // diverse — «quel corso non esiste» e «quel corso non si offre più».
  CORSO_NON_TROVATO: 'PR011',
  CORSO_NON_ATTIVO: 'PR012',

  /** Copre insieme «non esiste» e «non è tua»: distinguerli direbbe a chi
   *  indovina gli id che quella notifica esiste per qualcun altro. */
  NOTIFICA_NOT_FOUND: 'PR013',
} as const;

export type ProfiloErrorCode = (typeof ProfiloErrorCode)[keyof typeof ProfiloErrorCode];
