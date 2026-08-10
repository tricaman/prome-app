'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  titolo?: string;
  descrizione?: string;
  /** Icona o illustrazione: dà un tono accogliente a uno spazio vuoto. */
  illustrazione?: ReactNode;
  azione?: { etichetta: string; onClick: () => void };
  className?: string;
}

/**
 * "Qui non c'è ancora nulla" detto bene: spiega cosa comparirà e, quando ha
 * senso, offre l'azione che riempie lo spazio.
 */
export function EmptyState({
  titolo,
  descrizione,
  illustrazione,
  azione,
  className,
}: EmptyStateProps) {
  const t = useTranslations('errori.vuoto');

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-4 py-16 text-center',
        className,
      )}
    >
      <div className="rounded-3xl bg-superficie-alt p-5 text-4xl">{illustrazione ?? '✳️'}</div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-xl font-semibold">{titolo ?? t('titolo')}</h3>
        <p className="max-w-sm text-sm text-testo-tenue">{descrizione ?? t('descrizione')}</p>
      </div>
      {azione ? (
        <Button variante="primaria" onPress={azione.onClick}>
          {azione.etichetta}
        </Button>
      ) : null}
    </div>
  );
}
