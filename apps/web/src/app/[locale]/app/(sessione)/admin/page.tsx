import { redirect } from '@/i18n/navigazione';
import { linguaDellaRotta } from '@/lib/pagina';
import { percorsiApp } from '@/lib/percorsi-app';

/** `/app/admin` opens on reports: the only list with a promised response time. */
export default async function IngressoAdmin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await linguaDellaRotta(params);

  redirect({ href: percorsiApp.adminSegnalazioni(), locale });
}
