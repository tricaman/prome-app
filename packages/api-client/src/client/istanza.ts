import type { ApiErrorResponse } from '@prome/contracts';
import type { Lingua } from '@prome/i18n';

/**
 * Istanza fetch condivisa da TUTTE le chiamate generate da Orval.
 * Il client (web o mobile) la configura una volta all'avvio; da quel momento
 * ogni richiesta parte con la base URL giusta, la lingua nell'header `x-lang`
 * e — se c'è una sessione — il token in `Authorization`, così i messaggi del
 * server (meta.message, errori) arrivano già tradotti e autenticati.
 */
export interface ConfigurazioneApiClient {
  baseUrl: string;
  /** Lingua corrente dell'utente; letta a ogni richiesta. */
  lingua?: () => Lingua | undefined;
  /** Token di sessione; letto a ogni richiesta, non catturato una volta sola. */
  token?: () => string | undefined | Promise<string | undefined>;
}

let configurazione: ConfigurazioneApiClient | undefined;

export function configuraApiClient(config: ConfigurazioneApiClient): void {
  configurazione = config;
}

/**
 * Errore lanciato per ogni risposta non-2xx: trasporta la ApiErrorResponse del
 * contratto (message già tradotto, errorCode, errorId da mostrare/segnalare).
 */
export class ApiClientError extends Error {
  constructor(
    public readonly errore: ApiErrorResponse,
    public readonly status: number,
  ) {
    super(errore?.message ?? 'Errore di rete');
    this.name = 'ApiClientError';
  }
}

/**
 * La forma con cui Orval descrive una richiesta.
 *
 * È il contratto del "custom instance": un oggetto solo con indirizzo, metodo
 * ed eventuale corpo. Cambiarlo qui senza rigenerare il client — o viceversa —
 * produce tipi che non descrivono ciò che arriva, quindi i due vanno letti
 * insieme (vedi il commento in `orval.config.ts`).
 */
export interface RichiestaApi {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  signal?: AbortSignal;
}

/** Query string dai parametri, saltando quelli non valorizzati. */
function stringaDiRicerca(params?: Record<string, unknown>): string {
  if (!params) return '';
  const cerca = new URLSearchParams();
  for (const [nome, valore] of Object.entries(params)) {
    if (valore === undefined || valore === null) continue;
    cerca.set(nome, String(valore));
  }
  const stringa = cerca.toString();
  return stringa ? `?${stringa}` : '';
}

export const istanzaApi = async <T>(
  richiesta: RichiestaApi,
  opzioni?: RequestInit,
): Promise<T> => {
  if (!configurazione) {
    throw new Error("Api client non configurato: chiamare configuraApiClient() all'avvio.");
  }

  const headers = new Headers({ ...richiesta.headers, ...(opzioni?.headers as HeadersInit) });
  const lingua = configurazione.lingua?.();
  if (lingua && !headers.has('x-lang')) headers.set('x-lang', lingua);
  const token = await configurazione.token?.();
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);

  const risposta = await fetch(
    `${configurazione.baseUrl}${richiesta.url}${stringaDiRicerca(richiesta.params)}`,
    {
      ...opzioni,
      method: richiesta.method,
      headers,
      body: richiesta.data === undefined ? undefined : JSON.stringify(richiesta.data),
      signal: richiesta.signal ?? opzioni?.signal,
    },
  );

  const corpo: unknown =
    risposta.status === 204 ? undefined : await risposta.json().catch(() => undefined);

  if (!risposta.ok) {
    throw new ApiClientError(corpo as ApiErrorResponse, risposta.status);
  }
  return corpo as T;
};
