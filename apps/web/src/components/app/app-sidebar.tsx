'use client';

import { useTranslations } from 'next-intl';
import { useEsci } from '@prome/app-core';
import { useElencaMieiGruppi, useLeggiMioProfilo } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link, usePathname } from '@/i18n/navigazione';
import { Avatar, Icona, type NomeIcona } from '@/components/ui';
import { Logo } from '@/components/layout';
import { cn } from '@/lib/utils';

interface VoceApp {
  chiave: 'bacheca' | 'aule' | 'gruppi' | 'profilo';
  icona: NomeIcona;
  href: string;
}

/**
 * I badge numerici sono spariti: erano due costanti scritte qui dentro — un 2
 * sulle aule e un 3 sui gruppi — accese a ogni caricamento di ogni pagina.
 * Diceva «hai cose da vedere» a chi non ne aveva nessuna, ed è la bugia più
 * facile da lasciare in giro, perché somiglia a un dettaglio grafico.
 */
const VOCI: readonly VoceApp[] = [
  { chiave: 'bacheca', icona: 'bacheca', href: percorsiApp.bacheca() },
  { chiave: 'aule', icona: 'aule', href: percorsiApp.auleStudio() },
  { chiave: 'gruppi', icona: 'gruppi', href: percorsiApp.gruppi() },
  // Portava alle impostazioni, che è come chiamare «casa» il quadro elettrico:
  // adesso il profilo è una pagina sua, e le impostazioni si aprono da lì o
  // dalla scheda in fondo a questa colonna.
  { chiave: 'profilo', icona: 'profilo', href: percorsiApp.profilo() },
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
  const { esci, inCorso } = useEsci();
  const profilo = useLeggiMioProfilo();
  const gruppi = useElencaMieiGruppi({ limit: 8 });

  const nome = [profilo.data?.data.nome, profilo.data?.data.cognome].filter(Boolean).join(' ');
  const studi = [profilo.data?.data.corso?.nome, profilo.data?.data.universita?.nome]
    .filter(Boolean)
    .join(' · ');
  const mieiGruppi = gruppi.data?.data ?? [];

  return (
    <aside className="hidden w-64 flex-none flex-col border-r border-bordo bg-superficie px-3.5 py-5 lg:flex">
      <Link href={percorsiApp.bacheca()} aria-label="Prome" className="mb-5 px-2.5 text-testo">
        <Logo />
      </Link>

      {/* Scrivere un post si fa dal composer, in cima alla bacheca: questo
          bottone non era collegato a niente e compariva su ogni schermata. */}
      <Link
        href={percorsiApp.bacheca()}
        className="mb-4 flex h-11 items-center justify-center gap-2 rounded-full bg-primario text-[14.5px] font-extrabold text-primario-testo shadow-marchio transition-colors hover:bg-primary-600"
      >
        <Icona nome="piu" dimensione={18} />
        {t('nuovoPost')}
      </Link>

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
            </Link>
          );
        })}
      </nav>

      {mieiGruppi.length ? (
        <>
          <p className="px-3 pb-2 pt-5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-testo-debole">
            {t('nav.tuoiGruppi')}
          </p>
          <ul className="flex flex-col gap-0.5">
            {mieiGruppi.map((gruppo) => (
              <li key={gruppo.id}>
                <Link
                  href={percorsiApp.gruppo(gruppo.id)}
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
        </>
      ) : null}

      {/* L'uscita sta qui, sempre visibile, e non solo in fondo alle
          impostazioni: chi vuole uscire — su un computer condiviso, in
          biblioteca — non deve attraversare una schermata piena di
          interruttori per farlo. */}
      <button
        type="button"
        disabled={inCorso}
        onClick={() => void esci()}
        className="mt-auto mb-2 flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold text-testo-tenue transition-colors hover:bg-superficie-alt-2 hover:text-testo disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icona nome="esci" />
        {t('nav.esci')}
      </button>

      <Link
        href={percorsiApp.impostazioni()}
        className="flex items-center gap-2.5 rounded-2xl border border-bordo bg-superficie-alt p-3 transition-colors hover:border-tinta-menta-bordo"
      >
        <Avatar nome={nome || '?'} dimensione={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold text-testo">{nome}</span>
          <span className="block truncate text-[11px] text-testo-didascalia">{studi}</span>
        </span>
      </Link>
    </aside>
  );
}
