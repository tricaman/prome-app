import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { TestataPannello } from '@/components/app/testata-pannello';
import { SceltaTema } from '@/components/app/scelta-tema';
import { Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.impostazioni' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.impostazioniAspetto(),
    titolo: `${t('aspetto')} · ${t('titolo')}`,
    noIndex: true,
  });
}

/**
 * Aspetto.
 *
 * Il sommario dice «su questo browser» e non «su tutti i tuoi dispositivi»
 * come voleva il disegno: la scelta sta in `localStorage`, quindi non viaggia.
 * Prometterla condivisa sarebbe una promessa che il codice non mantiene, e
 * che nessuno verificherebbe finché non cambia computer.
 */
export default async function PaginaAspetto({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni');

  return (
    <>
      <TestataPannello titolo={t('aspetto')} sommario={t('pannello.aspetto')} />
      <Card padding="md">
        <p className="mb-2.5 text-[14.5px] font-extrabold text-testo">{t('tema')}</p>
        <SceltaTema />
      </Card>
    </>
  );
}
