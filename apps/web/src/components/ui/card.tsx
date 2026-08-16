import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  /** Elemento HTML da usare: `article`, `li`, `a`… quando la semantica lo chiede. */
  come?: ElementType;
  /** `piena` sta sullo sfondo di pagina, `tenue` dentro un'altra scheda. */
  variante?: 'piena' | 'tenue' | 'menta';
  padding?: 'nessuno' | 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
  /**
   * Il resto passa all'elemento scelto con `come`.
   *
   * Senza, `come` sarebbe mezzo inutile: una scheda resa come collegamento non
   * potrebbe ricevere il proprio `href`, che è il motivo principale per cui si
   * cambia elemento.
   */
  [altro: string]: unknown;
}

const VARIANTI = {
  piena: 'bg-superficie border-bordo shadow-sm',
  tenue: 'bg-superficie-alt border-bordo',
  menta: 'bg-tinta-menta-velo border-tinta-menta-bordo',
} as const;

const PADDING = {
  nessuno: '',
  sm: 'p-5',
  md: 'p-6',
  lg: 'p-7',
} as const;

/**
 * Superficie di base del sito: bordo appena percettibile, angoli morbidi,
 * ombra bassa. È il mattone con cui è costruita ogni pagina, quindi qui non
 * si aggiungono varianti se non ce n'è davvero bisogno.
 */
export function Card({
  come: Elemento = 'div',
  variante = 'piena',
  padding = 'md',
  className,
  children,
  ...resto
}: CardProps) {
  return (
    <Elemento
      {...resto}
      className={cn('rounded-2xl border', VARIANTI[variante], PADDING[padding], className)}
    >
      {children}
    </Elemento>
  );
}

/**
 * Etichetta di sezione: il testo piccolo, maiuscolo e spaziato che apre i
 * riquadri della colonna laterale.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole',
        className,
      )}
    >
      {children}
    </div>
  );
}
