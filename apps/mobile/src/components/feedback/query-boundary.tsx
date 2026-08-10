import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { risolviStatoQuery, type OpzioniStatoQuery } from '@prome/app-core';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

export interface QueryBoundaryProps<TDati> extends OpzioniStatoQuery<TDati> {
  query: UseQueryResult<TDati, unknown>;
  /** Riceve i dati solo quando esistono davvero. */
  children: (dati: TDati) => ReactNode;
  caricamento?: ReactNode;
  vuoto?: ReactNode;
  errore?: (errore: unknown, riprova: () => void) => ReactNode;
}

/**
 * Attesa, errore, vuoto e dati: gli stessi quattro esiti del web, risolti
 * dalla stessa funzione condivisa. Cambia solo come vengono disegnati.
 *
 * ```tsx
 * const aule = useElencoAuleStudio()
 * <QueryBoundary query={aule}>
 *   {({ data }) => <ElencoAule aule={data} />}
 * </QueryBoundary>
 * ```
 */
export function QueryBoundary<TDati>({
  query,
  children,
  caricamento,
  vuoto,
  errore,
  eVuoto,
}: QueryBoundaryProps<TDati>) {
  const stato = risolviStatoQuery(query, { eVuoto });

  switch (stato.stato) {
    case 'inattivo':
      return null;
    case 'caricamento':
      return <>{caricamento ?? <LoadingState />}</>;
    case 'errore':
      return (
        <>
          {errore?.(stato.errore, () => void query.refetch()) ?? (
            <ErrorState errore={stato.errore} onRiprova={() => void query.refetch()} />
          )}
        </>
      );
    case 'vuoto':
      return <>{vuoto ?? <EmptyState />}</>;
    case 'pronto':
      return <>{children(stato.dati)}</>;
  }
}
