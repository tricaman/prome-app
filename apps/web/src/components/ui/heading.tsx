import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Livello = 1 | 2 | 3;

export interface HeadingProps {
  /** Livello semantico: decide il tag, non la dimensione. */
  livello?: Livello;
  /** Dimensione visiva, indipendente dal livello semantico. */
  taglia?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  children: ReactNode;
}

/**
 * Titolo del sito: famiglia display, peso 800 e crenatura stretta, che è ciò
 * che dà al prodotto il suo tono.
 *
 * Livello e taglia sono separati di proposito: una pagina deve poter avere un
 * `h2` piccolo senza scendere a `h3`, altrimenti la gerarchia del documento
 * finisce per seguire l'estetica invece del significato.
 */
const TAGLIE = {
  xs: 'text-lg tracking-[-0.02em]',
  sm: 'text-xl tracking-[-0.02em]',
  md: 'text-[22px] leading-tight tracking-[-0.025em]',
  lg: 'text-[26px] leading-tight tracking-[-0.03em]',
  xl: 'text-[34px] leading-[1.15] tracking-[-0.032em]',
  '2xl': 'text-[40px] leading-[1.1] tracking-[-0.035em] sm:text-5xl',
} as const;

export function Heading({ livello = 2, taglia = 'md', className, children }: HeadingProps) {
  const Tag = `h${livello}` as const;
  return (
    <Tag className={cn('font-display font-extrabold text-balance', TAGLIE[taglia], className)}>
      {children}
    </Tag>
  );
}
