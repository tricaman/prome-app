'use client';

import { useTranslations } from 'next-intl';
import { codiceErrore, messaggioErrore, riferimentoErrore } from '@prome/app-core';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  /** Errore da mostrare: se viene dall'API il messaggio è già tradotto. */
  errore?: unknown;
  titolo?: string;
  descrizione?: string;
  onRiprova?: () => void;
  dimensione?: 'contenuta' | 'piena';
  className?: string;
}

/**
 * Errore mostrato con quello che serve davvero: cosa è successo, come
 * riprovare e il riferimento da citare in una segnalazione.
 *
 * Il messaggio arriva dal server già nella lingua dell'utente; il codice e il
 * riferimento restano visibili ma discreti, perché servono solo se si scrive
 * per chiedere aiuto.
 */
export function ErrorState({
  errore,
  titolo,
  descrizione,
  onRiprova,
  dimensione = 'contenuta',
  className,
}: ErrorStateProps) {
  const t = useTranslations();
  const messaggio = errore !== undefined ? messaggioErrore(errore) : undefined;
  const codice = codiceErrore(errore);
  const riferimento = riferimentoErrore(errore);

  return (
    <div
      role="alert"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-4 text-center',
        dimensione === 'piena' ? 'min-h-[60vh]' : 'min-h-[240px]',
        className,
      )}
    >
      <div className="rounded-3xl bg-tinta-rosa p-5 text-4xl">⚠️</div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-xl font-semibold">
          {titolo ?? t('errori.caricamentoDati.titolo')}
        </h3>
        <p className="max-w-md text-sm text-testo-tenue">
          {descrizione ?? messaggio ?? t('errori.caricamentoDati.descrizione')}
        </p>
      </div>

      {onRiprova ? (
        <Button variante="secondaria" onPress={onRiprova}>
          {t('comune.riprova')}
        </Button>
      ) : null}

      {codice || riferimento ? (
        <p className="text-xs text-testo-debole">
          {codice ? t('errori.codice', { codice }) : null}
          {codice && riferimento ? ' · ' : null}
          {riferimento ? t('errori.riferimento', { id: riferimento }) : null}
        </p>
      ) : null}
    </div>
  );
}
