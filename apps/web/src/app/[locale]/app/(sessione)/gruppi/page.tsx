import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { ElencoGruppi } from '@/components/app/elenco-gruppi';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.gruppo' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.gruppi(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * L'indice dei gruppi.
 *
 * Non esisteva: la voce di menu «Gruppi» puntava direttamente a uno slug
 * inventato, quindi chi ci arrivava vedeva sempre lo stesso gruppo finto e non
 * aveva modo di raggiungere i propri.
 */
export default async function PaginaGruppi({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.gruppo');

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
        <ElencoGruppi />
      </div>
    </>
  );
}
