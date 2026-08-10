'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CHAT, UTENTE, type MessaggioChat } from '@/content';
import { Avatar, Button, Icona } from '@/components/ui';
import { TarghettaAllegato } from '@/components/contenuti';
import { cn } from '@/lib/utils';

/**
 * Chat dell'aula studio.
 *
 * I messaggi sono immutabili una volta inviati, come nel dominio: non c'è
 * modifica né cancellazione, perché la conversazione è il resoconto di una
 * sessione di studio e riscriverla a posteriori la renderebbe inutile.
 */
export function ChatAula({ puoScrivere = true }: { puoScrivere?: boolean }) {
  const t = useTranslations('app.sala');
  const [messaggi, setMessaggi] = useState<readonly MessaggioChat[]>(CHAT);
  const [bozza, setBozza] = useState('');

  const invia = () => {
    const testo = bozza.trim();
    if (!testo) return;
    setMessaggi((precedenti) => [
      ...precedenti,
      { id: `mio-${precedenti.length}`, autore: UTENTE.nome, testo, ora: 'ora', mio: true },
    ]);
    setBozza('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-sfondo px-6 py-5">
        <p className="text-center text-[11.5px] font-bold text-testo-debole">{t('oggi')} · 20:41</p>

        {messaggi.map((messaggio) => (
          <div
            key={messaggio.id}
            className={cn(
              'flex items-end gap-2.5',
              messaggio.mio ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            {!messaggio.mio ? <Avatar nome={messaggio.autore} dimensione={32} /> : null}
            <div
              className={cn(
                'max-w-[60%] border px-3.5 py-2.5',
                messaggio.mio
                  ? 'rounded-[16px_16px_5px_16px] border-tinta-menta-bordo bg-tinta-menta'
                  : 'rounded-[16px_16px_16px_5px] border-bordo bg-superficie',
              )}
            >
              {!messaggio.mio ? (
                <p className="mb-1 text-[11.5px] font-extrabold text-primario-accento">
                  {messaggio.autore}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-testo-corpo">{messaggio.testo}</p>
              <p
                className={cn(
                  'mt-1 text-right text-[10.5px]',
                  messaggio.mio ? 'text-primario-collegamento' : 'text-testo-debole',
                )}
              >
                {messaggio.ora}
              </p>
            </div>
          </div>
        ))}

        {/* Evento di sistema: un materiale condiviso non è un messaggio di
            nessuno, quindi non prende la forma di una nuvoletta. */}
        <div className="mx-auto flex items-center gap-3 rounded-[14px] border border-dashed border-tinta-menta-bordo bg-superficie px-4 py-2.5">
          <TarghettaAllegato tipo="pdf" className="h-[34px] w-[30px]" />
          <span className="text-[12.5px] font-bold text-testo-corpo">
            {t('haCondiviso', {
              nome: 'Giulia',
              file: 'esercizi_integrali.pdf',
              argomento: 'Integrali',
            })}
          </span>
        </div>
      </div>

      <div className="flex-none border-t border-bordo bg-superficie px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t('caricaMateriale')}
            disabled={!puoScrivere}
            className="grid size-[42px] flex-none place-items-center rounded-xl border border-bordo bg-superficie text-testo-tenue transition-colors hover:bg-superficie-alt disabled:opacity-50"
          >
            <Icona nome="piu" dimensione={19} />
          </button>
          <input
            value={bozza}
            disabled={!puoScrivere}
            onChange={(evento) => setBozza(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') invia();
            }}
            placeholder={t('scrivi')}
            aria-label={t('scrivi')}
            className="h-11 min-w-0 flex-1 rounded-[14px] border-2 border-bordo bg-superficie px-4 text-[14.5px] outline-none focus:border-primary-500 disabled:opacity-60"
          />
          <Button
            onPress={invia}
            isDisabled={!puoScrivere || !bozza.trim()}
            className="h-11 flex-none rounded-[14px] px-5"
          >
            {t('invia')}
          </Button>
        </div>
      </div>
    </div>
  );
}
