import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps {
  /** Larghezza massima del contenuto. */
  larghezza?: 'stretta' | 'media' | 'ampia';
  come?: ElementType;
  className?: string;
  children: ReactNode;
}

const LARGHEZZE = {
  stretta: 'max-w-2xl',
  media: 'max-w-4xl',
  ampia: 'max-w-6xl',
} as const;

/** Incolonna il contenuto e tiene i margini laterali uguali in tutto il sito. */
export function Container({
  larghezza = 'ampia',
  come: Elemento = 'div',
  className,
  children,
}: ContainerProps) {
  return (
    <Elemento className={cn('mx-auto w-full px-5 sm:px-8', LARGHEZZE[larghezza], className)}>
      {children}
    </Elemento>
  );
}
