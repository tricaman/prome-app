/**
 * Configurazione dell'applicazione web.
 *
 * I valori pubblici arrivano dalle variabili `NEXT_PUBLIC_*`, che Next inserisce
 * nel bundle al momento della build. I default rendono l'app avviabile appena
 * clonata, senza file di ambiente.
 */
export const config = {
  /** Origine pubblica del sito: base di URL canonici, sitemap e anteprime. */
  urlSito: process.env.NEXT_PUBLIC_URL_SITO ?? 'https://prome.app',
  /** Origine dell'API. */
  urlApi: process.env.NEXT_PUBLIC_URL_API ?? 'http://localhost:3600',
  /** Nome del prodotto, usato nei titoli e nei dati strutturati. */
  nome: 'Prome',
  /**
   * Chi c'è dietro.
   *
   * Non è un dato di contorno: Prome è un progetto di una persona sola, e per
   * un motore di ricerca l'entità «Marius Trica» e l'entità «Prome» si
   * rafforzano a vicenda solo se sono dichiarate insieme e sempre allo stesso
   * modo — nei metadati di ogni pagina, nel grafo dei dati strutturati e nella
   * firma delle guide. Scritto qui una volta, non sette.
   */
  autore: {
    nome: 'Marius Trica',
    ruolo: 'Fondatore e sviluppatore di Prome',
    citta: 'Brescia',
    paese: 'IT',
  },
} as const;
