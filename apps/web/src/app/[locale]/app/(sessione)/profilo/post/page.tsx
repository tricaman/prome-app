import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { ITuoiPost } from '@/components/app/attivita/i-tuoi-post';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.profilo' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.mieiPost(),
    titolo: t('tuoiPost'),
    noIndex: true,
  });
}

/**
 * I propri post: la bacheca con `?soloMiei=true`, non una risorsa nuova.
 */
export default async function PaginaITuoiPost({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.profilo');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('tuoiPost')}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ITuoiPost />
      </div>
    </>
  );
}
