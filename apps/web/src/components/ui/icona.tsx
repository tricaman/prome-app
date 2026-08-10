import { TRACCIATI, type NomeIcona } from '@prome/design-tokens';
import { cn } from '@/lib/utils';

export type { NomeIcona };
export { TRACCIATI };

export interface IconaProps {
  nome: NomeIcona;
  dimensione?: number;
  className?: string;
}

/**
 * Icona a tratto.
 *
 * I tracciati vivono nei token del design system, quindi il sito e l'app
 * disegnano esattamente gli stessi segni: aggiungerne una significa aggiungere
 * un tracciato là, non un file qui.
 */
export function Icona({ nome, dimensione = 20, className }: IconaProps) {
  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('flex-none', className)}
    >
      <path d={TRACCIATI[nome]} />
    </svg>
  );
}
