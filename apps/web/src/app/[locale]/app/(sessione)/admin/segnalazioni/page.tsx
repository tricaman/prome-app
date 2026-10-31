import { linguaDellaRotta } from '@/lib/pagina';
import { SegnalazioniAdmin } from '@/components/app/admin/segnalazioni-admin';

/** Admin: reports, newest first. */
export default async function PaginaAdminSegnalazioni({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);

  return <SegnalazioniAdmin />;
}
