import { cn } from '@/lib/utils';

export interface OpzioneRadio<T extends string> {
  valore: T;
  etichetta: string;
  /** Cosa comporta la scelta. Non è decorazione: è la scelta stessa. */
  descrizione?: string;
  /** Campione visivo al posto del pallino: serve alla scelta del tema. */
  campione?: string;
  /** Scelta che in questo contesto non è offribile, con la sua ragione a schermo. */
  impossibile?: boolean;
}

export interface SceltaRadioProps<T extends string> {
  opzioni: readonly OpzioneRadio<T>[];
  valore: T | null;
  /** Cosa si sta scegliendo: lo legge chi non vede lo schermo. */
  etichetta: string;
  inCorso?: boolean;
  disabilitato?: boolean;
  /** Colonne su schermo largo. Sotto, sempre una. */
  colonne?: 2 | 3;
  className?: string;
  onScegli: (valore: T) => void;
}

/**
 * Scelta singola fra opzioni che hanno conseguenze.
 *
 * Card e non un menu a tendina: fra Privato, Ateneo e Pubblico la differenza è
 * troppo concreta per stare in una parola sola, e ogni opzione deve poter dire
 * cosa comporta. Era rifatta a mano in **quattro** punti — privacy, tema,
 * creazione di un'aula, creazione di un gruppo — con classi quasi identiche e
 * un `role="radio"` scritto ogni volta da capo.
 *
 * Il bordo attivo usa `border-primary-500`, cioè la rampa e non un ruolo: è il
 * menta del marchio, che nei due temi resta lo stesso colore di proposito.
 */
export function SceltaRadio<T extends string>({
  opzioni,
  valore,
  etichetta,
  inCorso = false,
  disabilitato = false,
  colonne = 3,
  className,
  onScegli,
}: SceltaRadioProps<T>) {
  const spenta = inCorso || disabilitato;

  return (
    <div
      role="radiogroup"
      aria-label={etichetta}
      aria-busy={inCorso}
      className={cn(
        'grid gap-2.5',
        colonne === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        className,
      )}
    >
      {opzioni.map((opzione) => {
        const scelta = opzione.valore === valore;
        const inerte = spenta || Boolean(opzione.impossibile);

        return (
          <button
            key={opzione.valore}
            type="button"
            role="radio"
            aria-checked={scelta}
            disabled={inerte}
            // Riscegliere ciò che è già scelto non è un cambio: evita una
            // richiesta e un avviso che confermerebbe una cosa già vera.
            onClick={() => !scelta && onScegli(opzione.valore)}
            className={cn(
              'rounded-[14px] border-2 p-3.5 text-left transition-colors',
              scelta
                ? 'border-primary-500 bg-tinta-menta-velo'
                : 'border-bordo bg-superficie hover:border-tinta-menta-bordo',
              inCorso && 'cursor-progress',
              inerte && 'opacity-55',
            )}
          >
            {opzione.campione ? (
              <span
                aria-hidden
                style={{ background: opzione.campione }}
                className="mb-2.5 block h-9 w-full rounded-[10px] border border-bordo"
              />
            ) : null}
            <span
              className={cn(
                'block text-[13.5px] font-extrabold',
                scelta ? 'text-primario-accento' : 'text-testo',
              )}
            >
              {opzione.etichetta}
            </span>
            {opzione.descrizione ? (
              <span className="mt-1 block text-[11.5px] leading-snug text-testo-tenue">
                {opzione.descrizione}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
