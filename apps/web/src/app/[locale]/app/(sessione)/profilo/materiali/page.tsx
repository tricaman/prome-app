import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { MaterialiSalvati } from '@/components/app/attivita/materiali-salvati';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.materialiSalvati' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.materialiSalvati(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * La raccolta personale, da tutte le aule di cui si fa ancora parte.
 */
export default async function PaginaMaterialiSalvati({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.materialiSalvati');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MaterialiSalvati />
      </div>
    </>
  );
}
