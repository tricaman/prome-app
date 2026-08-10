/**
 * Palette di Prome — ereditata dalla versione precedente del prodotto.
 *
 * Il verde menta del logo (#32E0C4) è il colore primario del marchio e resta
 * invariato: occupa il gradino 500 della rampa `primary`, che per il resto è
 * la scala teal storica. I grigi sono freddi (virano al blu), non neutri.
 */

/** Colore esatto del logo: non modificare. */
export const COLORE_MARCHIO = '#32E0C4';

export type Rampa = Record<
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
  string
>;

/** Menta del marchio: azioni primarie, stati attivi, evidenziazioni. */
export const primary: Rampa = {
  50: '#ECFDFA',
  100: '#DAFCF6',
  200: '#B4F8ED',
  300: '#8FF5E4',
  400: '#6AF1DB',
  500: COLORE_MARCHIO,
  600: '#15E0BE',
  700: '#10A88F',
  800: '#0A705F',
  900: '#053830',
};

/** Grigi freddi: superfici, bordi, testi secondari. */
export const neutral: Rampa = {
  50: '#F8FAFC',
  100: '#F0F2F5',
  200: '#DADFE7',
  300: '#A9B5C6',
  400: '#6C809D',
  500: '#647697',
  600: '#5A6C87',
  700: '#394556',
  800: '#313B49',
  900: '#181D25',
};

/**
 * Superfici e testi del tema scuro.
 *
 * È una scala a sé, non la rampa neutra al contrario: i grigi chiari virano al
 * blu, mentre queste superfici vanno verso il blu notte e restano separate di
 * pochi punti di luminosità, così le card si staccano dallo sfondo senza che
 * il contorno diventi un bordo bianco. I valori vengono dal disegno.
 */
export const scuro = {
  /** Il fondo più profondo: fasce piene, piè di pagina, intestazione dell'aula. */
  fondo: '#0F1319',
  /** Sfondo della pagina e della colonna di navigazione. */
  sfondo: '#14181F',
  /** Appena sollevato: aree di chat, code dei gradienti. */
  velo: '#161C24',
  /** Card, campi, righe in evidenza. */
  superficie: '#1D242E',
  /** Terzo livello: chip neutri, stati premuti. */
  superficieAlta: '#262F3C',
  /** Bordo di ciò che si può toccare. */
  bordoForte: '#2E3A48',

  /** Titoli e testo forte. */
  testo: '#F5F8FA',
  /** Testo corrente. */
  testoCorpo: '#DADFE7',
  /** Testo secondario e paragrafi di supporto. */
  testoTenue: '#A9B5C6',
  /** Didascalie, segnaposto, icone spente. */
  testoDebole: '#8095B0',
  /** Etichette di sezione: il gradino più spento che resta leggibile. */
  testoEtichetta: '#647697',
} as const;

/** Nero del marchio: più morbido del nero puro. */
export const NERO = '#212121';
export const BIANCO = '#FFFFFF';

/** Esito positivo. Distinto dal primario, che segnala azione e non conferma. */
export const success: Rampa = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
};

/** Avviso: giallo caldo già presente nella palette storica (#FFCE30). */
export const warning: Rampa = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FFCE30',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D49100',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
};

/** Errore e azioni distruttive: rosa/rosso della palette storica. */
export const danger: Rampa = {
  50: '#FFF1F2',
  100: '#FFE4E6',
  200: '#FECDD3',
  300: '#FDA4AF',
  400: '#FB7185',
  500: '#F43F5E',
  600: '#E11D48',
  700: '#BE123C',
  800: '#9F1239',
  900: '#881337',
};

/** Informazione: indaco della palette storica. */
export const info: Rampa = {
  50: '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1',
  600: '#4F46E5',
  700: '#4338CA',
  800: '#3730A3',
  900: '#312E81',
};

/**
 * Coppie sfondo/testo decorative: badge dei tipi di file, stati delle aule
 * studio, sfondi degli avatar. Sono tinte, non ruoli semantici: non usarle per
 * comunicare esito o gerarchia, per quello ci sono i ruoli del tema.
 */
export interface CoppiaTinta {
  /** Sfondo pieno della tinta. */
  sfondo: string;
  /** Testo e icone sopra lo sfondo. */
  testo: string;
  /** Versione appena accennata, per fasce e gradienti. */
  velo: string;
  /** Contorno, un gradino più marcato dello sfondo. */
  bordo: string;
}

