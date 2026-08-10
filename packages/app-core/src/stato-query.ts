import type { UseQueryResult } from '@tanstack/react-query';
import { codiceErrore, messaggioErrore } from './errori';

/**
 * Stati in cui può trovarsi una lettura, già risolti in un solo valore.
 *
 * La logica sta qui una volta sola; web e mobile si limitano a disegnare i
 * cinque casi con i propri componenti. È ciò che rende possibile avere lo
 * stesso comportamento su entrambi i client senza duplicare le condizioni.
 */
export type StatoQuery<TDati> =
  | { stato: 'inattivo' }
  | { stato: 'caricamento' }
  | { stato: 'errore'; errore: unknown; messaggio: string; codice?: string }
  | { stato: 'vuoto'; inAggiornamento: boolean }
  | { stato: 'pronto'; dati: TDati; inAggiornamento: boolean };

export interface OpzioniStatoQuery<TDati> {
  /** Cosa conta come "vuoto": di norma lista senza elementi o dato assente. */
  eVuoto?: (dati: TDati) => boolean;
}

const vuotoPredefinito = <T>(dati: T): boolean => {
  if (dati === null || dati === undefined) return true;
  if (Array.isArray(dati)) return dati.length === 0;
  // L'envelope dell'API porta i dati in `data`: è quello da guardare.
  if (typeof dati === 'object' && 'data' in dati) {
    const contenuto = (dati as { data: unknown }).data;
    if (Array.isArray(contenuto)) return contenuto.length === 0;
    return contenuto === null || contenuto === undefined;
  }
  return false;
};

export function risolviStatoQuery<TDati>(
  query: Pick<
    UseQueryResult<TDati, unknown>,
    'data' | 'status' | 'error' | 'isFetching' | 'fetchStatus'
  >,
  opzioni: OpzioniStatoQuery<TDati> = {},
): StatoQuery<TDati> {
  const { eVuoto = vuotoPredefinito } = opzioni;
  const { data, status, error, isFetching, fetchStatus } = query;

  // Query disabilitata (`enabled: false`): non sta caricando, non ha dati.
  if (status === 'pending' && fetchStatus === 'idle') return { stato: 'inattivo' };
  if (status === 'pending') return { stato: 'caricamento' };

  if (status === 'error') {
    return {
      stato: 'errore',
      errore: error,
      messaggio: messaggioErrore(error),
      codice: codiceErrore(error),
    };
  }

  if (eVuoto(data as TDati)) return { stato: 'vuoto', inAggiornamento: isFetching };
  return { stato: 'pronto', dati: data as TDati, inAggiornamento: isFetching };
}
