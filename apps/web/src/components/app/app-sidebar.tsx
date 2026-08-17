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
  chiave: 'bacheca' | 'aule' | 'gruppi' | 'profilo' | 'impostazioni';
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
  // adesso il profilo è una pagina sua.
  { chiave: 'profilo', icona: 'profilo', href: percorsiApp.profilo() },
];

/**
 * La zona di servizio, in fondo: non dove si lavora, ma come funziona.
 *
 * «Impostazioni» stava in una barra del solo profilo — cioè era una
 * destinazione globale raggiungibile da una schermata sola. Qui c'è da ogni
 * pagina, e sta sotto una riga di separazione perché non è un quinto luogo
 * accanto a Bacheca e Gruppi: è un'altra categoria di cosa.
 */
const VOCI_SERVIZIO: readonly VoceApp[] = [
  { chiave: 'impostazioni', icona: 'impostazioni', href: percorsiApp.impostazioni() },
];

/**
 * Colonna di navigazione dell'app.
 *
 * L'azione principale — scrivere un post — sta in cima e non dentro il menu:
 * è il comportamento che vogliamo incoraggiare, e su desktop lo spazio per
 * tenerla sempre visibile c'è.
 *
 * **È alta quanto la finestra e resta ferma** (`sticky top-0 h-dvh
 * self-start`), e dentro scorre una parte sola: quella dei gruppi. Senza,
 * l'altezza della colonna era quella del suo contenuto, e il contenuto ha un
 * pezzo che cresce — fino a otto gruppi. Le voci in fondo finivano quindi
 * sotto la piega proprio da chi ha più gruppi, cioè da chi usa di più l'app;
 * e su `bacheca`, dove a scorrere è il documento, se ne andavano su con la
 * pagina. Un menu che a volte c'è non è un menu.
 *
 * Il prezzo è che la colonna non si allunga più con le pagine lunghe: è
 * esattamente ciò che si voleva.
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
    <aside className="sticky top-0 hidden h-dvh w-64 flex-none flex-col self-start border-r border-bordo bg-superficie px-3.5 py-5 lg:flex">
      <Link
        href={percorsiApp.bacheca()}
        aria-label="Prome"
        className="mb-5 flex-none px-2.5 text-testo"
      >
        <Logo />
      </Link>

      {/* Scrivere un post si fa dal composer, in cima alla bacheca: questo
          bottone non era collegato a niente e compariva su ogni schermata. */}
      <Link
        href={percorsiApp.bacheca()}
        className="mb-4 flex h-11 flex-none items-center justify-center gap-2 rounded-full bg-primario text-[14.5px] font-extrabold text-primario-testo shadow-marchio transition-colors hover:bg-primary-600"
      >
        <Icona nome="piu" dimensione={18} />
        {t('nuovoPost')}
      </Link>

      {/* **Solo questa parte scorre.** È l'unica che cresce senza un tetto:
          l'elenco dei gruppi ne porta fino a otto, e su un portatile basso
          spingeva la zona di servizio sotto la piega — cioè «Impostazioni»
          spariva a chi ha molti gruppi, e restava a chi non ne ha. Il margine
          negativo dà spazio al contorno di messa a fuoco, che un contenitore
          che scorre taglierebbe. */}
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <nav aria-label={t('nav.bacheca')} className="flex flex-col gap-0.5">
          {VOCI.map((voce) => (
            <VoceColonna
              key={voce.chiave}
              voce={voce}
              percorso={percorso}
              etichetta={t(`nav.${voce.chiave}`)}
            />
          ))}
        </nav>

        {mieiGruppi.length ? (
          <>
            <p className="px-3 pb-2 pt-5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-testo-debole">
              {t('nav.tuoiGruppi')}
            </p>
            <ul className="flex flex-col gap-0.5 pb-1">
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
      </div>

      {/* La riga separa due categorie di cosa, non due gruppi di collegamenti:
          sopra i luoghi dove si lavora, sotto come funziona l'applicazione.
          L'uscita era già qui — è la zona, che prima non aveva un nome.

          Sta fuori dal contenitore che scorre, quindi è **sempre** a schermo:
          «Impostazioni» è una voce stabile del menu, non una che compare in
          fondo se lo spazio avanza. */}
      <div className="mt-2.5 flex flex-none flex-col gap-0.5 border-t border-bordo pt-2.5">
        {VOCI_SERVIZIO.map((voce) => (
          <VoceColonna
            key={voce.chiave}
            voce={voce}
            percorso={percorso}
            etichetta={t(`nav.${voce.chiave}`)}
            tenue
          />
        ))}

        {/* Chi vuole uscire — su un computer condiviso, in biblioteca — non
            deve attraversare una schermata piena di interruttori per farlo. */}
        <button
          type="button"
          disabled={inCorso}
          onClick={() => void esci()}
          className="flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold text-testo-tenue transition-colors hover:bg-superficie-alt-2 hover:text-testo disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icona nome="esci" />
          {t('nav.esci')}
        </button>
      </div>

      {/* Porta al **profilo**, non più alle impostazioni: mostra nome, corso e
          ateneo, cioè l'identità, e una scheda che mostra l'identità e apre il
          quadro elettrico è una porta con l'insegna sbagliata. */}
      <Link
        href={percorsiApp.profilo()}
        className="mt-2.5 flex flex-none items-center gap-2.5 rounded-2xl border border-bordo bg-superficie-alt p-3 transition-colors hover:border-tinta-menta-bordo"
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

/**
 * Una riga della colonna.
 *
 * Le voci di servizio nascono `tenue`: stessa forma e stessa altezza delle
 * altre — sono collegamenti come quelli — ma un grado più basse di voce,
 * perché non è lì che si va a lavorare.
 */
function VoceColonna({
  voce,
  percorso,
  etichetta,
  tenue = false,
}: {
  voce: VoceApp;
  percorso: string;
  etichetta: string;
  tenue?: boolean;
}) {
  const attiva = percorso.startsWith(voce.href);

  return (
    <Link
      href={voce.href}
      aria-current={attiva ? 'page' : undefined}
      className={cn(
        'flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors',
        attiva
          ? 'bg-tinta-menta font-extrabold text-primario-accento'
          : cn(
              'font-semibold hover:bg-superficie-alt-2',
              tenue ? 'text-testo-tenue hover:text-testo' : 'text-testo-corpo',
            ),
      )}
    >
      <Icona nome={voce.icona} />
      {etichetta}
    </Link>
  );
}