export const tinte = {
  menta: { sfondo: '#DAFCF6', testo: '#0A705F', velo: '#F4FEFC', bordo: '#B4F8ED' },
  ambra: { sfondo: '#FFF6DC', testo: '#6B5700', velo: '#FFFCF2', bordo: '#FFE9AE' },
  rosa: { sfondo: '#FFE4E8', testo: '#B4213A', velo: '#FFF5F6', bordo: '#FFD4DB' },
  blu: { sfondo: '#DFF0FF', testo: '#1E5AA8', velo: '#F5FAFF', bordo: '#B9D9F5' },
  verde: { sfondo: '#E4F7E4', testo: '#1F6B2A', velo: '#F4FCF4', bordo: '#C9EFC9' },
  neutra: { sfondo: '#F0F2F5', testo: '#5A6C87', velo: '#F7F9FB', bordo: '#DADFE7' },
} as const;

/**
 * Le stesse tinte sul fondo scuro.
 *
 * Su fondo chiaro una tinta è una pasta opaca; su fondo scuro la stessa pasta
 * diventerebbe una macchia slavata. Qui lo sfondo è il colore stesso a bassa
 * opacità — così prende luce dalla superficie sotto e resta trasparente ai
 * bordi arrotondati — mentre il testo sale ai gradini chiari della rampa, che
 * sul fondo scuro hanno il contrasto che i gradini scuri non avrebbero.
 */
export const tinteScure: Record<Tinta, CoppiaTinta> = {
  menta: {
    sfondo: 'rgb(50 224 196 / 0.14)',
    testo: primary[300],
    velo: 'rgb(50 224 196 / 0.07)',
    bordo: 'rgb(50 224 196 / 0.3)',
  },
  ambra: {
    sfondo: 'rgb(255 206 48 / 0.14)',
    testo: warning[300],
    velo: 'rgb(255 206 48 / 0.07)',
    bordo: 'rgb(255 206 48 / 0.28)',
  },
  // Il rosa non usa `danger[300]`: sul fondo scuro vira al pesca e si confonde
  // con l'ambra. Questo è il valore del disegno, più freddo e più saturo.
  rosa: {
    sfondo: 'rgb(244 63 94 / 0.16)',
    testo: '#FF8A9B',
    velo: 'rgb(244 63 94 / 0.08)',
    bordo: 'rgb(244 63 94 / 0.3)',
  },
  blu: {
    sfondo: 'rgb(99 102 241 / 0.18)',
    testo: info[300],
    velo: 'rgb(99 102 241 / 0.08)',
    bordo: 'rgb(99 102 241 / 0.32)',
  },
  verde: {
    sfondo: 'rgb(16 185 129 / 0.16)',
    testo: success[300],
    velo: 'rgb(16 185 129 / 0.08)',
    bordo: 'rgb(16 185 129 / 0.3)',
  },
  // La neutra è l'unica opaca: è il chip "senza colore", e deve leggersi come
  // una superficie, non come un velo su ciò che ha sotto.
  neutra: {
    sfondo: scuro.superficieAlta,
    testo: scuro.testoTenue,
    velo: scuro.superficie,
    bordo: scuro.bordoForte,
  },
};

export type Tinta = keyof typeof tinte;

/**
 * Riempimenti decorativi: avatar e pastiglie che stanno al posto di una foto.
 *
 * **Non cambiano col tema.** Nel disegno un avatar resta pastello anche di
 * notte: è un elemento colorato, non una superficie, e spegnerlo lo farebbe
 * sparire dentro la card. Sopra ci va sempre un testo scuro, in tutti e due i
 * temi, ed è il motivo per cui il colore del testo è fissato qui accanto.
 */
export const riempimenti = ['#B4F8ED', '#FFE9AE', '#DADFE7', '#DAFCF6', '#B9D9F5'] as const;

/** Testo sopra un riempimento decorativo: scuro sempre, perché il fondo è chiaro sempre. */
export const RIEMPIMENTO_TESTO = neutral[900];

/** Grigi intermedi del sito pubblico, tra i gradini della rampa neutra. */
export const BORDO_TENUE = '#E6EAF0';
export const SUPERFICIE_TENUE = '#F7F9FB';
export const SUPERFICIE_INCASSATA = '#EDF0F4';

export const colori = {
  primary,
  neutral,
  success,
  warning,
  danger,
  info,
  nero: NERO,
  bianco: BIANCO,
} as const;

export type Colori = typeof colori;
