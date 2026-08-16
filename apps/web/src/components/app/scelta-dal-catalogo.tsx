'use client';

import { useState, type ReactNode } from 'react';
import { Icona, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Il campo con cui si sceglie una voce del catalogo accademico.
 *
 * È una **scelta, non una scrittura**: il catalogo è chiuso, quindi ciò che si
 * digita serve solo a cercare e il valore vero è la voce selezionata. Il campo
 * di testo non è collegato al form — se lo fosse, chi scrive «Bologna» e non
 * sceglie niente si troverebbe un modulo che sembra compilato e un server che
 * lo rifiuta.
 *
 * Si completa da tastiera — ↑↓ per scorrere, Invio per scegliere — perché sono
 * i campi con più opzioni del modulo e passare al mouse rompe la compilazione.
 *
 * Vive qui e non dentro l'onboarding perché lo usano **due schermate**: la
 * prima compilazione e la correzione dei dati. Due copie divergerebbero, e
 * quella dimenticata sarebbe la seconda.
 */
export interface VoceDelCatalogo {
  id: string;
  /** Quello che compare nel campo quando la voce è scelta. */
  titolo: string;
  /** Riga secondaria: la città dell'ateneo, la classe e la durata del corso. */
  dettaglio: string;
  /** Due lettere nel quadratino a sinistra. */
  sigla: string;
}

export function SceltaDalCatalogo({
  etichetta,
  segnaposto,
  nessunRisultato,
  inCaricamento,
  voci,
  sceltaId,
  ricerca,
  onRicerca,
  onScelta,
  disabilitato,
  aiuto,
  errore,
  sotto,
}: {
  etichetta: string;
  segnaposto: string;
  nessunRisultato: string;
  inCaricamento: boolean;
  voci: VoceDelCatalogo[];
  sceltaId: string | null;
  ricerca: string;
  onRicerca: (termine: string) => void;
  onScelta: (voce: VoceDelCatalogo) => void;
  disabilitato?: boolean;
  aiuto?: string;
  errore?: string;
  /** Riga sotto al campo: «non trovi il tuo corso?» e simili. */
  sotto?: ReactNode;
}) {
  const [evidenziato, setEvidenziato] = useState(0);
  const [aperto, setAperto] = useState(false);

  const scelta = voci.find((voce) => voce.id === sceltaId);
  // Chi ha già scelto ha finito: l'elenco sparisce invece di restare aperto
  // sopra il campo successivo.
  const daMostrare = aperto && !(scelta && scelta.titolo === ricerca);

  const gestisciTasto = (tasto: string, previeni: () => void) => {
    if (tasto === 'ArrowDown') {
      previeni();
      setEvidenziato((corrente) => Math.min(corrente + 1, voci.length - 1));
    } else if (tasto === 'ArrowUp') {
      previeni();
      setEvidenziato((corrente) => Math.max(corrente - 1, 0));
    } else if (tasto === 'Enter' && aperto && voci[evidenziato]) {
      previeni();
      onScelta(voci[evidenziato]!);
      setAperto(false);
    }
  };

  return (
    <div
      className="relative"
      onFocusCapture={() => setAperto(true)}
      // La chiusura è ritardata di poco: senza, il clic su un suggerimento
      // arriverebbe dopo che l'elenco è già sparito.
      onBlurCapture={() => window.setTimeout(() => setAperto(false), 120)}
      onKeyDown={(evento) => gestisciTasto(evento.key, () => evento.preventDefault())}
    >
      <Input
        etichetta={etichetta}
        segnaposto={segnaposto}
        valore={ricerca}
        onChange={(valore) => {
          onRicerca(valore);
          setEvidenziato(0);
        }}
        obbligatorio
        disabilitato={disabilitato}
        aiuto={aiuto}
        errore={errore}
      />

      {daMostrare && !disabilitato ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-bordo bg-superficie shadow-lg">
          {voci.length ? (
            <ul>
              {voci.map((voce, indice) => (
                <li key={voce.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onScelta(voce);
                      setAperto(false);
                    }}
                    onMouseEnter={() => setEvidenziato(indice)}
                    className={cn(
                      'flex w-full items-center gap-3.5 border-b border-superficie-alt-2 px-4 py-3 text-left transition-colors last:border-b-0',
                      indice === evidenziato ? 'bg-superficie-alt' : 'bg-superficie',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-9 flex-none place-items-center rounded-xl bg-tinta-menta text-xs font-extrabold text-tinta-menta-testo"
                    >
                      {voce.sigla}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold text-testo">
                        {voce.titolo}
                      </span>
                      <span className="block truncate text-xs text-testo-didascalia">
                        {voce.dettaglio}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-testo-tenue">
              <Icona nome="cerca" dimensione={16} />
              {inCaricamento ? '…' : nessunRisultato}
            </p>
          )}
        </div>
      ) : null}

      {sotto}
    </div>
  );
}
