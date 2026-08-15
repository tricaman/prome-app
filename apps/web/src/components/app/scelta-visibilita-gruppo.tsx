'use client';

import { useTranslations } from 'next-intl';
import type { CreaGruppoDtoVisibilita } from '@prome/api-client';
import { cn } from '@/lib/utils';

const OPZIONI: readonly {
  valore: CreaGruppoDtoVisibilita;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', chiave: 'privato' },
  { valore: 'ATENEO', chiave: 'ateneo' },
  { valore: 'PUBBLICO', chiave: 'pubblico' },
];

/**
 * Chi può vedere il gruppo.
 *
 * «Pubblico» significa **aperto agli iscritti a Prome**, mai al web: nessun
 * gruppo ha una pagina pubblica, e la descrizione a schermo non deve lasciar
 * credere il contrario. Vedere un gruppo non è farne parte: si entra per
 * invito, sempre.
 */
export function SceltaVisibilitaGruppo({
  valore,
  onScegli,
  disabilitato = false,
}: {
  valore: CreaGruppoDtoVisibilita;
  onScegli: (valore: CreaGruppoDtoVisibilita) => void;
  disabilitato?: boolean;
}) {
  const t = useTranslations('app.gruppo.visibilita');

  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {OPZIONI.map((opzione) => {
        const scelta = opzione.valore === valore;
        return (
          <button
            key={opzione.valore}
            type="button"
            aria-pressed={scelta}
            disabled={disabilitato}
            onClick={() => !scelta && onScegli(opzione.valore)}
            className={cn(
              'rounded-[14px] border-2 p-3.5 text-left transition-colors',
              scelta
                ? 'border-primary-500 bg-tinta-menta-velo'
                : 'border-bordo bg-superficie hover:border-tinta-menta-bordo',
              disabilitato && 'cursor-progress opacity-60',
            )}
          >
            <span className="mb-1.5 flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'grid size-[18px] place-items-center rounded-full border-2',
                  scelta ? 'border-primary-500' : 'border-bordo-forte',
                )}
              >
                {scelta ? <span className="size-2.5 rounded-full bg-primary-600" /> : null}
              </span>
              <span className="text-[13.5px] font-extrabold text-testo">{t(opzione.chiave)}</span>
            </span>
            <span className="block text-[11.5px] leading-snug text-testo-tenue">
              {t(`${opzione.chiave}Testo`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
