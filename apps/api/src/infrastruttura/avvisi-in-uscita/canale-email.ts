/**
 * AvvisiInUscita — canale email.
 *
 * È una porta, non un fornitore: chi la usa dichiara *cosa* mandare e a chi,
 * mai con quale servizio. La scelta del fornitore (Brevo o Resend) è ancora
 * uno spike aperto del piano, e questa interfaccia esiste proprio perché quel
 * verdetto possa arrivare senza toccare il dominio.
 *
 * Il metodo non ritorna nulla e non promette il recapito: un'email è consegnata
 * al fornitore, non all'utente. Chi chiama non può quindi dedurre dal successo
 * che il messaggio sia arrivato — ed è corretto, perché non lo sa nemmeno il
 * fornitore nell'istante in cui risponde.
 */
/** Ciò che serve a chi riceve un invito per decidere se accettarlo. */
export interface InvitoDaRecapitare {
  titoloAula: string;
  invitatoDa: string;
  /** Indirizzo su cui atterra chi accetta, anche se deve ancora registrarsi. */
  collegamento: string;
  scadeIl: Date;
}

/**
 * L'invito a un gruppo è un'email diversa da quella dell'aula, e non per
 * simmetria: chi la riceve viene invitato a uno spazio che resta nel tempo,
 * non a un incontro che si apre adesso. La scadenza è la stessa, ciò che si
 * promette no.
 */
export interface InvitoAlGruppoDaRecapitare {
  nomeGruppo: string;
  invitatoDa: string;
  /** Indirizzo su cui atterra chi accetta, anche se deve ancora registrarsi. */
  collegamento: string;
  scadeIl: Date;
}

/**
 * Una segnalazione da recapitare al supporto: è la «coda che qualcuno guarda»
 * nella sua forma minima. L'estratto è già troncato da chi chiama (≤300
 * caratteri) e attraversa SOLO questa email: non viene mai conservato, perché
 * una copia del contenuto altrui dentro lo schema segnalazione sarebbe un
 * detentore di dati personali senza via di cancellazione.
 */
export interface SegnalazioneDaRecapitare {
  tipo: string;
  motivo: string;
  soggettoId: string;
  segnalanteId: string;
  estratto: string;
}

/**
 * L'email che accompagna la notifica di un commento: la campanella dentro
 * l'app, questa fuori. Porta SOLO il collegamento al post — niente testo del
 * commento, niente nome di chi ha scritto: un'email attraversa un fornitore e
 * finisce in caselle inoltrate, condivise, violate — è il posto meno protetto
 * in cui un dato personale possa finire. Chi apre il collegamento legge tutto
 * dentro l'app, dove la visibilità vale ancora.
 */
export interface NotificaDiCommentoDaRecapitare {
  /** Il post commentato, dentro l'app: URL_APP_WEB + percorso. */
  collegamento: string;
}

export interface CanaleEmail {
  inviaCodiceAccesso(destinatario: string, codice: string, lingua: string): Promise<void>;
  inviaNotificaCommento(
    destinatario: string,
    notifica: NotificaDiCommentoDaRecapitare,
    lingua: string,
  ): Promise<void>;
  inviaInvitoAulaStudio(
    destinatario: string,
    invito: InvitoDaRecapitare,
    lingua: string,
  ): Promise<void>;
  inviaInvitoAlGruppo(
    destinatario: string,
    invito: InvitoAlGruppoDaRecapitare,
    lingua: string,
  ): Promise<void>;
  /** Al supporto, non a un utente: il destinatario è EMAIL_SUPPORTO. */
  inviaSegnalazione(
    destinatario: string,
    segnalazione: SegnalazioneDaRecapitare,
    lingua: string,
  ): Promise<void>;
}

/** Gettone di iniezione: l'interfaccia è un tipo, e a runtime non esiste. */
export const CANALE_EMAIL = Symbol('CanaleEmail');
