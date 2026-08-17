import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { LeTueAule } from '@/components/app/attivita/le-tue-aule';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.profilo' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.mieAule(),
    titolo: t('tueAule'),
    noIndex: true,
  });
}

/**
 * Le proprie aule studio: `GET /aule-studio` risponde già «quelle di cui faccio parte».
 */
export default async function PaginaLeTueAule({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.profilo');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('tueAule')}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <LeTueAule />
      </div>
    </>
  );
}
