'use client';

import { Spinner } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  /** Altezza dell'area: `contenuta` per blocchi, `piena` per una schermata. */
  dimensione?: 'contenuta' | 'piena';
  messaggio?: string;
  className?: string;
}

/** Attesa dichiarata: uno spazio riservato con un motivo, non una pagina vuota. */
export function LoadingState({
  dimensione = 'contenuta',
  messaggio,
  className,
}: LoadingStateProps) {
  const t = useTranslations('comune');

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3',
        dimensione === 'piena' ? 'min-h-[60vh]' : 'min-h-[240px]',
        className,
      )}
    >
      <Spinner />
      <p className="text-sm text-testo-tenue">{messaggio ?? t('caricamento')}</p>
    </div>
  );
}
