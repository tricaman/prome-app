'use client';

import { cn } from '@/lib/utils';

export interface OpzioneSegmento<T extends string> {
  valore: T;
  etichetta: string;
}

export interface SegmentedProps<T extends string> {
  opzioni: readonly OpzioneSegmento<T>[];
  valore: T;
  /** Etichetta del gruppo: chi usa uno screen reader sente di cosa si tratta. */
  etichetta: string;
  larghezzaPiena?: boolean;
  className?: string;
  onChange: (valore: T) => void;
}

/**
 * Scelta tra poche alternative che si escludono, senza cambiare schermata.
 *
 * Usarlo quando le opzioni sono due o tre e restano visibili tutte: sopra le
 * tre, o quando l'elenco può crescere, serve un menu a tendina.
 */
export function Segmented<T extends string>({
  opzioni,
  valore,
  etichetta,
  larghezzaPiena = false,
  className,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={etichetta}
      className={cn(
        'inline-flex gap-1 rounded-full bg-superficie-alt-2 p-1',
        larghezzaPiena && 'flex w-full',
        className,
      )}
    >
      {opzioni.map((opzione) => {
        const attiva = opzione.valore === valore;
        return (
          <button
            key={opzione.valore}
            type="button"
            role="tab"
            aria-selected={attiva}
            onClick={() => onChange(opzione.valore)}
            className={cn(
              'rounded-full px-5 py-2.5 text-[13.5px] font-extrabold transition-colors',
              larghezzaPiena && 'flex-1',
              attiva
                ? 'bg-superficie text-primario-accento shadow-sm'
                : 'text-testo-tenue hover:text-testo',
            )}
          >
            {opzione.etichetta}
          </button>
        );
      })}
    </div>
  );
}
