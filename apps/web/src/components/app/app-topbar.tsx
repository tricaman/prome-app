import type { ReactNode } from 'react';
import { AvatarUtente } from '@/components/app/avatar-utente';
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
 * Non ha la campana delle notifiche né il campo di ricerca che aveva prima.
 * La campana era un bottone senza gesto con un pallino sempre acceso — diceva
 * «c'è qualcosa di nuovo» a ogni pagina, per sempre, e non c'era nulla da
 * aprire; il campo di ricerca era un riquadro di testo, non un campo, e
 * nessuna ricerca esiste ancora sui contenuti. Erano in cima a ogni schermata
 * dell'app, che è il posto peggiore in cui tenere due cose finte.
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
        <ThemeToggle className="size-[42px] rounded-[14px] border border-bordo bg-superficie" />
        <AvatarUtente />
      </div>
    </header>
  );
}
