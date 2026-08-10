import { ApiClientError } from '@prome/api-client';
import type { ApiErrorResponse, ValidationErrorDetail } from '@prome/contracts';
import { messaggioErrorePredefinito } from './feedback';

/** Codice con cui il server marca gli errori di validazione dell'ingresso. */
export const CODICE_ERRORE_VALIDAZIONE = 'V001';

export function eErroreApi(errore: unknown): errore is ApiClientError {
  return errore instanceof ApiClientError;
}

/** Risposta di errore del server, se la chiamata è arrivata a destinazione. */
export function rispostaErrore(errore: unknown): ApiErrorResponse | undefined {
  return eErroreApi(errore) ? errore.errore : undefined;
}

/**
 * Messaggio da mostrare all'utente. Arriva già tradotto dal server: i client
 * non traducono mai i messaggi delle API, li mostrano e basta. Il ripiego
 * serve solo quando la risposta non c'è (rete assente, timeout).
 */
export function messaggioErrore(errore: unknown): string {
  return rispostaErrore(errore)?.message ?? messaggioErrorePredefinito();
}

/** Codice del punto di lancio lato server: da mostrare nelle segnalazioni. */
export function codiceErrore(errore: unknown): string | undefined {
  return rispostaErrore(errore)?.errorCode;
}

/** Identificativo per correlare la segnalazione dell'utente con i log. */
export function riferimentoErrore(errore: unknown): string | undefined {
  return rispostaErrore(errore)?.errorId;
}

/** Dettagli per campo, presenti solo negli errori di validazione. */
export function dettagliValidazione(errore: unknown): ValidationErrorDetail[] {
  const risposta = rispostaErrore(errore);
  if (!risposta || risposta.errorCode !== CODICE_ERRORE_VALIDAZIONE) return [];
  return risposta.details ?? [];
}

export function eErroreValidazione(errore: unknown): boolean {
  return dettagliValidazione(errore).length > 0;
}

/** Vero quando la richiesta non è mai arrivata a una risposta del server. */
export function eErroreDiRete(errore: unknown): boolean {
  return !eErroreApi(errore);
}
