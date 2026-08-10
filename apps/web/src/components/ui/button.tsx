'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button as HeroButton, Spinner } from '@heroui/react';
import { cn } from '@/lib/utils';

type VariantiHero = ComponentProps<typeof HeroButton>['variant'];

export interface ButtonProps
  extends Omit<ComponentProps<typeof HeroButton>, 'variant' | 'children'> {
  /** Gerarchia dell'azione, non il colore: il tema decide come appare. */
  variante?: 'primaria' | 'secondaria' | 'tenue' | 'contorno' | 'fantasma' | 'distruttiva';
  /** Blocca l'interazione e mostra l'indicatore di attesa. */
  inCaricamento?: boolean;
  /** Icona prima del testo. */
  iconaSinistra?: ReactNode;
  /** Icona dopo il testo. */
  iconaDestra?: ReactNode;
  children?: ReactNode;
}

const VARIANTI: Record<NonNullable<ButtonProps['variante']>, VariantiHero> = {
  primaria: 'primary',
  secondaria: 'secondary',
  tenue: 'tertiary',
  contorno: 'outline',
  fantasma: 'ghost',
  distruttiva: 'danger',
};

/**
 * Bottone dell'applicazione.
 *
 * Espone la gerarchia dell'azione invece del colore: chi scrive una pagina
 * dichiara "questa è l'azione primaria" e non deve sapere quale tinta usare.
 * Durante il caricamento il bottone resta della stessa larghezza, così la
 * pagina non sobbalza quando parte una richiesta.
 */
export function Button({
  variante = 'primaria',
  inCaricamento = false,
  iconaSinistra,
  iconaDestra,
  isDisabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <HeroButton
      {...props}
      variant={VARIANTI[variante]}
      isDisabled={isDisabled || inCaricamento}
      className={cn('rounded-full font-semibold', className)}
    >
      {inCaricamento ? <Spinner size="sm" /> : iconaSinistra}
      {children}
      {!inCaricamento && iconaDestra}
    </HeroButton>
  );
}
