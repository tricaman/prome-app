'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UTENTE } from '@/content';
import { Avatar, Button, Card, Icona } from '@/components/ui';

/**
 * Composer della bacheca.
 *
 * Sul web sta in cima al feed invece di essere nascosto dietro un pulsante
 * fluttuante: lo spazio c'è e scrivere è il comportamento da incoraggiare.
 * Si espande al primo tocco, mostrando allegati e argomento, così a riposo
 * occupa una riga sola.
 */
export function Composer() {
  const t = useTranslations('app.feed');
  const [aperto, setAperto] = useState(false);
  const nome = UTENTE.nome.split(' ')[0] ?? UTENTE.nome;

  return (
    <Card padding="nessuno" className="p-4">
      <div className="flex items-center gap-3">
        <Avatar nome={UTENTE.nome} dimensione={40} />

        {aperto ? (
          <textarea
            autoFocus
            rows={3}
            placeholder={t('composer', { nome })}
            className="flex-1 resize-none rounded-[14px] border-2 border-bordo bg-superficie px-4 py-3 text-[14.5px] outline-none focus:border-primary-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAperto(true)}
            className="flex h-11 flex-1 items-center rounded-[14px] bg-superficie-alt-2 px-4 text-left text-[14.5px] text-testo-debole"
          >
            {t('composer', { nome })}
          </button>
        )}

        {!aperto ? (
          <div className="flex flex-none items-center gap-1.5">
            <AzioneAllegato icona="carica" etichetta={t('apri')} />
            <Button className="h-[38px] px-4 text-[13.5px]">{t('pubblica')}</Button>
          </div>
        ) : null}
      </div>

      {aperto ? (
        <div className="mt-3 flex items-center gap-2">
          <AzioneAllegato icona="carica" etichetta={t('apri')} />
          <AzioneAllegato icona="cartella" etichetta={t('apri')} />
          <Button className="ml-auto h-[38px] px-4 text-[13.5px]">{t('pubblica')}</Button>
        </div>
      ) : null}
    </Card>
  );
}

function AzioneAllegato({
  icona,
  etichetta,
}: {
  icona: 'carica' | 'cartella';
  etichetta: string;
}) {
  return (
    <button
      type="button"
      aria-label={etichetta}
      className="grid size-[38px] place-items-center rounded-xl bg-superficie-alt-2 text-testo-tenue transition-colors hover:text-primario-collegamento"
    >
      <Icona nome={icona} dimensione={18} />
    </button>
  );
}
