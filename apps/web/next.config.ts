import type { NextConfig } from 'next';
import creaPluginNextIntl from 'next-intl/plugin';

const conInternazionalizzazione = creaPluginNextIntl('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // I pacchetti del monorepo arrivano come sorgenti TypeScript: vanno compilati
  // con l'app, non trattati come dipendenze già pronte.
  transpilePackages: ['@prome/app-core', '@prome/api-client', '@prome/contenuti', '@prome/contracts', '@prome/i18n'],
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@heroui/react'],
  },
};

export default conInternazionalizzazione(nextConfig);
