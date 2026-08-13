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
} as const;
