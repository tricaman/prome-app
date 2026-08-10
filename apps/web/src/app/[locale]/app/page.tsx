import { redirect } from '@/i18n/navigazione';
import { linguaDellaRotta } from '@/lib/pagina';
import { percorsiApp } from '@/lib/percorsi-app';

/**
 * `/app` non è una schermata: chi arriva qui vuole la bacheca, che è il punto
 * di partenza di ogni sessione.
 */
export default async function IngressoApp({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await linguaDellaRotta(params);
  redirect({ href: percorsiApp.bacheca(), locale });
}
