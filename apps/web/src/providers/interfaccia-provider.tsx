'use client';

import type { ReactNode } from 'react';
import { I18nProvider, RouterProvider } from '@heroui/react';
import { useRouter } from '@/i18n/navigazione';

/**
 * Contesto della libreria di interfaccia.
 *
 * - `RouterProvider`: i componenti che navigano (link, menu, schede) usano il
 *   router dell'applicazione, quindi mantengono il prefisso di lingua e non
 *   ricaricano la pagina.
 * - `I18nProvider`: date, numeri e testi di servizio dei componenti seguono la
 *   lingua scelta, e la direzione del testo viene impostata di conseguenza.
 */
export function InterfacciaProvider({
  lingua,
  children,
}: {
  lingua: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <RouterProvider navigate={(percorso) => router.push(percorso)}>
      <I18nProvider locale={lingua}>{children}</I18nProvider>
    </RouterProvider>
  );
}
