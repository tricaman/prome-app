/**
 * Forma dei contenuti del sito pubblico.
 *
 * I nomi seguono il linguaggio del dominio (Aula studio, Argomento, Allegato,
 * Partecipante): quando questi contenuti arriveranno dall'API, i tipi
 * cambieranno provenienza ma non nome, e le pagine resteranno com'erano.
 */

export type Visibilita = 'Privato' | 'Ateneo' | 'Pubblico';

export type StatoAulaStudio = 'in-corso' | 'programmata' | 'terminata';

export type TipoAllegato = 'pdf' | 'immagine' | 'testo';

export interface Corso {
  nome: string;
  studenti: number;
  auleStudio: number;
}

export interface Ateneo {
  slug: string;
  nome: string;
  /** Forma breve usata nei badge e nelle liste strette. */
  nomeBreve: string;
  citta: string;
  /** Testo redazionale: è ciò che distingue un hub da una lista di link. */
  descrizione: string;
  statistiche: {
    studenti: number;
    auleStudioMese: number;
    materiali: number;
    gruppi: number;
  };
  corsi: readonly Corso[];
}

export interface Argomento {
  slug: string;
  nome: string;
  sommario: string;
  /** Paragrafi redazionali: "come si studia questa materia". */
  introduzione: readonly string[];
  sottoArgomenti: readonly string[];
  collegati: readonly string[];
  conteggi: { post: number; materiali: number; auleStudio: number; atenei: number };
}

export interface Allegato {
  nome: string;
  tipo: TipoAllegato;
  dimensione: string;
  caricatoDa: string;
  /** Dettaglio aggiuntivo, es. numero di pagine. */
  dettaglio?: string;
  download?: number;
}

export interface Guida {
  slug: string;
  titolo: string;
  sommario: string;
  categoria: string;
  minutiLettura: number;
  data: string;
  dataIso: string;
  autore: string;
  /** In evidenza: una sola guida per volta, in cima all'indice. */
  inEvidenza?: boolean;
  corpo?: readonly BloccoArticolo[];
}

/** Un articolo è una sequenza di blocchi: il testo non è mai un'unica stringa. */
export type BloccoArticolo =
  | { tipo: 'occhiello'; testo: string }
  | { tipo: 'paragrafo'; testo: string }
  | { tipo: 'titolo'; testo: string }
  | { tipo: 'citazione'; testo: string }
  | { tipo: 'punti'; punti: readonly { titolo: string; testo: string }[] };
