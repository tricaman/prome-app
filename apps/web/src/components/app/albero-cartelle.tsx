'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ALBERO_GRUPPO } from '@/content';
import { Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Profondità massima consentita dal dominio. */
const LIVELLI_MASSIMI = 5;

/**
 * Albero delle cartelle di un gruppo.
 *
 * Il rientro dice la profondità, e il promemoria in fondo dice quanto si può
 * ancora scendere: il limite di cinque livelli è una regola del dominio, e
 * scoprirla solo quando la creazione fallisce sarebbe una piccola beffa.
 */
export function AlberoCartelle() {
  const t = useTranslations('app.gruppo');
  const [attiva, setAttiva] = useState(
    ALBERO_GRUPPO.find((nodo) => nodo.attiva)?.nome ?? ALBERO_GRUPPO[0]?.nome,
  );

  const livelloCorrente =
    ALBERO_GRUPPO.find((nodo) => nodo.nome === attiva)?.livello ?? 0;

  return (
    <div className="w-60 flex-none border-r border-bordo bg-superficie px-3.5 py-4">
      <p className="px-2 pb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-testo-debole">
        {t('albero')}
      </p>

      <ul>
        {ALBERO_GRUPPO.map((nodo) => {
          const selezionata = nodo.nome === attiva;
          return (
            <li key={nodo.nome}>
              <button
                type="button"
                onClick={() => setAttiva(nodo.nome)}
                aria-current={selezionata ? 'true' : undefined}
                style={{ paddingLeft: 8 + nodo.livello * 14 }}
                className={cn(
                  'mb-px flex w-full items-center gap-2 rounded-[10px] py-2 pr-2 text-left transition-colors',
                  selezionata ? 'bg-tinta-menta' : 'hover:bg-superficie-alt-2',
                )}
              >
                <Icona
                  nome="cartella"
                  dimensione={15}
                  className={selezionata ? 'text-primario-collegamento' : 'text-testo-debole'}
                />
                <span
                  className={cn(
                    'truncate text-[12.5px]',
                    selezionata ? 'font-extrabold text-primario-accento' : 'font-semibold text-testo-tenue',
                  )}
                >
                  {nodo.nome}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="mt-3 w-full rounded-xl border-[1.5px] border-dashed border-bordo-forte px-3 py-2.5 text-xs font-extrabold text-testo-tenue transition-colors hover:border-primary-300 hover:text-primario-collegamento"
      >
        + {t('nuovaCartella')}
      </button>

      <p className="mt-3 px-2 text-[11px] leading-snug text-testo-debole">
        {t('profondita', { livello: Math.min(livelloCorrente + 1, LIVELLI_MASSIMI) })}
      </p>
    </div>
  );
}
