'use client';

import { useTranslations } from 'next-intl';
import { useElencaAuleStudio } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { Card, Chip } from '@/components/ui';

/**
 * Le proprie aule, di lato alla bacheca.
 *
 * Se non ce ne sono il riquadro non compare: uno spazio vuoto con un titolo
 * sopra racconta che manca qualcosa, non che non c'è ancora nulla.
 */
export function AuleInCorsoLaterale() {
  const t = useTranslations('app.feed');
  const aule = useElencaAuleStudio({ limit: 3 });

  const elenco = aule.data?.data ?? [];
  if (!elenco.length) return null;

  return (
    <Card padding="sm">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
          {t('auleOra')}
        </span>
        <Link
          href={percorsiApp.auleStudio()}
          className="text-[11.5px] font-extrabold text-primario-collegamento"
        >
          {t('tutte')}
        </Link>
      </div>
      <ul className="flex flex-col gap-3.5">
        {elenco.map((aula) => (
          <li key={aula.id} className="flex items-start gap-3">
            <span aria-hidden className="mt-1.5 size-2 flex-none rounded-full bg-primary-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold leading-snug text-testo">
                {aula.titolo}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-testo-didascalia">
                {aula.partecipanti === 1 ? '1' : aula.partecipanti} ·{' '}
                {aula.visibilita.charAt(0) + aula.visibilita.slice(1).toLowerCase()}
              </span>
            </span>
            <Link href={percorsiApp.aulaStudio(aula.id)} className="flex-none">
              <Chip tono="menta" className="normal-case">
                {t('entra')}
              </Chip>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
