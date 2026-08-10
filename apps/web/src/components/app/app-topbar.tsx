import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { UTENTE } from '@/content';
import { Avatar, Icona } from '@/components/ui';
import { ThemeToggle } from '@/components/layout';
import { cn } from '@/lib/utils';

export interface AppTopbarProps {
  /** Titolo della schermata: usato al posto della ricerca dove serve contesto. */
  titolo?: ReactNode;
  /** Azioni a destra, prima delle notifiche. */
  azioni?: ReactNode;
  /** Con `true` mostra il campo di ricerca al posto del titolo. */
  conRicerca?: boolean;
  className?: string;
}

/**
 * Barra superiore dell'app.
 *
 * Ha due configurazioni: con la ricerca, quando la schermata è un elenco da
 * esplorare, e con il titolo, quando si è dentro un contenuto e serve sapere
 * dove ci si trova. Non entrambe: due punti di attenzione in una barra alta
 * 68 pixel si annullano a vicenda.
 */
export function AppTopbar({ titolo, azioni, conRicerca = false, className }: AppTopbarProps) {
  const t = useTranslations('app');

  return (
    <header
      className={cn(
        'flex h-[68px] flex-none items-center gap-4 border-b border-bordo bg-superficie/85 px-5 backdrop-blur-md sm:px-8',
        className,
      )}
    >
      {conRicerca ? (
        <div className="flex h-[42px] w-full max-w-[440px] items-center gap-2.5 rounded-[14px] bg-superficie-alt-2 px-3.5 text-sm text-testo-debole">
          <Icona nome="cerca" dimensione={17} />
          <span className="truncate">{t('cerca')}</span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{titolo}</div>
      )}

      <div className="ml-auto flex flex-none items-center gap-3">
        {azioni}
        <ThemeToggle className="size-[42px] rounded-[14px] border border-bordo bg-superficie" />
        <button
          type="button"
          aria-label={t('notifiche')}
          className="relative grid size-[42px] place-items-center rounded-[14px] border border-bordo bg-superficie text-testo-corpo transition-colors hover:bg-superficie-alt"
        >
          <Icona nome="campana" />
          {/* Il pallino dice "c'è qualcosa di nuovo", non quante cose: il
              numero esatto sta dentro il pannello delle notifiche. */}
          <span
            aria-hidden
            className="absolute right-2.5 top-2.5 size-2 rounded-full bg-tinta-ambra-bordo ring-2 ring-superficie"
          />
        </button>
        <Avatar nome={UTENTE.nome} dimensione={42} />
      </div>
    </header>
  );
}
