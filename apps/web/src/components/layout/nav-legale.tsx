import { DOCUMENTI_LEGALI } from '@/content';
import { Link } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

/**
 * L'elenco dei documenti legali, con la voce corrente evidenziata.
 *
 * `corrente` è l'href della pagina che la monta: prima l'evidenza la decideva
 * il flag `attivo` dei dati, che però significa «la pagina esiste» — e appena
 * i documenti attivi sono diventati due, due voci risultavano `aria-current`
 * insieme. Quale voce è quella corrente lo sa solo la pagina, non il dato.
 */
export function NavLegale({ corrente, titolo }: { corrente: string; titolo: string }) {
  return (
    <>
      <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
        {titolo}
      </p>
      <ul className="mb-6 flex flex-col gap-0.5">
        {DOCUMENTI_LEGALI.map((documento) => {
          const eCorrente = documento.attivo && documento.href === corrente;
          return (
            <li key={documento.titolo}>
              <Link
                href={documento.href}
                aria-current={eCorrente ? 'page' : undefined}
                className={cn(
                  'block rounded-[11px] px-3 py-2.5 text-[13px]',
                  eCorrente
                    ? 'bg-tinta-menta font-extrabold text-primario-accento'
                    : 'font-semibold text-testo-tenue hover:bg-superficie-alt',
                )}
              >
                {documento.titolo}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
