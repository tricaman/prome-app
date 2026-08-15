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

// --- Accesso --------------------------------------------------------------
//
// Un solo modo di entrare: si chiede un codice all'indirizzo email e lo si
// verifica. Non esistono password, e non esiste una registrazione separata —
// chi verifica un codice per la prima volta ottiene un account. È il motivo
// per cui non c'è un endpoint "registrati".

export interface RichiestaCodiceRequest {
  email: string;
}

export interface RichiestaCodiceResponse {
  /**
   * Quando il codice smette di valere, in ISO 8601. Serve al client per dire
   * «scade fra N minuti» senza inventarsi la durata.
   */
  scadeIl: string;
}

export interface VerificaCodiceRequest {
  email: string;
  codice: string;
}

export interface VerificaCodiceResponse {
  /** Da rimandare a ogni richiesta come `Authorization: Bearer <token>`. */
  token: string;
  /** Quando la sessione scade, in ISO 8601. */
  scadeIl: string;
  /**
   * Falso subito dopo il primo ingresso: il client deve portare l'utente a
   * completare il profilo prima di lasciarlo entrare nell'app.
   */
  onboardingCompletato: boolean;
  /**
   * Vero quando questo accesso ha annullato una richiesta di cancellazione
   * pendente: rientrare entro i 14 giorni di grazia riattiva l'account.
   * Campo additivo e opzionale: i client vecchi lo ignorano.
   */
  cancellazioneAnnullata?: boolean;
}

// --- Cancellazione dell'account ---------------------------------------------
//
// La richiesta apre una grazia di 14 giorni: rientrare con un nuovo accesso
// entro il termine la annulla. Dopo, i contenuti vengono anonimizzati e i dati
// personali eliminati entro 30 giorni dalla richiesta (V5). Non esiste un
// endpoint di stato: dopo la richiesta non esistono più sessioni per chiamarlo.

export interface CancellazioneAccountResponse {
  /** Quando la richiesta è stata registrata, in ISO 8601. */
  richiestaIl: string;
  /** Un nuovo accesso entro questo istante annulla la richiesta. */
  riattivabileFinoAl: string;
  /** Termine massimo entro cui tutto è eliminato o anonimizzato. */
  scadenza: string;
}

// --- Profilo --------------------------------------------------------------

/** I tre valori del linguaggio ubiquo. "Pubblico" = tutti gli iscritti a Prome. */
export type Visibilita = 'PRIVATO' | 'ATENEO' | 'PUBBLICO';

export interface ImpostazioniDiPrivacyResponse {
  /** Chi può scriverti in privato e invitarti. */
  contattabilita: Visibilita;
  /** Chi vede i tuoi contenuti. */
  visibilita: Visibilita;
}

export interface ProfiloResponse {
  utenteId: string;
  nome: string | null;
  cognome: string | null;
  universita: string | null;
  corso: string | null;
  onboardingCompletato: boolean;
  impostazioniPrivacy: ImpostazioniDiPrivacyResponse;
}

/**
 * Completamento dell'onboarding: i quattro dati sono richiesti insieme perché
 * l'onboarding è completo se e solo se ci sono tutti e quattro. L'università è
 * autodichiarata e non viene verificata.
 */
/**
 * Cambio delle regole di privacy.
 *
 * I due assi sono **indipendenti** e si cambiano uno alla volta: non esiste un
 * «livello di privacy» unico, e nessuna combinazione dei due è un errore da
 * correggere. Almeno uno dei due campi dev'essere presente; quello omesso resta
 * al valore che aveva — non esiste lo stato «non impostato».
 */
export interface AggiornaImpostazioniPrivacyRequest {
  /** Chi può contattarti e invitarti. */
  contattabilita?: Visibilita;
  /** Chi vede i tuoi contenuti. */
  visibilita?: Visibilita;
}

export interface CompletaProfiloRequest {
  nome: string;
  cognome: string;
  universita: string;
  corso: string;
}

// --- Bacheca ---------------------------------------------------------------
//
// Il Post non porta alcun attributo di visibilità: chi lo vede discende dalle
// Impostazioni di privacy dell'autore, risolte al momento della lettura. Se
// qui comparisse un campo "visibilita" sarebbe una copia locale di una
// decisione che appartiene a Profilo, e due risposte alla stessa domanda.

/** I tre tipi ammessi, e nessun altro. */
export type TipoAllegato = 'PDF' | 'IMMAGINE' | 'TESTO';

