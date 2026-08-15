import {
  raggio,
  temaChiaro,
  temaScuro,
  tinte,
  tinteScure,
  tipografia,
} from '@prome/design-tokens';

/**
 * Lo stile delle email, derivato dai token del prodotto.
 *
 * **Nessun colore è scritto qui a mano.** Vengono tutti da `@prome/design-tokens`,
 * gli stessi che diventano CSS sul web e oggetto TS sul mobile: cambiare il
 * menta del marchio in un posto solo lo cambia anche nella posta. Se questo
 * file contenesse esadecimali propri, le email sarebbero il primo posto in cui
 * il prodotto smetterebbe di somigliare a sé stesso — e l'ultimo in cui
 * qualcuno se ne accorgerebbe, perché nessuno rilegge un'email già spedita.
 *
 * Ciò che il file fa, invece, è **tradurre i ruoli in ciò che la posta sa
 * rendere**: niente variabili CSS (Outlook non le conosce), niente flexbox,
 * niente unità relative. Solo pixel, esadecimali e tabelle.
 */

/** Larghezza della colonna. 520px sta in tutte le anteprime affiancate. */
export const LARGHEZZA = 520;

/**
 * Pile di caratteri.
 *
 * I due caratteri del prodotto stanno in testa e sono un di più: in posta i
 * font non si possono caricare, quindi li vede solo chi li ha già installati.
 * Ciò che regge il disegno è il ripiego di sistema subito dopo, ed è il motivo
 * per cui i pesi scelti (700/800) esistono in tutte le grottesche di sistema.
 */
const RIPIEGO = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const CARATTERE_TITOLI = `${tipografia.famiglia.display}, ${RIPIEGO}`;
export const CARATTERE_CORPO = `${tipografia.famiglia.corpo}, ${RIPIEGO}`;

/**
 * I due temi, ridotti a ciò che serve a un'email.
 *
 * Sono le stesse chiavi per il chiaro e per lo scuro, e questo non è pignoleria:
 * lo scuro non si dichiara elemento per elemento nell'HTML — si dichiara una
 * volta in `@media (prefers-color-scheme: dark)`, e quel blocco si genera
 * scorrendo le stesse chiavi. Aggiungerne una qui la fa comparire in tutti e
 * due i temi o in nessuno.
 */
export interface PaletteEmail {
  /** Fondo della pagina, attorno alla scheda. */
  sfondo: string;
  /** La scheda che contiene il messaggio. */
  scheda: string;
  /** Contorno della scheda e righe di separazione. */
  bordo: string;
  /** Titolo del messaggio. */
  testo: string;
  /** Testo corrente. */
  corpo: string;
  /** Note, scadenze, piè di pagina. */
  tenue: string;
  /** Etichette dei dettagli e riga del marchio nel piè di pagina. */
  debole: string;
  /** Fondo del riquadro del codice e dei dettagli. */
  riquadro: string;
  /** Il codice stesso, e i collegamenti testuali. */
  accento: string;
}

export const paletteChiara: PaletteEmail = {
  sfondo: temaChiaro.sfondo,
  scheda: temaChiaro.superficie,
  bordo: temaChiaro.bordo,
  testo: temaChiaro.testo,
  corpo: temaChiaro.testoCorpo,
  tenue: temaChiaro.testoTenue,
  debole: temaChiaro.testoDidascalia,
  riquadro: tinte.menta.velo,
  accento: temaChiaro.primarioAccento,
};

export const paletteScura: PaletteEmail = {
  sfondo: temaScuro.sfondo,
  scheda: temaScuro.superficie,
  bordo: temaScuro.bordo,
  testo: temaScuro.testo,
  corpo: temaScuro.testoCorpo,
  tenue: temaScuro.testoTenue,
  debole: temaScuro.testoDidascalia,
  // Sul fondo scuro il velo menta chiaro diventerebbe una macchia bianca: si
  // usa il menta a bassa opacità, che prende luce dalla superficie sotto —
  // esattamente ciò che le tinte scure fanno nell'interfaccia.
  riquadro: tinteScure.menta.velo,
  accento: temaScuro.primarioAccento,
};

/**
 * L'azione principale **non ha una versione scura**, ed è voluto: nel tema
 * scuro del prodotto il bottone primario è lo stesso menta con lo stesso testo
 * verde scurissimo. Un bottone che cambia colore col tema del client sarebbe
 * l'unico elemento del messaggio a non somigliare all'applicazione.
 */
export const azione = {
  sfondo: temaChiaro.primario,
  testo: temaChiaro.primarioTesto,
} as const;

/** Raggi: la scheda è morbida, il bottone è una pastiglia. */
export const RAGGIO_SCHEDA = raggio['2xl'];
export const RAGGIO_RIQUADRO = raggio.lg;
export const RAGGIO_AZIONE = raggio.full;

/** Corpo tipografico, dai gradini del design system. */
export const testo = {
  titolo: { dimensione: tipografia.dimensione['2xl'], interlinea: tipografia.interlinea['2xl'] },
  corpo: { dimensione: tipografia.dimensione.base, interlinea: tipografia.interlinea.base },
  nota: { dimensione: tipografia.dimensione.sm, interlinea: tipografia.interlinea.base },
  piede: { dimensione: tipografia.dimensione.xs, interlinea: tipografia.interlinea.base },
  /** Il codice: grande e spaziato, perché si legge cifra per cifra. */
  codice: { dimensione: tipografia.dimensione['4xl'], interlinea: tipografia.interlinea['4xl'] },
} as const;

export const peso = tipografia.peso;
