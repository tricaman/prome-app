import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';

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
