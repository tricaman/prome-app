import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TonoChip = 'neutro' | 'menta' | 'ambra' | 'rosa' | 'blu' | 'verde';

export interface ChipProps {
  /** Il tono racconta lo stato, non decora: menta = in corso, ambra = programmata. */
  tono?: TonoChip;
  dimensione?: 'sm' | 'md';
  /** Pallino colorato prima del testo, per gli stati. */
  indicatore?: boolean;
  /** Fa pulsare l'indicatore: solo per ciò che sta accadendo adesso. */
  pulsante?: boolean;
  className?: string;
  children: ReactNode;
}

const TONI: Record<TonoChip, string> = {
  neutro: 'bg-superficie-alt-2 text-testo-tenue',
  menta: 'bg-tinta-menta text-tinta-menta-testo',
  ambra: 'bg-tinta-ambra text-tinta-ambra-testo',
  rosa: 'bg-tinta-rosa text-tinta-rosa-testo',
  blu: 'bg-tinta-blu text-tinta-blu-testo',
  verde: 'bg-tinta-verde text-tinta-verde-testo',
};

const DIMENSIONI = {
  sm: 'px-2.5 py-[5px] text-[10.5px]',
  md: 'px-3 py-1.5 text-[11.5px]',
} as const;

/** Etichetta compatta: stato, visibilità, categoria. */
export function Chip({
  tono = 'neutro',
  dimensione = 'sm',
  indicatore = false,
  pulsante = false,
  className,
  children,
}: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-1.5 rounded-full font-extrabold uppercase tracking-[0.02em]',
        TONI[tono],
        DIMENSIONI[dimensione],
        className,
      )}
    >
      {indicatore ? (
        <span
          aria-hidden
          className={cn(
            'size-1.5 rounded-full bg-current',
            // L'animazione segnala "adesso"; chi ha chiesto meno movimento
            // al sistema la vede ferma (regola globale in globals.css).
            pulsante && 'animate-pulse',
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
