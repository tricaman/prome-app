import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Manrope, Nunito } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { COLORE_MARCHIO, temaScuro } from '@prome/design-tokens';
import { eLinguaSupportata, LINGUE_SUPPORTATE } from '@prome/i18n';
import { creaMetadata } from '@/lib/seo';
import { Providers } from '@/providers/providers';
import { StructuredData } from '@/components/seo/structured-data';
import '../globals.css';

/**
 * Le due famiglie del prodotto: una tonda e pesante per i titoli, che dà il
 * tono accogliente, e una più neutra per il testo corrente, pensata per la
 * lettura lunga. I token le leggono da queste variabili, quindi si cambiano
 * qui una volta sola.
 */
const fontTitoli = Nunito({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-titoli',
  display: 'swap',
});

const fontCorpo = Manrope({
  subsets: ['latin'],
  variable: '--font-corpo',
  display: 'swap',
});

/**
 * I soli gruppi di testi usati dai componenti interattivi del sito pubblico:
 * intestazione, selettore di lingua, avvisi, schermate di errore e stati.
 * Aggiungerne uno qui è necessario solo quando un componente `use client`
 * comincia a leggerlo.
 */
const NAMESPACE_DEL_CLIENT = ['comune', 'errori', 'lingua', 'tema', 'sito', 'validazione'] as const;

/** Genera in anticipo le due versioni linguistiche: pagine statiche e veloci. */
export function generateStaticParams() {
  return LINGUE_SUPPORTATE.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: COLORE_MARCHIO },
    { media: '(prefers-color-scheme: dark)', color: temaScuro.sfondo },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!eLinguaSupportata(locale)) notFound();
  return creaMetadata({ lingua: locale, percorso: '/' });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Una lingua non supportata nell'URL non deve produrre una pagina vuota.
  if (!eLinguaSupportata(locale)) notFound();

  // Rende la lingua nota al rendering statico: senza, la pagina verrebbe
  // generata a ogni richiesta.
  setRequestLocale(locale);

  // Al browser arrivano solo i testi che i componenti interattivi usano
  // davvero. Tutto il resto — le pagine, l'area privata — è reso sul server e
  // non ha ragione di viaggiare: meno peso, e nessun vocabolario dell'app
  // dentro una pagina pubblica. Il sottoalbero `/app` rimette i propri.
  const tutti = await getMessages();
  const messaggiDelClient = Object.fromEntries(
    NAMESPACE_DEL_CLIENT.map((namespace) => [namespace, tutti[namespace]]),
  );

  return (
    <html
      lang={locale}
      className={`${fontTitoli.variable} ${fontCorpo.variable} h-full`}
      // Il tema viene applicato dal browser prima dell'idratazione: la
      // differenza sull'attributo di classe è attesa.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messaggiDelClient}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <StructuredData lingua={locale} />
      </body>
    </html>
  );
}
