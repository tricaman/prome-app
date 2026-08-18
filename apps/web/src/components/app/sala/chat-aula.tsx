'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LUNGHEZZA_MASSIMA_MESSAGGIO } from '@prome/contracts';
import { useChatAula } from '@/hooks/use-chat-aula';
import { Avatar, Button, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * La chat dell'aula.
 *
 * Lo stato della connessione è **visibile**, e non per completezza: quando i
 * messaggi degli altri smettono di arrivare, chi sta scrivendo deve sapere se
 * è successo qualcosa alla rete o se semplicemente nessuno sta rispondendo.
 * Senza quella riga le due situazioni sono indistinguibili.
 *
 * Con il trasporto assente la chat resta usabile: si scrive, si legge, e la
 * conversazione si riallinea alla riapertura.
 */
export function ChatAula({ aulaId, puoScrivere }: { aulaId: string; puoScrivere: boolean }) {
  const t = useTranslations('app.sala');
  const tComune = useTranslations('comune');
  const { messaggi, stato, inCaricamento, invia } = useChatAula(aulaId);
  const [testo, setTesto] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  // Si resta in fondo, dove sta la conversazione di adesso.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' });
  }, [messaggi.length]);

  const manda = async () => {
    const pulito = testo.trim();
    if (!pulito || inInvio) return;
    setInInvio(true);
    try {
      await invia(pulito);
      setTesto('');
    } finally {
      setInInvio(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sfondo">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {inCaricamento ? (
          <p className="py-10 text-center text-sm text-testo-tenue">{tComune('caricamento')}</p>
        ) : null}

        {!inCaricamento && messaggi.length === 0 ? (
          <p className="py-10 text-center text-sm text-testo-tenue">{t('nessunMessaggio')}</p>
        ) : null}

        <ul className="flex flex-col gap-3.5">
          {messaggi.map((messaggio) => {
            const nome =
              [messaggio.autore.nome, messaggio.autore.cognome].filter(Boolean).join(' ') ||
              tComune('utenteRimosso');
            return (
              <li
                key={messaggio.id}
                className={cn('flex gap-3', messaggio.mio && 'flex-row-reverse')}
              >
                <Avatar nome={nome} dimensione={32} className="flex-none" />
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-3.5 py-2.5',
                    messaggio.mio
                      ? 'bg-tinta-menta text-tinta-menta-testo'
                      : 'bg-superficie text-testo',
                  )}
                >
                  {!messaggio.mio ? (
                    <span className="mb-0.5 block text-[12px] font-extrabold text-testo-tenue">
                      {nome}
                    </span>
                  ) : null}
                  <span className="block whitespace-pre-wrap text-[14px] leading-relaxed">
                    {messaggio.testo}
                  </span>
                  <span className="mt-1 block text-[11px] text-testo-debole">
                    {new Date(messaggio.inviatoIl).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={fondo} />
      </div>

      <div className="flex-none border-t border-bordo bg-superficie px-6 py-4">
        <p
          className={cn(
            'mb-2 text-[11.5px] font-bold',
            stato === 'connesso' ? 'text-testo-debole' : 'text-errore',
          )}
        >
          {t(`connessione.${stato}`)}
        </p>

        {puoScrivere ? (
          <div className="flex items-end gap-2.5">
            <textarea
              value={testo}
              onChange={(evento) => setTesto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' && !evento.shiftKey) {
                  evento.preventDefault();
                  void manda();
                }
              }}
              rows={1}
              maxLength={LUNGHEZZA_MASSIMA_MESSAGGIO}
              placeholder={t('scrivi')}
              aria-label={t('scrivi')}
              className="max-h-32 min-h-[46px] flex-1 resize-y rounded-[14px] border-2 border-bordo bg-superficie px-3.5 py-3 text-sm text-testo"
            />
            {/* Un aeroplanino e basta. La label diceva «Invia invito» —
                era la chiave degli inviti, finita nella chat — e comunque il
                gesto di mandare un messaggio è il più riconoscibile che ci
                sia: il nome per chi non vede resta in `aria-label`. */}
            <Button
              className="h-[46px] w-[46px] flex-none p-0"
              isDisabled={!testo.trim()}
              inCaricamento={inInvio}
              onPress={() => void manda()}
              aria-label={t('inviaMessaggio')}
            >
              <Icona nome="invia" dimensione={18} />
            </Button>
          </div>
        ) : (
          // La sola lettura è uno stato legittimo, non un errore da spiegare
          // con un messaggio d'allarme: si dice cos'è, e basta.
          <p className="text-[13px] text-testo-tenue">{t('solaLetturaSpiegazione')}</p>
        )}
      </div>
    </div>
  );
}
