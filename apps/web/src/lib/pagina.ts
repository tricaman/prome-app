import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { eLinguaSupportata, type Lingua } from '@prome/i18n';

/**
 * Preambolo comune a ogni pagina pubblica: convalida la lingua nell'URL e la
 * rende nota al rendering statico.
 *
 * Senza `setRequestLocale` la pagina verrebbe generata a ogni richiesta invece
 * che una volta sola in fase di build; senza il controllo, un prefisso di
 * lingua inventato produrrebbe una pagina vuota invece di un 404.
 */
export async function linguaDellaRotta(params: Promise<{ locale: string }>): Promise<Lingua> {
  const { locale } = await params;
  if (!eLinguaSupportata(locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

/** Come sopra, ma senza registrare la lingua: per `generateMetadata`. */
export async function linguaDeiMetadati(params: Promise<{ locale: string }>): Promise<Lingua> {
  const { locale } = await params;
  if (!eLinguaSupportata(locale)) notFound();
  return locale;
}
