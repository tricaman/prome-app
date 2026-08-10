import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Wordmark } from './wordmark';

export interface LogoProps {
  /** `completo` = segno + scritta; `simbolo` = solo il segno. */
  variante?: 'completo' | 'simbolo';
  /** Altezza del segno in pixel; la scritta si adegua. */
  dimensione?: number;
  className?: string;
}

/**
 * Marchio di Prome: il segno circolare e la scritta storici del prodotto,
 * non ridisegnati.
 *
 * La scritta eredita `currentColor`, quindi lo stesso componente sta su fondo
 * chiaro e su fondo scuro: basta impostare il colore del testo del contenitore.
 */
export function Logo({ variante = 'completo', dimensione = 30, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/logo-prome.svg"
        alt=""
        width={dimensione}
        height={dimensione}
        priority
        className="flex-none"
      />
      {variante === 'completo' ? (
        <Wordmark aria-hidden style={{ height: dimensione * 0.62 }} className="w-auto" />
      ) : null}
      <span className="sr-only">Prome</span>
    </span>
  );
}
