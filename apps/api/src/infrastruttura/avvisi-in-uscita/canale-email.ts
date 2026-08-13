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
export interface CanaleEmail {
  inviaCodiceAccesso(destinatario: string, codice: string, lingua: string): Promise<void>;
}

/** Gettone di iniezione: l'interfaccia è un tipo, e a runtime non esiste. */
export const CANALE_EMAIL = Symbol('CanaleEmail');
