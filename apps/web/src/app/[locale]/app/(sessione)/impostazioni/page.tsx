import { redirect } from '@/i18n/navigazione';
import { linguaDellaRotta } from '@/lib/pagina';
import { percorsiApp } from '@/lib/percorsi-app';

/**
 * `/app/impostazioni` non è più una schermata: da quando ogni sezione ha il
 * proprio indirizzo, questa è solo la porta. Si entra dalla privacy, che è la
 * sezione per cui la gente apre le impostazioni più spesso — e l'unica in cui
 * una scelta sbagliata ha conseguenze su chi vede cosa.
 *
 * Il vecchio indirizzo resta valido: era nella colonna di navigazione, nei
 * preferiti e nei collegamenti già mandati, e romperlo per una riorganizzazione
 * interna sarebbe un guasto visibile per chi non c'entra niente.
 */
export default async function IngressoImpostazioni({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await linguaDellaRotta(params);
  redirect({ href: percorsiApp.impostazioniPrivacy(), locale });
}
