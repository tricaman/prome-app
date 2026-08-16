import type { ReactNode } from 'react';
import { AvatarUtente } from '@/components/app/avatar-utente';
import { CampanellaNotifiche } from '@/components/app/campanella-notifiche';
import { ThemeToggle } from '@/components/layout';
import { cn } from '@/lib/utils';

export interface AppTopbarProps {
  /** Titolo della schermata: dice dove ci si trova. */
  titolo?: ReactNode;
  /** Azioni a destra, prima del tema. */
  azioni?: ReactNode;
  className?: string;
}

/**
 * Barra superiore dell'app: dove ci si trova, e le azioni della schermata.
 *
 * **La campana è tornata, e stavolta è vera.** Quella tolta a luglio era un
 * bottone senza gesto con un pallino sempre acceso — diceva «c'è qualcosa di
 * nuovo» a ogni pagina, per sempre, e non c'era nulla da aprire. Questa conta
 * le notifiche non lette dal server e porta al loro elenco: se il numero non
 * c'è, non c'è. Il campo di ricerca invece resta fuori: nessuna ricerca
 * esiste ancora sui contenuti, e un riquadro finto in cima a ogni schermata
 * era il posto peggiore dove tenerlo.
 *
 * Sta qui e non nelle `azioni` delle pagine: dieci pagine la renderebbero in
 * dieci punti, e quella dimenticata sarebbe una schermata senza campanella.
 */
export function AppTopbar({ titolo, azioni, className }: AppTopbarProps) {
  return (
    <header
      className={cn(
        'flex h-[68px] flex-none items-center gap-4 border-b border-bordo bg-superficie/85 px-5 backdrop-blur-md sm:px-8',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">{titolo}</div>

      <div className="ml-auto flex flex-none items-center gap-3">
        {azioni}
        <CampanellaNotifiche />
        <ThemeToggle className="size-[42px] rounded-[14px] border border-bordo bg-superficie" />
        <AvatarUtente />
      </div>
    </header>
  );
}
