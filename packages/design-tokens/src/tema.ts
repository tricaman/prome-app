import {
  BIANCO,
  BORDO_TENUE,
  danger,
  info,
  neutral,
  NERO,
  primary,
  scuro,
  success,
  SUPERFICIE_TENUE,
  warning,
} from './colori';

/**
 * Ruoli semantici del tema: è QUESTO che l'interfaccia usa, mai la rampa
 * grezza. Cambiando una rampa cambiano insieme tutti i temi, e i due client
 * restano allineati perché leggono le stesse chiavi.
 *
 * I ruoli coprono anche ciò che serve ai componenti del design system web
 * (superfici, campi, sovrapposizioni), così il tema generato è completo e non
 * lascia buchi da riempire a mano nel CSS.
 */
export interface Tema {
  /** Sfondo della pagina. */
  sfondo: string;
  /** Titoli e testo forte. */
  testo: string;
  /** Testo corrente: paragrafi, voci di elenco, righe di tabella. */
  testoCorpo: string;
  /** Testo secondario: sommari, testi di supporto. */
  testoTenue: string;
  /** Didascalie e metadati: più leggero del secondario, ancora leggibile. */
  testoDidascalia: string;
  /** Testo disabilitato o segnaposto. */
  testoDebole: string;

  /** Superficie sollevata: card, barre, pannelli. */
  superficie: string;
  /** Secondo livello di superficie: hover, righe alternate, chip neutri. */
  superficieAlt: string;
  /** Terzo livello: stati premuti, sfondi annidati. */
  superficieAlt2: string;
  /** Superficie di modali, menu e fogli (sopra tutto il resto). */
  sovrapposizione: string;

  /**
   * Blocco che sta al posto di un'immagine non ancora caricata. Segue il tema
   * — a differenza dei riempimenti decorativi — perché occupa aree grandi:
   * un rettangolo chiaro dentro una pagina scura si legge come un errore.
   */
  segnaposto: string;
  /** Fine del gradiente del segnaposto. */
  segnapostoFondo: string;

  /**
   * Fascia scura che resta scura anche nel tema chiaro: piè di pagina, barra
   * dell'audio, intestazione dell'aula. Nel tema scuro non sparisce, scende:
   * diventa il gradino più profondo, altrimenti si confonderebbe con le card.
   */
  superficieInversa: string;
  /** Testo sopra la fascia scura. */
  superficieInversaTesto: string;
  /** Testo secondario sopra la fascia scura. */
  superficieInversaTenue: string;
  /** Etichette e note di servizio sopra la fascia scura. */
  superficieInversaDebole: string;
  /** Divisori dentro la fascia scura. */
  superficieInversaBordo: string;

  /** Sfondo dei campi di input: leggermente incassato rispetto alla superficie. */
  campo: string;
  /** Testo digitato nei campi. */
  campoTesto: string;
  /** Testo segnaposto nei campi. */
  campoSegnaposto: string;

  /** Bordi delle superfici e divisori: appena percettibili. */
  bordo: string;
  /** Bordo di ciò che si può toccare (campi, bottoni secondari): più marcato. */
  bordoForte: string;

  /** Colore d'azione del marchio. */
  primario: string;
  /** Testo e icone sopra il primario (il menta richiede testo scuro). */
  primarioTesto: string;
  /** Sfondo tenue del primario: badge, stati attivi, evidenziazioni. */
  primarioTenue: string;
  /**
   * Testo del marchio sullo sfondo della pagina: titoletti, numeri, icone.
   * Sul chiaro è un menta scurito perché il menta puro non regge; sullo scuro
   * è il menta stesso, che lì ha tutto il contrasto che serve.
   */
  primarioAccento: string;
  /** Collegamenti testuali: un gradino più chiaro dell'accento. */
  primarioCollegamento: string;

  successo: string;
  successoTesto: string;
  successoTenue: string;

  avviso: string;
  avvisoTesto: string;
  avvisoTenue: string;

  errore: string;
  erroreTesto: string;
  erroreTenue: string;

  info: string;
  infoTesto: string;
  infoTenue: string;

  /** Velo dietro modali e fogli. */
  velo: string;
}

