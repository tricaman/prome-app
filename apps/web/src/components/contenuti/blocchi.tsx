import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigazione';
import { Card, Heading } from '@/components/ui';
import { Breadcrumb, Container, type VoceBriciole } from '@/components/layout';
import { cn } from '@/lib/utils';

/**
 * Blocchi ricorrenti delle pagine pubbliche.
 *
 * Sono la struttura, non il contenuto: testata, sezione, statistica, richiamo
 * finale. Averli qui evita che ogni pagina reinventi spaziature e gerarchie,
 * ed è ciò che fa sembrare il sito una cosa sola.
 */

export interface TestataPaginaProps {
  briciole: readonly VoceBriciole[];
  titolo: ReactNode;
  sommario?: ReactNode;
  /** Contenuto a destra del titolo: azioni o riquadri. */
  fianco?: ReactNode;
  /** Sotto il sommario: chip, statistiche, righe di contesto. */
  children?: ReactNode;
  variante?: 'piena' | 'menta';
  className?: string;
}

/** Testata di una pagina interna: percorso, titolo, sommario. */
export function TestataPagina({
  briciole,
  titolo,
  sommario,
  fianco,
  children,
  variante = 'piena',
  className,
}: TestataPaginaProps) {
  return (
    <div
      className={cn(
        'border-b border-bordo px-0 py-7',
        variante === 'menta'
          ? 'bg-gradient-to-br from-tinta-menta to-tinta-menta-velo'
          : 'bg-superficie',
        className,
      )}
    >
      <Container>
        <Breadcrumb voci={briciole} className="mb-4" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <Heading livello={1} taglia="xl">
              {titolo}
            </Heading>
            {sommario ? (
              <p className="mt-2.5 max-w-[760px] text-base leading-relaxed text-testo-tenue">
                {sommario}
              </p>
            ) : null}
            {children}
          </div>
          {fianco ? <div className="flex-none">{fianco}</div> : null}
        </div>
      </Container>
    </div>
  );
}

/** Titolo di sezione con eventuale collegamento "vedi tutto" a destra. */
export function TitoloSezione({
  children,
  azione,
  className,
}: {
  children: ReactNode;
  azione?: { etichetta: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn('mb-3.5 flex items-end justify-between gap-4', className)}>
      <Heading taglia="lg">{children}</Heading>
      {azione ? (
        <Link
          href={azione.href}
          className="flex-none text-[13.5px] font-extrabold text-primario-collegamento hover:text-primario-accento"
        >
          {azione.etichetta}
        </Link>
      ) : null}
    </div>
  );
}

/** Impaginazione a due colonne: contenuto e colonna contestuale. */
export function ColonneContenuto({
  children,
  fianco,
  larghezzaFianco = 300,
  className,
}: {
  children: ReactNode;
  fianco: ReactNode;
  larghezzaFianco?: 300 | 320;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-6',
        larghezzaFianco === 320 ? 'lg:grid-cols-[1fr_320px]' : 'lg:grid-cols-[1fr_300px]',
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <aside className="flex flex-col gap-4">{fianco}</aside>
    </div>
  );
}

/** Riquadro della colonna laterale: etichetta piccola e contenuto. */
export function RiquadroLaterale({
  titolo,
  children,
  variante = 'piena',
}: {
  titolo?: string;
  children: ReactNode;
  variante?: 'piena' | 'menta';
}) {
  return (
    <Card variante={variante} padding="sm">
      {titolo ? (
        <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
          {titolo}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

/** Numero grande con la sua etichetta: le prove sociali degli hub. */
export function Statistica({
  valore,
  etichetta,
  variante = 'scheda',
}: {
  valore: string;
  etichetta: string;
  variante?: 'scheda' | 'nuda' | 'centrata';
}) {
  const numero = (
    <span
      className={cn(
        'block font-display font-extrabold tracking-[-0.03em]',
        variante === 'nuda' ? 'text-2xl' : 'text-[28px]',
        variante === 'centrata' && 'text-[30px] text-primario-collegamento',
      )}
    >
      {valore}
    </span>
  );
  const testo = (
    <span
      className={cn(
        'mt-1 block text-[12.5px] font-bold',
        variante === 'nuda' ? 'text-[11.5px] uppercase text-testo-debole' : 'text-testo-didascalia',
      )}
    >
      {etichetta}
    </span>
  );

  if (variante === 'nuda') {
    return (
      <div>
        {numero}
        {testo}
      </div>
    );
  }

  return (
    <Card
      variante={variante === 'centrata' ? 'tenue' : 'piena'}
      padding="sm"
      className={variante === 'centrata' ? 'text-center' : undefined}
    >
      {numero}
      {testo}
    </Card>
  );
}

/** Richiamo finale in tinta menta: chiude una pagina senza sembrare un banner. */
export function RichiamoMenta({
  titolo,
  testo,
  azioni,
  className,
}: {
  titolo: ReactNode;
  testo: ReactNode;
  azioni?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-tinta-menta to-tinta-menta-velo p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <Heading taglia="lg" className="text-tinta-menta-testo">
          {titolo}
        </Heading>
        <p className="mt-3 max-w-[520px] text-base leading-relaxed text-primario-accento">{testo}</p>
      </div>
      {azioni ? <div className="flex flex-none flex-wrap gap-3">{azioni}</div> : null}
    </div>
  );
}
