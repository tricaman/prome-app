import type { MetadataRoute } from 'next';
import { LINGUE_SUPPORTATE } from '@prome/i18n';
import { lingueAlternative, percorsiPubblici, urlAssoluto } from '@/lib/seo';

/**
 * Una voce per lingua e per percorso, ciascuna con le proprie alternative:
 * i motori di ricerca ricevono l'elenco completo delle traduzioni senza
 * doverle scoprire seguendo i collegamenti.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const aggiornatoIl = new Date();

  return percorsiPubblici().flatMap((percorso) =>
    LINGUE_SUPPORTATE.map((lingua) => ({
      url: urlAssoluto(lingua, percorso),
      lastModified: aggiornatoIl,
      changeFrequency: 'weekly' as const,
      priority: percorso === '/' ? 1 : 0.7,
      alternates: { languages: lingueAlternative(percorso) },
    })),
  );
}
