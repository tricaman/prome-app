import { getTranslations } from 'next-intl/server';
import { ARGOMENTI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { Composer } from '@/components/app/composer';
import { FiltriChip } from '@/components/app/filtri-chip';
import { FeedBacheca } from '@/components/app/feed-bacheca';
import { AuleInCorsoLaterale } from '@/components/app/aule-in-corso-laterale';
import { RiquadroLaterale } from '@/components/contenuti';
import { Button, Card, Chip, Heading } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.nav' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.bacheca(),
    titolo: t('bacheca'),
    noIndex: true,
  });
}

/**
 * Bacheca.
 *
 * Tre colonne, una sola lettura: navigazione, contenuti a larghezza di
 * articolo e colonna contestuale. Quella di destra fa il lavoro che il
 * telefono non può fare — mostrare le aule studio in corso *mentre* si legge —
 * ed è da lì che nasce la maggior parte degli ingressi in aula.
 */
export default async function PaginaBacheca({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.feed');

  const filtri = [
    t('filtri.perTe'),
    t('filtri.mioCorso'),
    t('filtri.mioAteneo'),
    t('filtri.mieiGruppi'),
  ];

  return (
    <>
      <AppTopbar conRicerca />

      <div className="flex flex-1 justify-center gap-6 px-5 py-6 sm:px-8">
        <div className="flex w-full max-w-[640px] flex-none flex-col gap-3.5">
          <Composer />
          <FiltriChip opzioni={filtri} etichetta={t('filtri.perTe')} />
          <FeedBacheca />
        </div>

        <aside className="hidden w-[300px] flex-none flex-col gap-4 xl:flex">
          <AuleInCorsoLaterale />

          <RiquadroLaterale titolo={t('argomentiCorso')}>
            <div className="flex flex-wrap gap-2">
              {ARGOMENTI.map((argomento) => (
                <Link key={argomento.slug} href={percorsi.argomento(argomento.slug)}>
                  <Chip dimensione="md" className="normal-case">
                    {argomento.nome}
                  </Chip>
                </Link>
              ))}
            </div>
          </RiquadroLaterale>

          <Card variante="menta" padding="sm">
            <Heading taglia="xs" className="text-tinta-menta-testo">
              {t('appello.titolo', { materia: 'Analisi 2', giorni: 9 })}
            </Heading>
            <p className="mt-2 text-[12.5px] leading-relaxed text-primario-accento">
              {t('appello.testo', { numero: 3 })}
            </p>
            <Button className="mt-3 h-10 w-full justify-center text-[13px]">
              {t('appello.azione')}
            </Button>
          </Card>
        </aside>
      </div>
    </>
  );
}
