'use client';

import { useTranslations } from 'next-intl';
import { useEsci } from '@prome/app-core';
import { Card, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Uscire da Prome, dalle impostazioni.
 *
 * Due righe e non una, perché rispondono a due domande diverse: «ho finito»
 * (questo browser) e «qualcuno potrebbe essere entrato» (tutti i dispositivi).
 * La seconda non è la prima fatta meglio — chiude sessioni che chi preme non
 * ha davanti — quindi dice a parole cosa sta per succedere invece di lasciarlo
 * intuire dal titolo.
 *
 * Non c'è conferma: uscire è sempre annullabile con un altro codice, e una
 * conferma su un gesto reversibile insegna solo a premere due volte senza
 * leggere — che è esattamente ciò che non si vuole il giorno in cui la
 * conferma protegge qualcosa di serio.
 */
export function SessioneAccount() {
  const t = useTranslations('app.impostazioni');
  const { esci, inCorso } = useEsci();

  return (
    <Card padding="nessuno" className="mb-6 overflow-hidden">
      <Riga
        etichetta={t('esci')}
        dettaglio={t('esciSub')}
        inCorso={inCorso}
        onPremi={() => void esci('questo-dispositivo')}
      />
      <Riga
        etichetta={t('esciDaTutti')}
        dettaglio={t('esciDaTuttiSub')}
        inCorso={inCorso}
        ultima
        onPremi={() => void esci('tutti-i-dispositivi')}
      />
    </Card>
  );
}

function Riga({
  etichetta,
  dettaglio,
  inCorso,
  ultima = false,
  onPremi,
}: {
  etichetta: string;
  dettaglio: string;
  inCorso: boolean;
  ultima?: boolean;
  onPremi: () => void;
}) {
  return (
    <button
      type="button"
      // Spente entrambe mentre una lavora: la sessione sta per cadere, e un
      // secondo gesto partirebbe con un token che fra un istante non vale più.
      disabled={inCorso}
      onClick={onPremi}
      className={cn(
        'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-superficie-alt disabled:cursor-not-allowed disabled:opacity-60',
        !ultima && 'border-b border-superficie-alt-2',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-testo">{etichetta}</span>
        <span className="mt-0.5 block text-xs text-testo-debole">{dettaglio}</span>
      </span>
      <Icona nome="esci" dimensione={18} className="flex-none text-testo-debole" />
    </button>
  );
}
