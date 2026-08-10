import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { ElencoAule } from '@/components/app/elenco-aule';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.aule' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.auleStudio(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/** Le aule studio a cui la persona può accedere. */
export default async function PaginaAuleApp({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.aule');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />
      <ElencoAule />
    </>
  );
}
