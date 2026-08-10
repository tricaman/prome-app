'use client';

import { useTranslations } from 'next-intl';
import { MIEI_GRUPPI, UTENTE } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link, usePathname } from '@/i18n/navigazione';
import { Avatar, Icona, type NomeIcona } from '@/components/ui';
import { Logo } from '@/components/layout';
import { cn } from '@/lib/utils';

interface VoceApp {
  chiave: 'bacheca' | 'aule' | 'gruppi' | 'materiali' | 'profilo';
  icona: NomeIcona;
  href: string;
  /** Quante cose richiedono attenzione: assente se non ce ne sono. */
  contatore?: number;
}

const VOCI: readonly VoceApp[] = [
  { chiave: 'bacheca', icona: 'bacheca', href: percorsiApp.bacheca() },
  { chiave: 'aule', icona: 'aule', href: percorsiApp.auleStudio(), contatore: 2 },
  { chiave: 'gruppi', icona: 'gruppi', href: percorsiApp.gruppo('ingegneria-informatica-2026'), contatore: 3 },
  { chiave: 'materiali', icona: 'cartella', href: percorsiApp.materiali() },
  { chiave: 'profilo', icona: 'profilo', href: percorsiApp.impostazioni() },
];

/**
 * Colonna di navigazione dell'app.
 *
 * L'azione principale — scrivere un post — sta in cima e non dentro il menu:
 * è il comportamento che vogliamo incoraggiare, e su desktop lo spazio per
 * tenerla sempre visibile c'è.
 */
export function AppSidebar() {
  const t = useTranslations('app');
  const percorso = usePathname();

  return (
    <aside className="hidden w-64 flex-none flex-col border-r border-bordo bg-superficie px-3.5 py-5 lg:flex">
      <Link href={percorsiApp.bacheca()} aria-label="Prome" className="mb-5 px-2.5 text-testo">
        <Logo />
      </Link>

      <button
        type="button"
        className="mb-4 flex h-11 items-center justify-center gap-2 rounded-full bg-primario text-[14.5px] font-extrabold text-primario-testo shadow-marchio transition-colors hover:bg-primary-600"
      >
        <Icona nome="piu" dimensione={18} />
        {t('nuovoPost')}
      </button>

      <nav aria-label={t('nav.bacheca')} className="flex flex-col gap-0.5">
        {VOCI.map((voce) => {
          const attiva = percorso.startsWith(voce.href);
          return (
            <Link
              key={voce.chiave}
              href={voce.href}
              aria-current={attiva ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors',
                attiva
                  ? 'bg-tinta-menta font-extrabold text-primario-accento'
                  : 'font-semibold text-testo-corpo hover:bg-superficie-alt-2',
              )}
            >
              <Icona nome={voce.icona} />
              {t(`nav.${voce.chiave}`)}
              {voce.contatore ? (
                <span className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-primario px-1.5 text-[11px] font-extrabold text-primario-testo">
                  {voce.contatore}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 pb-2 pt-5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-testo-debole">
        {t('nav.tuoiGruppi')}
      </p>
      <ul className="flex flex-col gap-0.5">
        {MIEI_GRUPPI.map((gruppo) => (
          <li key={gruppo.slug}>
            <Link
              href={percorsiApp.gruppo(gruppo.slug)}
              className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-semibold text-testo-tenue transition-colors hover:bg-superficie-alt-2"
            >
              <span
                aria-hidden
                className="size-[22px] flex-none rounded-[7px] bg-gradient-to-br from-primary-200 to-primary-500"
              />
              <span className="truncate">{gruppo.nome}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={percorsiApp.impostazioni()}
        className="mt-auto flex items-center gap-2.5 rounded-2xl border border-bordo bg-superficie-alt p-3 transition-colors hover:border-tinta-menta-bordo"
      >
        <Avatar nome={UTENTE.nome} dimensione={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold text-testo">{UTENTE.nome}</span>
          <span className="block truncate text-[11px] text-testo-didascalia">
            {UTENTE.corso} · {UTENTE.ateneo}
          </span>
        </span>
      </Link>
    </aside>
  );
}
