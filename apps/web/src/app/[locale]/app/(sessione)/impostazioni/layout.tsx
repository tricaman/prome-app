import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AppTopbar } from '@/components/app/app-topbar';
import { NavImpostazioni } from '@/components/app/nav-impostazioni';

/**
 * La cornice delle impostazioni: indice a sinistra, sezione a destra.
 *
 * Il listone di prima era una pagina sola con cinque ancore, e tutti i
 * controlli aperti nella stessa colonna. Qui **ogni sezione è una rotta**, il
 * che su un browser è la differenza che conta: l'indirizzo si può salvare fra i
 * preferiti, mandare a qualcuno, e il tasto indietro fa quello che ci si
 * aspetta. L'indice resta a schermo mentre il pannello cambia.
 *
 * L'indice sta nel layout e non nelle pagine perché è lo stesso per tutte, e
 * perché così ogni sezione nuova nasce dentro la cornice: il muro di sessione
 * è più su ancora, sul gruppo `(sessione)`, quindi una rotta qui nasce
 * protetta senza che nessuno debba ricordarsene.
 *
 * Il bottone «Torna al profilo» non c'è più: era una destinazione dentro la
 * barra di una schermata, e ora sia «Profilo» sia «Impostazioni» stanno nella
 * colonna, una sopra l'altra. Restava a dire due volte la stessa cosa, la
 * seconda nel posto sbagliato.
 */
export default async function LayoutImpostazioni({ children }: { children: ReactNode }) {
  const t = await getTranslations('app.impostazioni');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[300px] flex-none overflow-y-auto border-r border-bordo bg-superficie px-3 py-5 lg:block">
          <NavImpostazioni />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          {/* Sotto lo schermo largo l'indice sta nella stessa colonna, e
              chiuso: aperto spingerebbe il pannello sotto la piega, cioè
              costringerebbe a scorrere tutto l'elenco per leggere la sezione
              che si è appena scelta. `details` lo apre senza una riga di
              stato, e resta accessibile da tastiera. */}
          <details className="mb-6 rounded-2xl border border-bordo bg-superficie lg:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-[13.5px] font-extrabold text-testo">
              {t('titolo')}
            </summary>
            <div className="border-t border-bordo px-2 py-3">
              <NavImpostazioni />
            </div>
          </details>
          <div className="max-w-[680px]">{children}</div>
        </div>
      </div>
    </>
  );
}
