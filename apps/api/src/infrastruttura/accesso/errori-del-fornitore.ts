import { HttpStatus, Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions';
import { ProfiloErrorCode } from '../../modules/profilo/constants/error-codes';

/**
 * Traduce un errore del fornitore di identità in un errore nostro.
 *
 * Il fornitore ha il proprio vocabolario di errori, in inglese, con una forma
 * di risposta diversa dalla nostra. Questa funzione è l'unico punto in cui
 * quel vocabolario entra, e da qui esce sempre una `AppException`: il client
 * vede una sola forma di errore, con `errorCode`, `errorId` e messaggio già
 * tradotto, esattamente come per ogni altro endpoint.
 *
 * Ciò che non riconosciamo non diventa un 500 muto: diventa un errore
 * spiegato, con il dettaglio vero confinato nei log.
 */
const logger = new Logger('Accesso');

/** I codici che il plugin del codice via email può produrre. */
const TRADUZIONE = {
  INVALID_OTP: {
    codice: ProfiloErrorCode.CODICE_NON_VALIDO,
    messaggio: 'CODICE_NON_VALIDO',
    stato: HttpStatus.UNAUTHORIZED,
  },
  OTP_EXPIRED: {
    codice: ProfiloErrorCode.CODICE_SCADUTO,
    messaggio: 'CODICE_SCADUTO',
    stato: HttpStatus.UNAUTHORIZED,
  },
  TOO_MANY_ATTEMPTS: {
    codice: ProfiloErrorCode.TROPPI_TENTATIVI,
    messaggio: 'TROPPI_TENTATIVI',
    stato: HttpStatus.TOO_MANY_REQUESTS,
  },
} as const;

/** Estrae il codice del fornitore da un errore di forma sconosciuta. */
function codiceDelFornitore(errore: unknown): string | undefined {
  if (typeof errore !== 'object' || errore === null) return undefined;
  const corpo = (errore as { body?: unknown }).body;
  if (typeof corpo === 'object' && corpo !== null && 'code' in corpo) {
    const codice = (corpo as { code?: unknown }).code;
    if (typeof codice === 'string') return codice;
  }
  return undefined;
}

/**
 * @param errore   quello che il fornitore ha lanciato
 * @param ripiego  come chiamare ciò che non sappiamo riconoscere
 */
export function traduciErroreDelFornitore(
  errore: unknown,
  ripiego: { codice: ProfiloErrorCode; messaggio: 'INVIO_CODICE_FALLITO' | 'VERIFICA_FALLITA' },
): AppException {
  const codice = codiceDelFornitore(errore);
  const nota = codice ? TRADUZIONE[codice as keyof typeof TRADUZIONE] : undefined;

  if (nota) {
    return new AppException(nota.codice, nota.messaggio, nota.stato);
  }

  // Sconosciuto: il dettaglio resta nei log, all'utente va una frase che si
  // può leggere. Mai contenuti o indirizzi nei log — solo la forma dell'errore.
  logger.error(
    `Errore non riconosciuto dal fornitore di identità: ${codice ?? '(senza codice)'}`,
    errore instanceof Error ? errore.stack : undefined,
  );
  return new AppException(
    ripiego.codice,
    ripiego.messaggio,
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
