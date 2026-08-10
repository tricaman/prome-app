/**
 * Scale non cromatiche del design system.
 *
 * L'identità visiva di Prome è "soffice e accogliente": raggi generosi,
 * ombre diffuse e poco contrastate, spaziature ampie.
 */

/** Passo base 4px: ogni spaziatura è un multiplo, così i ritmi restano coerenti. */
export const spaziatura = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Raggi ampi: le card sono morbide, i bottoni sono pillole. */
export const raggio = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const tipografia = {
  dimensione: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  /** Interlinea in px, allineata alle dimensioni sopra. */
  interlinea: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 52,
    '6xl': 64,
  },
  peso: {
    normale: '400',
    medio: '500',
    semi: '600',
    grassetto: '700',
    extra: '800',
  },
  famiglia: {
    /** Titoli: grottesca tonda e pesante, il carattere "accogliente". */
    display: 'Nunito',
    /** Testo corrente: più neutra, pensata per la lettura lunga. */
    corpo: 'Manrope',
  },
} as const;

/**
 * Ombre morbide e diffuse: profondità senza bordi duri.
 *
 * Quattro gradini che corrispondono a quattro distanze dal foglio: una scheda
 * appena staccata, un elemento sollevato, un pannello che galleggia, e
 * l'anteprima in primo piano.
 */
export const ombra = {
  sm: {
    css: '0 2px 10px rgb(24 29 37 / 0.04)',
    nativa: { elevation: 1, radius: 5, opacity: 0.05, offsetY: 1 },
  },
  md: {
    css: '0 8px 20px -10px rgb(24 29 37 / 0.25)',
    nativa: { elevation: 3, radius: 10, opacity: 0.12, offsetY: 4 },
  },
  lg: {
    css: '0 20px 44px -22px rgb(24 29 37 / 0.35)',
    nativa: { elevation: 6, radius: 20, opacity: 0.18, offsetY: 10 },
  },
  xl: {
    css: '0 26px 60px -26px rgb(24 29 37 / 0.45)',
    nativa: { elevation: 12, radius: 30, opacity: 0.24, offsetY: 16 },
  },
  /** Alone del colore del marchio, per l'azione principale. */
  marchio: {
    css: '0 10px 24px -12px rgb(21 224 190 / 0.95)',
    nativa: { elevation: 4, radius: 12, opacity: 0.35, offsetY: 6 },
  },
} as const;

/** Durate delle transizioni, in millisecondi. */
export const durata = {
  veloce: 120,
  media: 200,
  lenta: 320,
} as const;

export type Spaziatura = keyof typeof spaziatura;
export type Raggio = keyof typeof raggio;
export type DimensioneTesto = keyof typeof tipografia.dimensione;
export type PesoTesto = keyof typeof tipografia.peso;
export type Ombra = keyof typeof ombra;
