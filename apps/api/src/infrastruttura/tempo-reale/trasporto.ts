/**
 * TrasportoInTempoReale — la consegna, e nient'altro.
 *
 * È una porta, non un fornitore: il dominio dichiara *cosa* consegnare e a
 * quale stanza, mai con quale tecnologia.
 *
 * La delimitazione più importante è in negativo: **il trasporto consegna
 * messaggi già accettati e non conosce partecipanti né permessi**. La verifica
 * di chi poteva scrivere è avvenuta prima, dentro il modulo proprietario, su
 * dato fresco. Se il trasporto dovesse decidere qualcosa, la stessa regola
 * vivrebbe in due punti — e uno dei due sarebbe fuori dal dominio.
 *
 * Ne discende anche la degradazione dichiarata: un messaggio è **persistito
 * prima e pubblicato dopo**, quindi con il trasporto spento la conversazione
 * continua a esistere e a essere leggibile. Il tempo reale è un'accelerazione,
 * non il luogo dove i messaggi vivono.
 */
export interface TrasportoInTempoReale {
  /** Consegna a chi è nella stanza. Chi non c'è lo leggerà dalla cronologia. */
  pubblicaInStanza(stanza: string, evento: string, dato: unknown): Promise<void>;

  /**
   * Toglie una persona da una stanza, subito.
   *
   * **Non è una decisione del trasporto**: la decisione è già stata presa dal
   * modulo proprietario — qualcuno ha perso il titolo per stare lì — e qui si
   * esegue soltanto. La riga nel database smette di ammetterlo alla richiesta
   * successiva, ma chi è connesso non ne fa alcuna: continuerebbe a ricevere i
   * messaggi di una conversazione a cui non ha più diritto, e sarebbe una
   * finestra di visibilità indebita aperta per tutta la durata della
   * connessione.
   *
   * Facoltativa come `registraGuardiano`: un adattatore che non ha stanze non
   * ha nessuno da allontanare.
   */
  allontanaDallaStanza?(stanza: string, utenteId: string): Promise<void>;

  /**
   * Il modulo proprietario si presenta come guardiano delle proprie stanze.
   *
   * Si registra a runtime invece di essere iniettato perché il verso opposto
   * esiste già — il modulo pubblica attraverso questa porta — e iniettarlo
   * qui creerebbe un anello fra i due.
   */
  registraGuardiano?(guardiano: GuardianoDellaStanza): void;
}

export const TRASPORTO_TEMPO_REALE = Symbol('TrasportoInTempoReale');

/** Il nome della stanza di un'aula. Un posto solo che lo decide. */
export const stanzaDiAula = (aulaStudioId: string): string => `aula-studio:${aulaStudioId}`;

/**
 * La stanza personale di un utente: dove arrivano i suoi avvisi in tempo
 * reale. Nessun guardiano — l'identità verificata alla connessione È
 * l'ammissione alla propria stanza, e nessuno può chiedere di entrare in
 * quella di un altro perché non esiste un messaggio per farlo.
 */
export const stanzaDiUtente = (utenteId: string): string => `utente:${utenteId}`;

/**
 * Chi può entrare in una stanza.
 *
 * Il trasporto non decide le ammissioni, ma non può nemmeno lasciare che
 * chiunque ascolti: chiede al modulo proprietario, che risponde sul proprio
 * dato. La verifica è di **ammissione**, non di permesso — chi è in sola
 * lettura resta ammesso ad ascoltare.
 */
export interface GuardianoDellaStanza {
  puoAscoltare(utenteId: string, aulaStudioId: string): Promise<boolean>;
}

