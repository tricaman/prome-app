'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SCELTE = ['sistema', 'chiaro', 'scuro'] as const;

type Scelta = (typeof SCELTE)[number];

/** I nomi delle scelte nella lingua del progetto ↔ quelli di `next-themes`. */
const VALORE: Record<Scelta, string> = {
  sistema: 'system',
  chiaro: 'light',
  scuro: 'dark',
};

/** Anteprima di ciascuna scelta: campioni fissi, non seguono il tema in corso. */
const CAMPIONE: Record<Scelta, string> = {
  sistema: 'bg-[linear-gradient(110deg,var(--color-bianco)_50%,var(--color-neutral-900)_50%)]',
  chiaro: 'bg-neutral-100',
  scuro: 'bg-neutral-900',
};

/**
 * Scelta del tema: sistema, chiaro, scuro.
 *
 * Fino al montaggio nessuna voce risulta selezionata. Non è una svista: il
 * tema in corso si conosce solo nel browser, e disegnarne una scelta già presa
 * durante il rendering sul server produrrebbe un riquadro evidenziato che al
 * primo istante salta su un'altra voce.
 */
export function SceltaTema() {
  const t = useTranslations('tema');
  const { theme, setTheme } = useTheme();
  // "Siamo nel browser?" senza effetti: sul server la terza funzione risponde
  // `false`, dopo l'idratazione la seconda risponde `true`. Il negozio non ha
  // nulla da notificare, quindi l'iscrizione non fa niente.
  const montato = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div role="radiogroup" aria-label={t('etichetta')} className="grid gap-2.5 sm:grid-cols-3">
      {SCELTE.map((scelta) => {
        const attiva = montato && theme === VALORE[scelta];
        return (
          <button
            key={scelta}
            type="button"
            role="radio"
            aria-checked={attiva}
            onClick={() => setTheme(VALORE[scelta])}
            className={cn(
              'rounded-[14px] border-2 p-3 text-left transition-colors',
              attiva
                ? 'border-primary-500 bg-tinta-menta-velo'
                : 'border-bordo bg-superficie hover:border-bordo-forte',
            )}
          >
            <span aria-hidden className={cn('mb-2.5 block h-11 rounded-[9px]', CAMPIONE[scelta])} />
            <span
              className={cn(
                'block text-[13px] font-extrabold',
                attiva ? 'text-primario-accento' : 'text-testo',
              )}
            >
              {t(scelta)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
