'use client';

import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { risolviStatoQuery, type OpzioniStatoQuery } from '@prome/app-core';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

export interface QueryBoundaryProps<TDati> extends OpzioniStatoQuery<TDati> {
  query: UseQueryResult<TDati, unknown>;
  /** Riceve i dati solo quando esistono davvero: niente `data!` nelle pagine. */
  children: (dati: TDati) => ReactNode;
  /** Sostituisce lo stato di attesa (es. con scheletri su misura). */
  caricamento?: ReactNode;
  /** Sostituisce lo stato vuoto (di solito per dare un'azione all'utente). */
  vuoto?: ReactNode;
  /** Sostituisce lo stato di errore. */
  errore?: (errore: unknown, riprova: () => void) => ReactNode;
  /** Con `true` non mostra l'indicatore di aggiornamento in secondo piano. */
  nascondiAggiornamento?: boolean;
  dimensione?: 'contenuta' | 'piena';
}

/**
 * Attesa, errore, vuoto e dati: i quattro esiti di una lettura, risolti una
 * volta sola. La pagina descrive solo il caso in cui i dati ci sono.
 *
 * La logica degli stati vive nel pacchetto condiviso, quindi web e mobile si
 * comportano allo stesso modo; qui si decide soltanto come appaiono.
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
  nascondiAggiornamento = false,
  dimensione = 'contenuta',
  eVuoto,
}: QueryBoundaryProps<TDati>) {
  const stato = risolviStatoQuery(query, { eVuoto });

  switch (stato.stato) {
    case 'inattivo':
      return null;

    case 'caricamento':
      return <>{caricamento ?? <LoadingState dimensione={dimensione} />}</>;

    case 'errore':
      return (
        <>
          {errore?.(stato.errore, () => void query.refetch()) ?? (
            <ErrorState
              errore={stato.errore}
              dimensione={dimensione}
              onRiprova={() => void query.refetch()}
            />
          )}
        </>
      );

    case 'vuoto':
      return <>{vuoto ?? <EmptyState />}</>;

    case 'pronto':
      return (
        <>
          {children(stato.dati)}
          {/* Aggiornamento in secondo piano: i dati restano a schermo, così
              l'utente non perde il posto in cui stava leggendo. */}
          {stato.inAggiornamento && !nascondiAggiornamento ? <IndicatoreAggiornamento /> : null}
        </>
      );
  }
}

function IndicatoreAggiornamento() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-4 right-4 h-2 w-2 animate-pulse rounded-full bg-primario shadow-md"
    />
  );
}
