'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UTENTE } from '@/content';
import { Avatar, Button } from '@/components/ui';

interface Commento {
  id: string;
  autore: string;
  quando: string;
  testo: string;
}

const INIZIALI: readonly Commento[] = [
  {
    id: '1',
    autore: 'Luca Bianchi',
    quando: '12 minuti fa',
    testo:
      'Sei un mito, mi salvi la sessione. Il tema del 2022 aveva anche la seconda parte sugli integrali doppi?',
  },
  {
    id: '2',
    autore: 'Sara Conti',
    quando: '40 minuti fa',
    testo: 'A pagina 12 credo ci sia un segno sbagliato nel limite, controllo e ti dico.',
  },
  {
    id: '3',
    autore: 'Marco Villa',
    quando: '1 ora fa',
    testo: 'Grazie! Li portiamo giovedì nell’aula studio di ripasso, ci vediamo lì.',
  },
  {
    id: '4',
    autore: 'Elena Ricci',
    quando: '2 ore fa',
    testo: 'Perfetti, avevo solo gli appunti a mano. Aggiungo i miei sulle equazioni differenziali.',
  },
];

/**
 * Commenti di un post, piatti come nel dominio: nessuna risposta annidata.
 *
 * Il commento appena scritto compare in cima subito, prima di qualunque
 * conferma dal server: su una discussione è la reazione che l'utente si
 * aspetta, e in caso di errore si può sempre segnalare e rimettere il testo
 * nel campo.
 */
export function Commenti() {
  const t = useTranslations('app.post');
  const [commenti, setCommenti] = useState<readonly Commento[]>(INIZIALI);
  const [bozza, setBozza] = useState('');

  const invia = () => {
    const testo = bozza.trim();
    if (!testo) return;
    setCommenti((precedenti) => [
      { id: `nuovo-${precedenti.length}`, autore: UTENTE.nome, quando: 'ora', testo },
      ...precedenti,
    ]);
    setBozza('');
  };

  return (
    <section className="mt-4 rounded-[18px] border border-bordo bg-superficie p-6">
      <div className="mb-4.5 flex items-center justify-between gap-4">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
          {t('commenti', { numero: commenti.length })}
        </h2>
        <span className="text-[12.5px] font-bold text-testo-didascalia">{t('ordine')}</span>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <Avatar nome={UTENTE.nome} dimensione={40} />
        <input
          value={bozza}
          onChange={(evento) => setBozza(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') invia();
          }}
          placeholder={t('scriviCommento')}
          aria-label={t('scriviCommento')}
          className="h-[46px] min-w-0 flex-1 rounded-[14px] border-2 border-bordo bg-superficie px-4 text-[14.5px] outline-none focus:border-primary-500"
        />
        <Button onPress={invia} isDisabled={!bozza.trim()} className="h-[46px] rounded-[14px] px-5">
          {t('invia')}
        </Button>
      </div>

      <ul className="flex flex-col gap-4.5">
        {commenti.map((commento) => (
          <li key={commento.id} className="flex gap-3">
            <Avatar nome={commento.autore} dimensione={38} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-testo">{commento.autore}</span>
                <span className="text-[11.5px] text-testo-debole">{commento.quando}</span>
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-testo-corpo">
                {commento.testo}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
