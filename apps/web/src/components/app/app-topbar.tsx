import type { ReactNode } from 'react';
import { CampanellaNotifiche } from '@/components/app/campanella-notifiche';
import { MenuAccount } from '@/components/app/menu-account';
import { ThemeToggle } from '@/components/layout';
import { cn } from '@/lib/utils';

export interface AppTopbarProps {
  /** Titolo della schermata: dice dove ci si trova. */
  titolo?: ReactNode;
  /**
   * Azioni **della schermata**, prima dei comandi dell'applicazione.
   *
   * Solo verbi, e solo su ciò che si sta guardando. Una destinazione qui —
   * «Impostazioni» stava proprio qui, sul profilo — è un collegamento che
   * esiste su una schermata sola: non è navigazione, è un nascondiglio. Le
   * destinazioni stanno nella colonna, o nel menu account.
   */
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
 *
 * **L'avatar è diventato un menu.** Era un ritratto e basta: l'angolo che tutti
 * premono cercando l'account, e l'unico controllo dello schermo che non faceva
 * niente. Vale la stessa ragione della campanella — sta qui, non nelle pagine.
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

      {/* Lo spazio non è uniforme, e non è un vezzo: campanella e tema stanno
          stretti perché sono la stessa cosa — comandi dell'applicazione — e
          l'account si stacca, perché è un'altra. Con tutti e tre a 12px non
          si leggeva nessun gruppo, solo cinque oggetti in fila. */}
      <div className="ml-auto flex flex-none items-center gap-2">
        {azioni ? <div className="mr-1 flex items-center gap-2">{azioni}</div> : null}
        <CampanellaNotifiche />
        <ThemeToggle className="size-[42px] rounded-[14px] border border-bordo bg-superficie" />
        <div className="ml-1.5">
          <MenuAccount />
        </div>
      </div>
    </header>
  );
}
