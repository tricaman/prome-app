import type { NextConfig } from 'next';
import creaPluginNextIntl from 'next-intl/plugin';

const conInternazionalizzazione = creaPluginNextIntl('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // I pacchetti del monorepo arrivano come sorgenti TypeScript: vanno compilati
  // con l'app, non trattati come dipendenze già pronte.
  transpilePackages: ['@prome/app-core', '@prome/api-client', '@prome/contenuti', '@prome/contracts', '@prome/i18n'],
  poweredByHeader: false,
  // Immagine di produzione: Next raccoglie in `.next/standalone` solo i file
  // che servono davvero a servire il sito, con le sole dipendenze usate.
  // Senza, il contenitore si porterebbe dietro l'intero node_modules del
  // monorepo — centinaia di megabyte di roba che non gira mai.
  //
  // Serve però **solo** a chi costruisce l'immagine, ed è una richiesta
  // esplicita: le piattaforme che tracciano i file per conto loro (Vercel)
  // con `standalone` non trovano quello che si aspettano e la build muore
  // dopo aver generato tutte le pagine. Chi vuole l'output autonomo lo dice.
  output: process.env.BUILD_AUTONOMA === '1' ? 'standalone' : undefined,
  experimental: {
    optimizePackageImports: ['@heroui/react'],
  },
};

export default conInternazionalizzazione(nextConfig);
