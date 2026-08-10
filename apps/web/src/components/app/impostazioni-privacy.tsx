'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Visibilita } from '@/content';
import { Card, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';

const OPZIONI: readonly { valore: Visibilita; chiave: 'privato' | 'ateneo' | 'pubblico' }[] = [
  { valore: 'Privato', chiave: 'privato' },
  { valore: 'Ateneo', chiave: 'ateneo' },
  { valore: 'Pubblico', chiave: 'pubblico' },
];

/**
 * Le due impostazioni di privacy del profilo.
 *
 * Sono due assi indipendenti — chi può contattarti e chi può vedere i tuoi
 * contenuti — e restano due riquadri separati: unirli in un solo "livello di
 * privacy" farebbe credere che scegliere di essere raggiungibili significhi
 * anche rendere pubblico quello che si scrive.
 */
export function ImpostazioniPrivacy() {
  const t = useTranslations('app.impostazioni');
  const [contatto, setContatto] = useState<Visibilita>('Ateneo');
  const [contenuti, setContenuti] = useState<Visibilita>('Ateneo');

  return (
    <>
      <SceltaVisibilita
        titolo={t('contatto.titolo')}
        descrizione={t('contatto.testo')}
        valore={contatto}
        descrizioni={{
          privato: t('contatto.privato'),
          ateneo: t('contatto.ateneo'),
          pubblico: t('contatto.pubblico'),
        }}
        onChange={setContatto}
      />

      <SceltaVisibilita
        titolo={t('contenuti.titolo')}
        descrizione={t('contenuti.testo')}
        valore={contenuti}
        descrizioni={{
          privato: t('contenuti.privato'),
          ateneo: t('contenuti.ateneo'),
          pubblico: t('contenuti.pubblico'),
        }}
        onChange={setContenuti}
      />
    </>
  );
}

function SceltaVisibilita({
  titolo,
  descrizione,
  valore,
  descrizioni,
  onChange,
}: {
  titolo: string;
  descrizione: string;
  valore: Visibilita;
  descrizioni: Record<'privato' | 'ateneo' | 'pubblico', string>;
  onChange: (valore: Visibilita) => void;
}) {
  return (
    <Card padding="md" className="mb-3.5">
      <p className="text-[15.5px] font-extrabold text-testo">{titolo}</p>
      <p className="mb-3.5 mt-1 text-[13px] leading-relaxed text-testo-tenue">{descrizione}</p>

      <div role="radiogroup" aria-label={titolo} className="grid gap-2.5 sm:grid-cols-3">
        {OPZIONI.map((opzione) => {
          const scelta = opzione.valore === valore;
          return (
            <button
              key={opzione.valore}
              type="button"
              role="radio"
              aria-checked={scelta}
              onClick={() => onChange(opzione.valore)}
              className={cn(
                'rounded-[14px] border-2 p-3.5 text-left transition-colors',
                scelta
                  ? 'border-primary-500 bg-tinta-menta-velo'
                  : 'border-bordo bg-superficie hover:border-tinta-menta-bordo',
              )}
            >
              <span
                className={cn(
                  'block text-[13.5px] font-extrabold',
                  scelta ? 'text-primario-accento' : 'text-testo',
                )}
              >
                {opzione.valore}
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-testo-tenue">
                {descrizioni[opzione.chiave]}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Interruttori delle notifiche: ognuno dice anche come arriva l'avviso. */
export function ImpostazioniNotifiche() {
  const t = useTranslations('app.impostazioni.notifiche');
  const [attive, setAttive] = useState<Record<string, boolean>>({
    commenti: true,
    inviti: true,
    promemoria: true,
    materiali: false,
  });

  const righe = ['commenti', 'inviti', 'promemoria', 'materiali'] as const;

  return (
    <ul>
      {righe.map((riga, indice) => (
        <li
          key={riga}
          className={cn(
            'flex items-center gap-4 px-5 py-4',
            indice < righe.length - 1 && 'border-b border-superficie-alt-2',
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-testo">{t(riga)}</span>
            <span className="mt-0.5 block text-xs text-testo-didascalia">{t(`${riga}Sub`)}</span>
          </span>
          <Switch
            etichetta={t(riga)}
            attivo={attive[riga] ?? false}
            onChange={(valore) => setAttive((precedenti) => ({ ...precedenti, [riga]: valore }))}
          />
        </li>
      ))}
    </ul>
  );
}
