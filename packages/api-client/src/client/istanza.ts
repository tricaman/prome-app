import type { ApiErrorResponse } from '@prome/contracts';
import type { Lingua } from '@prome/i18n';

/**
 * Istanza fetch condivisa da TUTTE le chiamate generate da Orval.
 * Il client (web o mobile) la configura una volta all'avvio; da quel momento
 * ogni richiesta parte con la base URL giusta e la lingua nell'header `x-lang`,
 * così i messaggi del server (meta.message, errori) arrivano già tradotti.
 */
export interface ConfigurazioneApiClient {
  baseUrl: string;
  /** Lingua corrente dell'utente; letta a ogni richiesta. */
  lingua?: () => Lingua | undefined;
  /** Token di accesso; letto a ogni richiesta (quando arriverà l'auth). */
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
    super(errore.message);
    this.name = 'ApiClientError';
  }
}

export const istanzaApi = async <T>(url: string, options: RequestInit): Promise<T> => {
  if (!configurazione) {
    throw new Error('Api client non configurato: chiamare configuraApiClient() all\'avvio.');
  }

  const headers = new Headers(options.headers);
  const lingua = configurazione.lingua?.();
  if (lingua && !headers.has('x-lang')) headers.set('x-lang', lingua);
  const token = await configurazione.token?.();
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);

  const risposta = await fetch(`${configurazione.baseUrl}${url}`, { ...options, headers });

  const corpo: unknown =
    risposta.status === 204 ? undefined : await risposta.json().catch(() => undefined);

  if (!risposta.ok) {
    throw new ApiClientError(corpo as ApiErrorResponse, risposta.status);
  }
  return corpo as T;
};
