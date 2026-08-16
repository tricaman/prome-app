'use client';

import { useTranslations } from 'next-intl';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link, usePathname } from '@/i18n/navigazione';
import { useNotificheLive } from '@/hooks';
import { Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * La campanella, col numero vero.
 *
 * Porta all'elenco invece di aprire un pannello al volo: le notifiche sono
 * una destinazione, non un menu — hanno un indirizzo, si torna indietro col
 * tasto del browser, e la stessa forma esiste sul telefono.
 *
 * Il numero viene dal server e si tiene vivo con `useNotificheLive`: socket
 * quando c'è, rilettura periodica quando non c'è. Sopra il 9 dice «9+»: a
 * quel punto il numero esatto non cambia più la decisione di aprire.
 */
export function CampanellaNotifiche() {
  const t = useTranslations('app.notifiche');
  const percorso = usePathname();
  const { nonLette } = useNotificheLive();

  const attiva = percorso.startsWith(percorsiApp.notifiche());

  return (
    <Link
      href={percorsiApp.notifiche()}
      aria-label={nonLette > 0 ? `${t('apri')} — ${t('nonLette', { numero: nonLette })}` : t('apri')}
      aria-current={attiva ? 'page' : undefined}
      className={cn(
        'relative grid size-[42px] flex-none place-items-center rounded-[14px] border transition-colors',
        attiva
          ? 'border-tinta-menta-bordo bg-tinta-menta text-tinta-menta-testo'
          : 'border-bordo bg-superficie text-testo-corpo hover:bg-superficie-alt',
      )}
    >
      <Icona nome="campana" dimensione={20} />
      {nonLette > 0 ? (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-avviso px-1 text-[10px] font-extrabold text-avviso-testo ring-2 ring-superficie"
        >
          {nonLette > 9 ? '9+' : nonLette}
        </span>
      ) : null}
    </Link>
  );
}
