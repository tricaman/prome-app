import { linguaDellaRotta } from '@/lib/pagina';
import { PostAdmin } from '@/components/app/admin/post-admin';

/** Admin: every post, newest first. */
export default async function PaginaAdminPost({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);

  return <PostAdmin />;
}
