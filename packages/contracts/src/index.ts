/**
 * Contratto client di Prome — versione 1.
 *
 * Regole di evoluzione (architecture-doc §6, CO1): dentro una versione i campi
 * si aggiungono soltanto, mai rimossi o cambiati di significato; i client sono
 * tolerant reader.
 *
 * OGNI risposta dell'API usa una di queste due forme:
 * - successo → ApiEnvelope<T>   (wrappata automaticamente dal ResponseInterceptor)
 * - errore   → ApiErrorResponse (prodotta dal filtro eccezioni globale)
 * I messaggi (meta.message / message) sono già tradotti dal server in base
 * alla lingua della richiesta (`?lang` > header `x-lang` > `Accept-Language`).
 */
export const API_VERSION = 'v1';

// ---------------------------------------------------------------------------
// Uscita: envelope di successo
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResponseMeta {
  status: number;
  /** Messaggio di esito, già tradotto dal server. */
  message: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ResponseMeta;
}

/**
 * Forma che i service ritornano per le liste paginate; l'interceptor la
 * riconosce e sposta `meta` in `ApiEnvelope.meta.pagination`.
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Uscita: risposta di errore
// ---------------------------------------------------------------------------

export interface ValidationErrorDetail {
  /** Campo del body/query che non ha passato la validazione. */
  field: string;
  /** Nome del vincolo violato (es. isString, maxLength). */
  constraint: string;
  /** Messaggio già tradotto dal server. */
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  /**
   * Localizzatore del punto esatto in cui l'errore è stato lanciato
   * (es. PR001, BA002, V001, H404). Indipendente dal messaggio.
   */
  errorCode: string;
  /** Messaggio già tradotto dal server. */
  message: string;
  /** UUID per correlare la segnalazione dell'utente con i log del server. */
  errorId: string;
  timestamp: string;
  /** Presente solo per gli errori di validazione (errorCode V001). */
  details?: ValidationErrorDetail[];
}

// ---------------------------------------------------------------------------
// Ingresso: parametri standard delle liste
// ---------------------------------------------------------------------------

export interface PaginationParams {
  /** Default 1. */
  page?: number;
  /** Default 20, massimo 100. */
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok';
  role: 'app' | 'worker';
  version: string;
}