/** 25 MB, in byte. Vale per la bacheca e, separatamente, per le aule studio. */
export const DIMENSIONE_MASSIMA_ALLEGATO = 25 * 1024 * 1024;

/** 5.000 caratteri dopo il trim. */
export const LUNGHEZZA_MASSIMA_POST = 5000;

/**
 * Richiesta di pre-autorizzazione al caricamento.
 *
 * Si dichiarano nome, tipo e dimensione **prima** di mandare i byte: così un
 * file troppo grande o di tipo non ammesso viene rifiutato subito, senza
 * essere caricato per intero e scartato alla fine.
 */
export interface PreautorizzaAllegatoRequest {
  nome: string;
  tipo: TipoAllegato;
  dimensione: number;
}

export interface PreautorizzaAllegatoResponse {
  /** Riferimento opaco da rimandare alla creazione del post. */
  chiave: string;
  /** Dove mandare i byte. I byte non passano dall'API. */
  url: string;
  metodo: 'PUT';
  /** Intestazioni da ripetere nel caricamento, se ce ne sono. */
  intestazioni: Record<string, string>;
  scadeIl: string;
}

export interface AllegatoResponse {
  id: string;
  nome: string;
  tipo: TipoAllegato;
  dimensione: number;
  /** Indirizzo da cui scaricarlo. */
  url: string;
}

export interface AutoreResponse {
  utenteId: string;
  nome: string | null;
  cognome: string | null;
  universita: string | null;
  /**
   * Vero quando l'autore non esiste più (account cancellato: contenuto
   * anonimizzato) o è in corso di cancellazione. Il client mostra
   * «Utente rimosso». Campo additivo e opzionale.
   */
  rimosso?: boolean;
}

export interface PostResponse {
  id: string;
  testo: string;
  creatoIl: string;
  autore: AutoreResponse;
  allegati: AllegatoResponse[];
  /**
   * Se chi legge può modificarlo ed eliminarlo, cioè se ne è l'autore.
   *
   * Lo dice il server, come per i commenti: dedurlo nel client vorrebbe dire
   * tenere due copie della regola, e obbligherebbe ogni schermata a sapere chi
   * è l'utente corrente per disegnare un bottone.
   */
  puoModificare: boolean;
}

export interface CreaPostRequest {
  testo: string;
  /** Chiavi ottenute dalla pre-autorizzazione, già caricate. */
  allegati?: string[];
}

/** 2.000 caratteri, non vuoto dopo il trim. */
export const LUNGHEZZA_MASSIMA_COMMENTO = 2000;

export interface CommentoResponse {
  id: string;
  testo: string;
  creatoIl: string;
  autore: AutoreResponse;
  /**
   * Se chi legge può cancellarlo: lo è l'autore del commento e l'autore del
   * post, che modera ciò che sta sotto al proprio contenuto.
   *
   * Lo decide il server e non il client: ricalcolarlo nell'interfaccia
   * vorrebbe dire tenere due copie della stessa regola, e quella del client
   * sarebbe comunque aggirabile.
   */
  puoEliminare: boolean;
}

export interface CreaCommentoRequest {
  testo: string;
}

export interface ModificaPostRequest {
  testo: string;
}

// --- Aula studio ------------------------------------------------------------
//
// L'aula NON ha stati di ciclo di vita: non esiste «programmata», «in corso»,
// «conclusa». La sola differenza fra un'aula programmata e una estemporanea è
// la presenza di `dataOraInizio`, e quella data non apre né chiude nulla — il
// client deriva l'etichetta da mostrare, il server non la decide.

/** Gli stessi tre valori della privacy, ma di questo contesto. */
export type VisibilitaAulaStudio = 'PRIVATO' | 'ATENEO' | 'PUBBLICO';

/** I tre soli permessi, e nessun altro. */
export type PermessoAulaStudio = 'parlare' | 'scrivere' | 'caricare';

/**
 * I permessi di un partecipante.
 *
 * Si concedono e si revocano **uno per uno**: non esiste il gesto «dai tutti i
 * permessi». L'insieme vuoto è la Sola lettura — uno stato legittimo, non un
 * errore da correggere né un ruolo separato.
 */
export interface PermessiResponse {
  parlare: boolean;
  scrivere: boolean;
  caricare: boolean;
}

