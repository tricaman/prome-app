import { linguaDellaRotta } from '@/lib/pagina';
import { UtentiAdmin } from '@/components/app/admin/utenti-admin';

/** Admin: registered users, newest first. */
export default async function PaginaAdminUtenti({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);

  return <UtentiAdmin />;
}
