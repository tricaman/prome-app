/**
 * Contenuti del sito, con in più gli indirizzi pubblici.
 *
 * I dati e le ricerche vivono nel pacchetto condiviso, perché sono gli stessi
 * dell'app mobile; qui si aggiunge soltanto ciò che è proprio del web, cioè
 * come si costruisce un URL.
 */
export * from '@prome/contenuti';

/**
 * Indirizzi del sito pubblico: un solo punto che costruisce gli URL.
 *
 * Ci sono solo pagine che raccontano il prodotto. I contenuti degli utenti non
 * hanno un indirizzo pubblico, e non devono averlo: si raggiungono dall'app,
 * dopo l'accesso.
 */
export const percorsi = {
  home: () => '/',
  atenei: () => '/atenei',
  ateneo: (slug: string) => `/atenei/${slug}`,
  argomenti: () => '/argomenti',
  argomento: (slug: string) => `/argomenti/${slug}`,
  guide: () => '/guide',
  guida: (slug: string) => `/guide/${slug}`,
  chiSiamo: () => '/chi-siamo',
  privacy: () => '/privacy',
  termini: () => '/termini',
  cookie: () => '/cookie',
  lineeGuida: () => '/linee-guida',
} as const;
