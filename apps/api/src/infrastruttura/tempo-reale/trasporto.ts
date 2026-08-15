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

