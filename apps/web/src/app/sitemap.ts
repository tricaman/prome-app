import type { MetadataRoute } from 'next';
import { LINGUE_SUPPORTATE } from '@prome/i18n';
import { lingueAlternative, paginePubbliche, urlAssoluto } from '@/lib/seo';

/**
 * Una voce per lingua e per percorso, ciascuna con le proprie alternative:
 * i motori di ricerca ricevono l'elenco completo delle traduzioni senza
 * doverle scoprire seguendo i collegamenti.
 *
 * Priorità e frequenza le dichiara `paginePubbliche()`, che sa cosa è una
 * pagina e cosa cambia: dare a tutto lo stesso valore equivale a non dare
 * nessuna informazione, e una sitemap che dichiara sette guide ferme come
 * «aggiornate oggi» insegna a un crawler a non fidarsi delle nostre date.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const oggi = new Date();

  return paginePubbliche().flatMap((pagina) =>
    LINGUE_SUPPORTATE.map((lingua) => ({
      url: urlAssoluto(lingua, pagina.percorso),
      lastModified: pagina.aggiornataIl ?? oggi,
      changeFrequency: pagina.frequenza,
      priority: pagina.priorita,
      alternates: { languages: lingueAlternative(pagina.percorso) },
    })),
  );
}
