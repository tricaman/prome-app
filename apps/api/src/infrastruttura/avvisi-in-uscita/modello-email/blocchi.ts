/**
 * Il vocabolario di cui è fatta un'email di Prome.
 *
 * Chi scrive un'email non scrive HTML: dichiara **quali blocchi** la
 * compongono, e l'involucro decide come si vedono. È la stessa scelta fatta
 * per gli eventi di prodotto — un elenco chiuso invece di una stringa libera —
 * e per lo stesso motivo: con l'HTML a mano, la seconda email somiglia alla
 * prima e la quinta non le somiglia più, e nessun controllo se ne accorge.
 *
 * Dai blocchi si ricavano **entrambe** le versioni del messaggio, HTML e testo
 * semplice. Oggi le due sono scritte a mano una accanto all'altra: basta
 * aggiungere una riga a una sola delle due perché divergano, e chi legge in
 * testo semplice riceve un messaggio incompleto senza che nessuno lo sappia.
 */

/** Un blocco del corpo. L'elenco è chiuso: aggiungerne uno è una decisione. */
export type BloccoEmail =
  | { readonly tipo: 'titolo'; readonly testo: string }
  | { readonly tipo: 'paragrafo'; readonly testo: string }
  | { readonly tipo: 'codice'; readonly valore: string }
  | { readonly tipo: 'azione'; readonly etichetta: string; readonly indirizzo: string }
  | { readonly tipo: 'dettagli'; readonly voci: readonly VoceDiDettaglio[] }
  | { readonly tipo: 'nota'; readonly testo: string }
  | { readonly tipo: 'separatore' };

/** Una riga della tabellina dei dettagli: «Aula studio — Analisi 1». */
export interface VoceDiDettaglio {
  readonly etichetta: string;
  readonly valore: string;
}

/** Il titolo del messaggio, in cima al corpo. Uno solo per email. */
export const titolo = (testo: string): BloccoEmail => ({ tipo: 'titolo', testo });

/** Testo corrente. */
export const paragrafo = (testo: string): BloccoEmail => ({ tipo: 'paragrafo', testo });

/**
 * Un codice da trascrivere a mano.
 *
 * Ha un blocco suo perché va trattato diversamente ovunque: nell'HTML è
 * spaziato e ingrandito, nel testo semplice sta su una riga vuota da solo, e
 * in nessuna delle due deve finire dentro una frase — chi lo copia con il dito
 * su un telefono non deve dover selezionare metà paragrafo.
 */
export const codice = (valore: string): BloccoEmail => ({ tipo: 'codice', valore });

/**
 * L'azione principale del messaggio.
 *
 * Nell'HTML è la pastiglia menta del prodotto; nel testo semplice diventa
 * l'indirizzo per esteso, perché un'etichetta cliccabile senza indirizzo, in
 * un client che non rende l'HTML, è un vicolo cieco.
 */
export const azione = (etichetta: string, indirizzo: string): BloccoEmail => ({
  tipo: 'azione',
  etichetta,
  indirizzo,
});

/** Il riquadro dei dati del messaggio: chi invita, a cosa, entro quando. */
export const dettagli = (voci: readonly VoceDiDettaglio[]): BloccoEmail => ({
  tipo: 'dettagli',
  voci,
});

/**
 * Testo di servizio, più piccolo e più spento: scadenze, «se non sei stato tu,
 * ignora». Non è un paragrafo con un altro stile — è un altro tono, e tenerli
 * distinti evita che il corpo del messaggio si riempia di avvertenze.
 */
export const nota = (testo: string): BloccoEmail => ({ tipo: 'nota', testo });

/** Una riga sottile: separa il messaggio dalle note che lo chiudono. */
export const separatore = (): BloccoEmail => ({ tipo: 'separatore' });

/**
 * Un'email intera, prima di diventare HTML e testo.
 *
 * `anteprima` è la riga che i client mostrano accanto all'oggetto nell'elenco
 * dei messaggi. Non dichiararla non la fa sparire: la riempiono da soli con le
 * prime parole che trovano nel corpo, che nel nostro caso sarebbero «Prome» e
 * il resto dell'intestazione. È obbligatoria perché il valore predefinito è
 * peggiore di qualunque scelta.
 */
export interface ContenutoEmail {
  readonly oggetto: string;
  readonly anteprima: string;
  readonly blocchi: readonly BloccoEmail[];
}
