/**
 * Registro del canale di feedback (i "toast").
 *
 * La logica condivisa non sa come si disegna un avviso: web e mobile
 * registrano qui la propria implementazione all'avvio, e da quel momento ogni
 * chiamata API può segnalare esito positivo o negativo senza che il codice
 * della pagina se ne occupi.
 */

export interface Avvisatore {
  successo(messaggio: string, opzioni?: OpzioniAvviso): void;
  errore(messaggio: string, opzioni?: OpzioniAvviso): void;
  info(messaggio: string, opzioni?: OpzioniAvviso): void;
}

export interface OpzioniAvviso {
  /** Riga secondaria: di solito il codice errore, utile nelle segnalazioni. */
  descrizione?: string;
}

export interface ConfigurazioneFeedback {
  avvisatore: Avvisatore;
  /**
   * Messaggi usati SOLO quando il server non ne fornisce uno (per esempio se
   * la rete cade prima della risposta). Sono funzioni perché la lingua può
   * cambiare mentre l'applicazione è in esecuzione.
   */
  messaggioSuccessoPredefinito: () => string;
  messaggioErrorePredefinito: () => string;
}

const avvisatoreInerte: Avvisatore = {
  successo: () => {},
  errore: () => {},
  info: () => {},
};

let configurazione: ConfigurazioneFeedback = {
  avvisatore: avvisatoreInerte,
  messaggioSuccessoPredefinito: () => 'OK',
  messaggioErrorePredefinito: () => 'Error',
};

export function configuraFeedback(nuova: ConfigurazioneFeedback): void {
  configurazione = nuova;
}

export function avvisatore(): Avvisatore {
  return configurazione.avvisatore;
}

export function messaggioSuccessoPredefinito(): string {
  return configurazione.messaggioSuccessoPredefinito();
}

export function messaggioErrorePredefinito(): string {
  return configurazione.messaggioErrorePredefinito();
}
