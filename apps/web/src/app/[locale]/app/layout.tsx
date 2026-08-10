import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

/**
 * Radice dell'area privata.
 *
 * Rimette nel contesto i testi dell'applicazione, che il layout del sito
 * lascia fuori di proposito: le pagine pubbliche non devono portarsi dietro
 * il vocabolario di aule studio, permessi e impostazioni.
 */
export default async function LayoutApp({ children }: { children: ReactNode }) {
  const messaggi = await getMessages();

  return <NextIntlClientProvider messages={messaggi}>{children}</NextIntlClientProvider>;
}
