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

// --- Catalogo accademico ---------------------------------------------------
//
// Università, Classe di corso e Corso sono un **catalogo chiuso**: si sceglie
// da un elenco, non si scrive. È ciò che rende interrogabile l'identità
// accademica — «chi studia Economia e commercio a Bologna», «tutti gli
// iscritti alla classe L-18» — che con due stringhe libere non era esprimibile.

export type LivelloDiCorso = 'TRIENNALE' | 'MAGISTRALE' | 'CICLO_UNICO';

export interface UniversitaResponse {
  id: string;
  /** Lo stesso delle pagine pubbliche di ateneo. */
  slug: string;
  nome: string;
  nomeBreve: string;
  citta: string;
}

/** La classe ministeriale: identifica il corso oltre il singolo ateneo. */
export interface ClasseDiCorsoResponse {
  /** 'L-18', 'L-18 R', 'LMG/01'. */
  codice: string;
  nome: string;
  livello: LivelloDiCorso;
}

export interface CorsoResponse {
  id: string;
  /** Codice dell'ateneo (es. '6612'): unico dentro l'ateneo, non nel mondo. */
  codice: string;
  nome: string;
  durataAnni: number;
  classe: ClasseDiCorsoResponse;
  universita: UniversitaResponse;
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
  /**
   * L'ateneo del corso scelto. Non è un dato a sé: il profilo riferisce **solo**
   * il corso, e questo campo è la sua università riportata qui per comodità di
   * lettura — non esiste un profilo con università e senza corso.
   */
  universita: UniversitaResponse | null;
  corso: CorsoResponse | null;
  onboardingCompletato: boolean;
  impostazioniPrivacy: ImpostazioniDiPrivacyResponse;
  /**
   * L'indirizzo della foto del profilo, o `null` se non ce n'è una.
   *
   * Campo **additivo**: un client che non lo conosce continua a disegnare le
   * iniziali, che restano il ripiego di sempre — e restano anche il ritratto
   * di chi la foto non la mette, che non è uno stato incompleto.
   */
  foto: string | null;
}

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

/**
 * Completamento dell'onboarding.
 *
 * I dati arrivano insieme perché insieme definiscono la condizione: non esiste
 * un completamento parziale, quindi non esiste un endpoint che ne aggiorni uno
 * solo. È anche la scrittura con cui si correggono in seguito (P3).
 *
 * **Il corso da solo, senza l'università**: il corso appartiene già a un
 * ateneo, e accettarli entrambi vorrebbe dire dover respingere la coppia
 * incoerente — un errore che così non può esistere.
 */
