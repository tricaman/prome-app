import type { TipoAllegato } from '@prome/contracts';

/** Quanto vale una pre-autorizzazione prima di scadere. */
export const DURATA_PREAUTORIZZAZIONE_SECONDI = 15 * 60;

export interface Preautorizzazione {
  /** Dove mandare i byte. */
  url: string;
  metodo: 'PUT';
  /** Intestazioni obbligatorie del caricamento. */
  intestazioni: Record<string, string>;
  scadeIl: Date;
}

/**
 * ArchivioDiFile — dove finiscono i byte.
 *
 * È una porta, non un fornitore: il dominio dichiara *cosa* archivia e con
 * quale chiave, mai con quale servizio. La scelta del fornitore reale è una
 * decisione di infrastruttura ancora aperta, e questa interfaccia esiste
 * perché arrivi senza toccare la Bacheca.
 *
 * **I byte non attraversano l'API.** Il client chiede una pre-autorizzazione,
 * carica direttamente verso l'archivio e poi comunica l'esito: far transitare
 * 25 MB dal backend significherebbe pagarli due volte in banda e tenere
 * occupato un processo per tutta la durata del caricamento.
 */
export interface ArchivioDiFile {
  /**
   * Autorizza il caricamento di una chiave, per una durata limitata.
   * Non crea nulla: descrive dove e come mandare i byte.
   */
  preautorizzaCaricamento(chiave: string, tipo: TipoAllegato): Promise<Preautorizzazione>;

  /** Vero se i byte sono davvero arrivati. */
  eStatoCaricato(chiave: string): Promise<boolean>;

  /** Indirizzo da cui leggere il file. */
  urlDiLettura(chiave: string): string;

  /** Toglie il file. Usato quando l'aggregato che lo teneva sparisce. */
  rimuovi(chiave: string): Promise<void>;
}

export const ARCHIVIO_DI_FILE = Symbol('ArchivioDiFile');

/**
 * La chiave di archiviazione.
 *
 * Ha per prefisso il **contesto** e il **proprietario logico** — l'allegato —
 * e mai l'identificativo dell'utente: una chiave che contenesse chi ha
 * caricato il file racconterebbe qualcosa sull'utente a chiunque veda un
 * indirizzo, e sopravvivrebbe alla cancellazione dell'account.
 */
export function chiaveAllegato(allegatoId: string, nomeFile: string): string {
  return `bacheca/allegato/${allegatoId}/${nomeSicuro(nomeFile)}`;
}

/**
 * Il nome del file, ridotto a ciò che può stare in una chiave.
 *
 * Non è cosmetica: un nome con `../` o con una barra dentro cambierebbe il
 * percorso di destinazione, e un carattere di controllo può rompere chi legge
 * la chiave più avanti.
 */
export function nomeSicuro(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? 'file';
  const ripulito = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/^[.\-]+/, '')
    .slice(0, 120);
  return ripulito || 'file';
}