export const temaChiaro: Tema = {
  sfondo: SUPERFICIE_TENUE,
  testo: neutral[900],
  testoCorpo: neutral[700],
  testoTenue: neutral[600],
  testoDidascalia: neutral[400],
  testoDebole: neutral[300],

  superficie: BIANCO,
  superficieAlt: SUPERFICIE_TENUE,
  superficieAlt2: neutral[100],
  sovrapposizione: BIANCO,

  segnaposto: neutral[200],
  segnapostoFondo: neutral[300],

  superficieInversa: neutral[900],
  superficieInversaTesto: BIANCO,
  superficieInversaTenue: neutral[300],
  superficieInversaDebole: neutral[500],
  superficieInversaBordo: neutral[800],

  campo: BIANCO,
  campoTesto: neutral[900],
  campoSegnaposto: neutral[300],

  bordo: BORDO_TENUE,
  bordoForte: neutral[200],

  primario: primary[500],
  primarioTesto: primary[900],
  primarioTenue: primary[50],
  primarioAccento: primary[800],
  primarioCollegamento: primary[700],

  successo: success[600],
  successoTesto: BIANCO,
  successoTenue: success[50],

  avviso: warning[300],
  avvisoTesto: NERO,
  avvisoTenue: warning[50],

  errore: danger[600],
  erroreTesto: BIANCO,
  erroreTenue: danger[50],

  info: info[600],
  infoTesto: BIANCO,
  infoTenue: info[50],

  velo: 'rgb(24 29 37 / 0.45)',
};

/**
 * Tema scuro, dai valori del disegno.
 *
 * Le superfici non sono la rampa neutra rovesciata ma la scala `scuro`, che
 * sale a scatti brevi: sfondo, velo, superficie, superficie alta. È ciò che
 * permette a una card di staccarsi dallo sfondo con un bordo appena visibile
 * invece che con una riga chiara.
 *
 * Gli stati (successo, avviso, errore) salgono di due gradini rispetto al
 * chiaro e il loro testo scende al gradino scuro: sul fondo notte un rosso 600
 * sarebbe illeggibile, e il testo bianco sopra un 400 lo sarebbe altrettanto.
 */
export const temaScuro: Tema = {
  sfondo: scuro.sfondo,
  testo: scuro.testo,
  testoCorpo: scuro.testoCorpo,
  testoTenue: scuro.testoTenue,
  testoDidascalia: scuro.testoDebole,
  testoDebole: scuro.testoEtichetta,

  superficie: scuro.superficie,
  superficieAlt: scuro.velo,
  superficieAlt2: scuro.superficieAlta,
  sovrapposizione: scuro.superficie,

  segnaposto: neutral[800],
  segnapostoFondo: neutral[900],

  // Nel chiaro la fascia è più scura di tutto; nello scuro è il fondo, cioè
  // ancora il punto più profondo della pagina. Il ruolo non si capovolge, e i
  // testi che ci stanno sopra sono gli stessi nei due temi: cambia il fondo,
  // non ciò che ci scriviamo.
  superficieInversa: scuro.fondo,
  superficieInversaTesto: scuro.testo,
  superficieInversaTenue: neutral[300],
  superficieInversaDebole: neutral[500],
  superficieInversaBordo: scuro.superficieAlta,

  campo: scuro.superficie,
  campoTesto: scuro.testo,
  campoSegnaposto: scuro.testoDebole,

  bordo: scuro.superficieAlta,
  bordoForte: scuro.bordoForte,

  primario: primary[500],
  primarioTesto: primary[900],
  // Il tenue è il menta stesso a bassa opacità: prende luce dalla superficie
  // sotto, così funziona sia sullo sfondo sia dentro una card.
  primarioTenue: 'rgb(50 224 196 / 0.14)',
  primarioAccento: primary[500],
  primarioCollegamento: primary[500],

  successo: success[400],
  successoTesto: neutral[900],
  successoTenue: 'rgb(16 185 129 / 0.16)',

  avviso: warning[300],
  avvisoTesto: NERO,
  avvisoTenue: 'rgb(255 206 48 / 0.14)',

  errore: danger[400],
  erroreTesto: neutral[900],
  erroreTenue: 'rgb(244 63 94 / 0.16)',

  info: info[400],
  infoTesto: neutral[900],
  infoTenue: 'rgb(99 102 241 / 0.18)',

  velo: 'rgb(8 11 15 / 0.72)',
};

export const temi = { chiaro: temaChiaro, scuro: temaScuro } as const;

export type NomeTema = keyof typeof temi;
