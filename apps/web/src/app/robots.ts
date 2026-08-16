import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';

/**
 * L'area privata **non** va qui dentro, ed è una scelta.
 *
 * Ogni pagina sotto `/app` dichiara già `noindex`, che è la sola istruzione
 * capace di tenerla fuori dall'indice. Vietarne anche la scansione otterrebbe
 * l'opposto: un crawler che non può leggere la pagina non può nemmeno leggere
 * il `noindex`, e l'indirizzo finirebbe fra i risultati come voce cieca, senza
 * titolo. Le due istruzioni non si sommano — la seconda annulla la prima.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Rotte tecniche: non c'è nulla da indicizzare.
      disallow: ['/api/'],
    },
    sitemap: `${config.urlSito}/sitemap.xml`,
    host: config.urlSito,
  };
}
