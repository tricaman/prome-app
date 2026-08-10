import { Fragment } from 'react';
import { Link } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

export interface VoceBriciole {
  etichetta: string;
  /** Assente sull'ultima voce: la pagina corrente non è un collegamento. */
  href?: string;
}

/**
 * Percorso di navigazione.
 *
 * Serve a due lettori diversi: alla persona, per capire dove si trova nella
 * gerarchia del sito, e al motore di ricerca, che lo mostra al posto dell'URL
 * nei risultati — per quello va accompagnato dai dati strutturati
 * `BreadcrumbList` della stessa pagina.
 */
export function Breadcrumb({
  voci,
  className,
}: {
  voci: readonly VoceBriciole[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Percorso"
      className={cn('flex flex-wrap items-center gap-2 text-[12.5px] font-semibold', className)}
    >
      {voci.map((voce, indice) => {
        const ultima = indice === voci.length - 1;
        return (
          <Fragment key={`${voce.etichetta}-${indice}`}>
            {indice > 0 ? (
              <span aria-hidden className="text-testo-debole">
                /
              </span>
            ) : null}
            {voce.href && !ultima ? (
              <Link href={voce.href} className="text-primario-collegamento hover:text-primario-accento">
                {voce.etichetta}
              </Link>
            ) : (
              <span className="font-extrabold text-testo-corpo" aria-current="page">
                {voce.etichetta}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