export interface CompletaProfiloRequest {
  nome: string;
  cognome: string;
  /** Identificativo di un corso del catalogo. Il catalogo è chiuso. */
  corsoId: string;
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

/**
 * 5 MB per la foto del profilo: un quinto di un allegato.
 *
 * Una foto di profilo si guarda a quaranta punti di lato, e ogni megabyte in
 * più è banda spesa per pixel che nessuno vedrà — sul telefono di chi la
 * carica e su quello di chiunque scorra la bacheca.
 */
export const DIMENSIONE_MASSIMA_FOTO_PROFILO = 5 * 1024 * 1024;

/**
 * Chiedere di poter caricare una foto del profilo.
 *
 * Stessi tre tempi degli allegati — si dichiara, si caricano i byte
 * direttamente all'archivio, si conferma — perché è lo stesso problema: i byte
 * non attraversano gli endpoint di dominio.
 */
export interface PreautorizzaFotoProfiloRequest {
  nome: string;
  /** Solo immagini: il tipo non è una scelta, è l'unico ammesso. */
  dimensione: number;
}

/** La conferma: la chiave che il server aveva emesso, e nessun'altra. */
export interface ConfermaFotoProfiloRequest {
  chiave: string;
}

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

/** Una riga dell'elenco «utenti bloccati»: da qui si torna indietro. */
export interface BloccatoResponse {
  utenteId: string;
  nome: string | null;
  cognome: string | null;
  bloccatoIl: string;
  /** L'account non esiste più o è in cancellazione: il nome non si mostra, la riga resta sbloccabile. */
  rimosso?: boolean;
}

/** Cosa si può segnalare. Elenco chiuso: i messaggi d'aula restano fuori per ora. */
export type TipoDiSoggettoSegnalato = 'POST' | 'COMMENTO';

/** Perché. Elenco chiuso: un campo libero sarebbe un canale da presidiare. */
export type MotivoDiSegnalazione = 'SPAM' | 'MOLESTIE' | 'CONTENUTO_INAPPROPRIATO';

export interface CreaSegnalazioneRequest {
  tipo: TipoDiSoggettoSegnalato;
  soggettoId: string;
  motivo: MotivoDiSegnalazione;
}

/** Una segnalazione già fatta, per l'esportazione dei propri dati. */
export interface SegnalazioneResponse {
  tipo: TipoDiSoggettoSegnalato;
  soggettoId: string;
  motivo: MotivoDiSegnalazione;
  creatoIl: string;
}

/**
 * Di cosa parla una richiesta di aiuto.
 *
 * **Elenco chiuso**, come i motivi di segnalazione e gli eventi di prodotto:
 * a testo libero, in poche settimane, la stessa cosa comparirebbe scritta in
 * sei modi e la coda non sarebbe più smistabile. Sei voci, perché la settima
 * è quasi sempre «Altro» detto meglio.
 */
export const CATEGORIE_DI_SUPPORTO = [
  /** Qualcosa non funziona come dovrebbe. */
  'BUG',
  /** Non riesco a entrare, il profilo, i dati. */
  'ACCOUNT',
  /** Un contenuto o una persona: il modulo rimanda alla segnalazione. */
  'CONTENUTO',
  /** Vorrei che Prome facesse anche… */
  'SUGGERIMENTO',
  /** Come si fa a…? */
  'DOMANDA',
  'ALTRO',
] as const;

export type CategoriaDiSupporto = (typeof CATEGORIE_DI_SUPPORTO)[number];

/** 2.000 caratteri: quanto basta a raccontare un problema, non un romanzo. */
export const LUNGHEZZA_MASSIMA_RICHIESTA_SUPPORTO = 2000;

export interface RichiestaDiSupportoRequest {
  categoria: CategoriaDiSupporto;
  testo: string;
  /**
   * Come ricontattare chi scrive, se preferisce un altro indirizzo.
   *
   * Facoltativo **e non prefillato dal server**: l'indirizzo dell'account non
   * esce dal profilo (non c'è un endpoint che lo dica), e il supporto risponde
   * comunque alla casella con cui la persona è entrata. Serve a chi vuole
   * essere ricontattato altrove.
   */
  contatto?: string;
  /**
   * Le informazioni tecniche dell'apparecchio, dichiarate a schermo prima di
   * partire: versione dell'app, piattaforma, sistema. Senza, la metà delle
   * segnalazioni di difetto comincia con tre domande di rimpallo.
   */
  contesto?: string;
}

export interface AutoreResponse {
  utenteId: string;
  nome: string | null;
  cognome: string | null;
  universita: string | null;
  /**
   * La foto del profilo dell'autore, o `null`: allora restano le iniziali.
   *
   * Viaggia con il contenuto e non si chiede a parte, per la stessa ragione
   * del nome: un elenco di venti post non deve diventare venti letture di
   * profilo. **È sempre `null` per un autore rimosso** — non perché il campo
   * manchi, ma perché il profilo dietro non c'è più.
   */
  foto?: string | null;
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
  /**
   * Quanti commenti ha il post.
   *
   * Sta nell'elenco perché la scheda di un post lo mostra accanto al pulsante
   * dei commenti, e senza il numero quel pulsante non dice se sotto c'è una
   * conversazione o il silenzio. Contarli nel client vorrebbe dire una lettura
   * per ogni scheda dello scorrimento.
   */
  commenti: number;
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
  /** La foto del profilo, o `null`: allora restano le iniziali. */
  foto?: string | null;
  /**
   * Se chi legge può rivolgersi a questa persona — invitarla altrove.
   *
   * **Lo dichiara il server**, che è l'unico a conoscere le impostazioni di
   * contattabilità dell'altro: il client spegne il pulsante con la sua
   * ragione, invece di scoprirlo con un errore dopo il gesto. È lo stesso
   * valore che l'API applicherebbe, quindi le due cose non possono divergere.
   */
  contattabile?: boolean;
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
  /**
   * Vero se chi legge lo ha messo da parte.
   *
   * **Lo dice il server**, come `puoModificare` su un post: dedurlo nel client
   * vorrebbe dire tenere in memoria l'elenco dei propri salvataggi e
   * incrociarlo a mano in ogni schermata che mostri un materiale.
   */
  salvato?: boolean;
}

/**
 * Un materiale messo da parte, con l'aula da cui viene.
 *
 * Porta il titolo dell'aula perché una raccolta senza provenienza è un elenco
 * di nomi di file: «Esercizi 3.pdf» dice qualcosa solo insieme a «Analisi 1».
 */
export interface MaterialeSalvatoResponse {
  materiale: AllegatoDiAulaStudioResponse;
  aulaStudioId: string;
  titoloAula: string;
  salvatoIl: string;
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
  /**
   * Gruppo in cui collocare l'aula fin dalla nascita (AS9: al più uno). Chi
   * la crea dev'esserne membro nell'istante del gesto.
   */
  gruppoId?: string;
}

export interface ModificaAulaStudioRequest {
  titolo?: string;
  visibilita?: VisibilitaAulaStudio;
  dataOraInizio?: string | null;
  /**
   * Colloca l'aula in un gruppo, o la scioglie con `null` (AS9: al più una
   * collocazione, mai due). Chi colloca dev'essere membro di quel gruppo
   * nell'istante del gesto.
   */
  gruppoId?: string | null;
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

// --- Gruppo -----------------------------------------------------------------
//
// Un gruppo è un **contenitore di utenti con appartenenza e visibilità**: non
// ha feed, chat o notifiche proprie, e quello che manca qui manca di
// proposito. Verso l'aula studio attraversa il confine **un solo booleano**,
// mai un elenco di membri.

export type VisibilitaGruppo = 'PRIVATO' | 'ATENEO' | 'PUBBLICO';

/** 120 caratteri, non vuoto dopo il trim (G1). */
export const LUNGHEZZA_MASSIMA_NOME_GRUPPO = 120;

export interface MembroResponse {
  utenteId: string;
  nome: string | null;
  cognome: string | null;
  universita: string | null;
  /** Vero quando l'account non esiste più: il client mostra «Utente rimosso». */
  rimosso?: boolean;
  /** Vale SOLO dentro il gruppo: non concede nulla in un'aula collocata (AS6). */
  moderatore: boolean;
  entratoIl: string;
}

export interface GruppoResponse {
  id: string;
  nome: string;
  visibilita: VisibilitaGruppo;
  /** Congelato alla creazione dall'università del creatore (G5). */
  ateneo: string | null;
  creatoIl: string;
  membri: number;
  /** Posizione di chi legge, dichiarata dal server e mai dedotta dal client. */
  sonoMembro: boolean;
  sonoModeratore: boolean;
}

/** Il gruppo e il suo insieme di membri, in una risposta sola. */
export interface DettaglioGruppoResponse {
  gruppo: GruppoResponse;
  membri: MembroResponse[];
}

export interface CreaGruppoRequest {
  nome: string;
  visibilita?: VisibilitaGruppo;
}

/**
 * L'ateneo non c'è, e non è una dimenticanza: è congelato alla creazione (G5).
 * Un gruppo non cambia pubblico dopo essere nato.
 */
export interface ModificaGruppoRequest {
  nome?: string;
  visibilita?: VisibilitaGruppo;
}

// --- Inviti al gruppo -------------------------------------------------------

export type StatoInvitoAlGruppo = 'IN_ATTESA' | 'ACCETTATO' | 'SCADUTO';

export interface InvitoAlGruppoResponse {
  id: string;
  gruppoId: string;
  nomeGruppo: string;
  destinatario: string;
  stato: StatoInvitoAlGruppo;
  scadeIl: string;
  emessoIl: string;
  /**
   * Falso subito dopo l'accettazione: il membro non nasce nella stessa
   * transazione (IG3), compare entro pochi secondi. È la finestra che il
   * dominio dichiara, esposta al client invece di essere nascosta.
   */
  membroCreato: boolean;
}

export interface CreaInvitoAlGruppoRequest {
  destinatario: string;
}

// --- Notifiche --------------------------------------------------------------
//
// Il prodotto interrompe qualcuno in due sole occasioni, e l'elenco è chiuso
// per la stessa ragione per cui lo è quello degli eventi di misurazione: un
// tipo in più è una decisione, non un dettaglio. Ciò che esce **non trasporta
// dati personali** oltre gli identificativi tecnici necessari ad aprire il
// contenuto giusto.

export type PiattaformaDiNotifica = 'IOS' | 'ANDROID' | 'WEB';

export interface RegistraDispositivoRequest {
  /** Rilasciato dalla piattaforma, non da noi. */
  token: string;
  piattaforma: PiattaformaDiNotifica;
}

/**
 * Quali avvisi si vogliono ricevere. Nascono **accesi**, al contrario delle
 * regole di privacy: un avviso che non arriva non espone nulla a nessuno, ma
 * un prodotto che non avvisa mai sembra morto.
 */
export interface PreferenzeDiNotificaResponse {
  /** Qualcuno ha commentato un mio contenuto. */
  commenti: boolean;
  /** Sono stato invitato in un'aula studio o in un gruppo. */
  inviti: boolean;
}

/** Si cambia un asse alla volta: quello omesso resta com'era. */
export interface AggiornaPreferenzeDiNotificaRequest {
  commenti?: boolean;
  inviti?: boolean;
}

/**
 * La notifica in-app: la riga che la campanella conta e l'elenco mostra.
 *
 * Nasce sempre (salvo autore uguale al destinatario e coppie bloccate): le
 * preferenze qui sopra governano i canali che interrompono — email, domani il
 * push — mai questa riga. Non porta testi né nomi: il client traduce dal
 * `tipo`, e la risorsa si apre dentro l'app, dove la visibilità vale ancora.
 */
export type TipoDiNotifica = 'COMMENTO' | 'INVITO_AULA' | 'INVITO_GRUPPO';

/**
 * Dove porta il tocco. Distinto dal tipo perché domani un tipo nuovo può
 * puntare a una risorsa che esiste già; ogni client costruisce da qui il
 * proprio percorso.
 */
export type RisorsaDiNotifica = 'POST' | 'INVITO_AULA' | 'INVITO_GRUPPO';

export interface NotificaResponse {
  id: string;
  tipo: TipoDiNotifica;
  risorsaTipo: RisorsaDiNotifica;
  risorsaId: string;
  letta: boolean;
  creatoIl: string;
}

/** Il numero sulla campanella: leggero apposta, il badge lo chiede spesso. */
export interface ConteggioNotificheResponse {
  nonLette: number;
}

// --- Esportazione dei propri dati -------------------------------------------
//
// La privacy policy promette «una copia completa in formato leggibile». Questa
// è quella copia: **una sola risposta**, che attraversa gli stessi detentori
// che la cancellazione deve svuotare. I due elenchi vanno tenuti in passo — un
// detentore che sapesse cancellare ma non esportare produrrebbe una copia
// incompleta senza che nessuno se ne accorga.

/** Un file dell'utente: i suoi dati, e da dove riprenderlo. */
export interface FileEsportato {
  nome: string;
  tipo: TipoAllegato;
  dimensione: number;
  caricatoIl: string;
  /**
   * Collegamento firmato, generato al momento dell'esportazione e quindi con
   * una validità limitata: scaduto, si riscarica l'esportazione. Il file non
   * viaggia dentro il documento — un JSON con dentro i byte non sarebbe più
   * «leggibile» da nessuno.
   */
  url: string;
}

export interface EsportazioneDatiResponse {
  /** Quando è stata prodotta: una copia senza data non si sa a cosa si riferisca. */
  generataIl: string;
  account: {
    utenteId: string;
    email: string | null;
  };
  profilo: {
    nome: string | null;
    cognome: string | null;
    /**
     * Il corso per esteso — nome, codice, classe, durata, ateneo — e non il
     * suo identificativo: una copia dei propri dati deve restare leggibile da
     * sola, mesi dopo, senza il catalogo accanto per tradurre un uuid.
     */
    universita: string | null;
    corso: {
      nome: string;
      /**
       * Si chiama `codiceCorso` e non `codice`: una copia dei propri dati non
       * deve contenere una chiave chiamata «codice», e un test lo verifica
       * alla lettera — il giorno in cui qualcuno esportasse per sbaglio un
       * codice d'accesso, quel test è ciò che se ne accorge.
       */
      codiceCorso: string;
      classe: string;
      durataAnni: number;
    } | null;
    onboardingCompletato: boolean;
    impostazioniPrivacy: ImpostazioniDiPrivacyResponse;
    preferenzeDiNotifica: { commenti: boolean; inviti: boolean };
    /** Senza il token: è il modo di raggiungere l'apparecchio, non un dato suo. */
    dispositiviRegistrati: { piattaforma: string; registratoIl: string }[];
    /** Senza il risorsaId: l'identificativo di un contenuto altrui, illeggibile da solo. */
    notifiche: { tipo: string; letta: boolean; ricevutaIl: string }[];
    /** Chi HO bloccato, senza nomi. Chi ha bloccato me non è un mio dato. */
    bloccati: { utenteId: string; bloccatoIl: string }[];
  };
  bacheca: {
    post: {
      id: string;
      testo: string;
      creatoIl: string;
      aggiornatoIl: string;
      allegati: FileEsportato[];
    }[];
    commenti: {
      id: string;
      postId: string;
      testo: string;
      creatoIl: string;
    }[];
  };
  gruppi: {
    id: string;
    nome: string;
    moderatore: boolean;
    entratoIl: string;
  }[];
  auleStudio: {
    partecipazioni: {
      id: string;
      titolo: string;
      moderatore: boolean;
      ammessoIl: string;
    }[];
    materialiCaricati: FileEsportato[];
    messaggi: {
      id: string;
      aulaStudioId: string;
      testo: string;
      inviatoIl: string;
    }[];
  };
  /** Le proprie segnalazioni: mai il contenuto segnalato, che è di un altro. */
  segnalazioni: SegnalazioneResponse[];
}
