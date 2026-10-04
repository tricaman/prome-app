/**
 * Il catalogo accademico, versionato con il codice.
 *
 * È la **fonte di verità**: il database ne è una copia, riscritta a ogni
 * rilascio da `seminaCatalogo`. Non si scrive con una INSERT sulla macchina,
 * che sparirebbe al primo ripristino e non si vedrebbe in nessuna diff.
 *
 * Il catalogo è **chiuso**: chi fa l'onboarding sceglie da questo elenco e non
 * può scrivere altro. **Un corso che manca qui è una persona che non può
 * entrare in Prome.**
 *
 * ## Where the data comes from
 *
 * `catalogo-mur.json` is generated from the Ministry (MUR) open data by
 * `pnpm --filter @prome/api catalogo:importa` (see
 * `scripts/importa-catalogo-mur.ts`): every university with a degree
 * offering in the latest year, with all its courses. It is not edited by
 * hand: once a year the script runs on the new offering, and the diff shows
 * which courses appeared and which went away (the seed retires the latter).
 *
 * Gli `slug` degli atenei che hanno una pagina pubblica sono gli stessi di
 * `@prome/contenuti`: lo script li fissa per codice ministeriale.
 *
 * ## Sui codici
 *
 * MUR does not publish the university's internal course code, so `codice` is
 * built from class, name and campus (`L-8:ingegneria-informatica:brescia`):
 * unique inside the university and stable from year to year while MUR keeps
 * the three. A renamed course gets a new code, so the old row is retired and
 * a new one appears. `daVerificare` stays for entries added by hand.
 */

import datiMur from './catalogo-mur.json';

export type LivelloDiCorso = 'TRIENNALE' | 'MAGISTRALE' | 'CICLO_UNICO';

export interface ClasseDaSeminare {
  /** Codice ministeriale: identifica la classe nel mondo, non solo qui. */
  codice: string;
  nome: string;
  livello: LivelloDiCorso;
}

export interface CorsoDaSeminare {
  /** Codice dell'ateneo. Unico dentro l'ateneo: è la chiave naturale della semina. */
  codice: string;
  nome: string;
  classeCodice: string;
  durataAnni: number;
  /** Il codice non è stato verificato sul catalogo dell'ateneo. */
  daVerificare?: boolean;
}

export interface UniversitaDaSeminare {
  slug: string;
  nome: string;
  nomeBreve: string;
  citta: string;
  corsi: readonly CorsoDaSeminare[];
}

export interface CatalogoDaSeminare {
  classi: readonly ClasseDaSeminare[];
  universita: readonly UniversitaDaSeminare[];
}


export const CATALOGO: CatalogoDaSeminare = {
  classi: datiMur.classi as readonly ClasseDaSeminare[],
  universita: datiMur.universita,
};
