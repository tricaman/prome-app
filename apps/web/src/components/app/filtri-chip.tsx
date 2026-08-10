'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FiltriChipProps {
  /** Etichette già tradotte, nell'ordine in cui vanno mostrate. */
  opzioni: readonly string[];
  etichetta: string;
  className?: string;
}

/**
 * Filtri rapidi a pillola.
 *
 * Il filtro attivo è uno solo e resta evidente: sono scorciatoie di lettura,
 * non una ricerca combinata. Quando serviranno filtri componibili avranno un
 * pannello dedicato, non altre pillole.
 */
export function FiltriChip({ opzioni, etichetta, className }: FiltriChipProps) {
  const [attivo, setAttivo] = useState(opzioni[0]);

  return (
    <div role="group" aria-label={etichetta} className={cn('flex flex-wrap gap-2', className)}>
      {opzioni.map((opzione) => {
        const selezionato = opzione === attivo;
        return (
          <button
            key={opzione}
            type="button"
            aria-pressed={selezionato}
            onClick={() => setAttivo(opzione)}
            className={cn(
              'rounded-full border-[1.5px] px-4 py-2 text-[12.5px] font-bold transition-colors',
              selezionato
                ? 'border-primary-500 bg-primario text-primario-testo'
                : 'border-bordo-forte bg-superficie text-testo-tenue hover:border-tinta-menta-bordo',
            )}
          >
            {opzione}
          </button>
        );
      })}
    </div>
  );
}