export interface PartecipanteResponse {
  utenteId: string;
  nome: string | null;
  cognome: string | null;
  universita: string | null;
  /** Vero quando l'account non esiste più: il client mostra «Utente rimosso». */
  rimosso?: boolean;
  moderatore: boolean;
  permessi: PermessiResponse;
  /** Derivato: nessun permesso. Lo dichiara il server per non farlo dedurre. */
  solaLettura: boolean;
}

export interface AulaStudioResponse {
  id: string;
  titolo: string;
  visibilita: VisibilitaAulaStudio;
  /** Congelato alla creazione dall'università del creatore, se visibilità ATENEO. */
  ateneo: string | null;
  /** Assente = aula estemporanea. Nessuno stato dietro. */
  dataOraInizio: string | null;
  gruppoId: string | null;
  creatoIl: string;
  partecipanti: number;
  /** Permessi di chi legge, dichiarati dal server. */
  sonoModeratore: boolean;
  sonoPartecipante: boolean;
}

export interface ArgomentoResponse {
  id: string;
  titolo: string;
  testo: string | null;
  creatoIl: string;
}

export interface AllegatoDiAulaStudioResponse {
  id: string;
  nome: string;
  tipo: TipoAllegato;
  dimensione: number;
  url: string;
  /** Argomento in cui è collocato; assente = sciolto, stato normale. */
  argomentoId: string | null;
  caricatoDa: string;
  creatoIl: string;
}

/**
 * L'apertura della sala: tutto ciò che serve per entrare, in **una sola
 * risposta composta**. Non una sequenza di chiamate.
 */
export interface SalaResponse {
  aula: AulaStudioResponse;
  partecipanti: PartecipanteResponse[];
  argomenti: ArgomentoResponse[];
  allegati: AllegatoDiAulaStudioResponse[];
  sonoModeratore: boolean;
  mieiPermessi: PermessiResponse;
}

/** 200 caratteri, non vuoto dopo il trim. */
export const LUNGHEZZA_MASSIMA_TITOLO_AULA = 200;
/** 20.000 caratteri: è il posto dove si scrive di un tema, non un'etichetta. */
export const LUNGHEZZA_MASSIMA_TESTO_ARGOMENTO = 20_000;

export interface CreaAulaStudioRequest {
  titolo: string;
  visibilita?: VisibilitaAulaStudio;
  /** Se presente, alla creazione deve essere futura. */
  dataOraInizio?: string;
}

export interface ModificaAulaStudioRequest {
  titolo?: string;
  visibilita?: VisibilitaAulaStudio;
  dataOraInizio?: string | null;
}

export interface CreaArgomentoRequest {
  titolo: string;
  testo?: string;
}

export interface CreaAllegatoDiAulaStudioRequest {
  /** Chiave ottenuta dalla pre-autorizzazione, già caricata. */
  chiave: string;
  /** Facoltativo: essere sciolto è uno stato normale. */
  argomentoId?: string;
}

// --- Inviti all'aula studio -------------------------------------------------

export type StatoInvito = 'IN_ATTESA' | 'ACCETTATO' | 'SCADUTO';

export interface InvitoResponse {
  id: string;
  aulaStudioId: string;
  titoloAula: string;
  destinatario: string;
  stato: StatoInvito;
  scadeIl: string;
  emessoIl: string;
  /**
   * Falso subito dopo l'accettazione: il partecipante non nasce nella stessa
   * transazione, compare entro pochi secondi. È la finestra che il dominio
   * dichiara, esposta al client invece di essere nascosta.
   */
  partecipanteCreato: boolean;
}

export interface CreaInvitoRequest {
  destinatario: string;
}

// --- Chat dell'aula studio --------------------------------------------------
//
// Il messaggio è immutabile dopo l'invio: è un fatto, non un documento. Non
// esiste alcun modello condiviso con la chat del gruppo, perché ciò che si
// verifica prima di scrivere è diverso — qui un permesso, là l'appartenenza.

/** 2.000 caratteri, non vuoto dopo il trim. */
export const LUNGHEZZA_MASSIMA_MESSAGGIO = 2000;

export interface MessaggioDiChatResponse {
  id: string;
  testo: string;
  inviatoIl: string;
  autore: AutoreResponse;
  /** Se chi legge ne è l'autore: lo dice il server, come sempre. */
  mio: boolean;
}

export interface InviaMessaggioRequest {
  testo: string;
}
