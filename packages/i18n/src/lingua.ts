/**
 * Lingue del prodotto e negoziazione.
 *
 * Regola unica per web e mobile: si parte dalle preferenze del browser o del
 * dispositivo; se nessuna è supportata si ripiega sull'inglese.
 */

export const LINGUE_SUPPORTATE = ['it', 'en'] as const;

export type Lingua = (typeof LINGUE_SUPPORTATE)[number];

/** Ripiego quando le preferenze non contengono nessuna lingua supportata. */
export const LINGUA_DI_RIPIEGO: Lingua = 'en';

/** Nome del cookie in cui il web memorizza la scelta esplicita dell'utente. */
export const COOKIE_LINGUA = 'PROME_LINGUA';

export function eLinguaSupportata(valore: unknown): valore is Lingua {
  return typeof valore === 'string' && (LINGUE_SUPPORTATE as readonly string[]).includes(valore);
}

/**
 * Sceglie la lingua da una lista di preferenze in ordine di gradimento
 * (es. `navigator.languages`, i locali del dispositivo, o l'header
 * `Accept-Language` già scomposto). Confronta anche solo la parte primaria,
 * così `it-CH` sceglie l'italiano.
 */
export function negoziaLingua(preferite: readonly (string | null | undefined)[]): Lingua {
  for (const preferita of preferite) {
    if (!preferita) continue;
    const normalizzata = preferita.trim().toLowerCase();
    if (eLinguaSupportata(normalizzata)) return normalizzata;

    const primaria = normalizzata.split('-')[0];
    if (eLinguaSupportata(primaria)) return primaria;
  }
  return LINGUA_DI_RIPIEGO;
}
