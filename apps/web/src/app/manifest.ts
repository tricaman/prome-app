import type { MetadataRoute } from 'next';
import { COLORE_MARCHIO, temaScuro } from '@prome/design-tokens';
import { catalogoDi, LINGUA_DI_RIPIEGO } from '@prome/i18n';
import { config } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  const messaggi = catalogoDi(LINGUA_DI_RIPIEGO);

  return {
    name: messaggi.meta.titolo,
    short_name: messaggi.meta.titoloBreve,
    description: messaggi.meta.descrizione,
    start_url: `/${LINGUA_DI_RIPIEGO}`,
    display: 'standalone',
    background_color: temaScuro.sfondo,
    theme_color: COLORE_MARCHIO,
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png' },
    ],
    id: config.urlSito,
  };
}
