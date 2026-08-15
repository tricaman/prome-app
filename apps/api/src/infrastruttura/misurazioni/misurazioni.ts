/**
 * MisurazioniDiUtilizzo — i fatti di prodotto che vogliamo poter contare.
 *
 * L'elenco è chiuso di proposito: un evento a stringa libera diventa in poche
 * settimane un elenco di nomi simili che nessuno sa più leggere, e un errore
 * di battitura produce una serie storica che sembra vuota.
 *
 * I nomi descrivono **cosa è successo**, al passato, non cosa ha premuto
 * l'utente: «accesso effettuato» resta vero anche se domani si entra in un
 * altro modo, «bottone accedi premuto» no.
 */
export type EventoDiProdotto =
  | 'codice_richiesto'
  | 'accesso_effettuato'
  | 'onboarding_completato'
  | 'post_pubblicato'
  | 'allegato_caricato'
  // I tre eventi della cancellazione viaggiano SENZA utenteId: dopo il
  // completamento quell'id sarebbe, presso un fornitore futuro, una replica
  // di un dato personale senza percorso di cancellazione (esclusione V5).
  | 'cancellazione_richiesta'
  | 'cancellazione_annullata'
  | 'cancellazione_completata';

/**
 * Le proprietà che possono accompagnare un evento.
 *
 * **Nessun dato personale, mai**: niente indirizzi email, nomi, testi o nomi
 * di file. L'unico riferimento a una persona è `utenteId`, lo stesso che i log
 * hanno il permesso di portare. È una regola del tipo, non una convenzione:
 * ciò che non è qui non si può emettere.
 */
export interface ProprietaEvento {
  utenteId?: string;
  /** Vero quando l'accesso ha creato l'account: distingue nuovi da ritorni. */
  primoIngresso?: boolean;
  /** Quanti allegati aveva il post: un numero, non i file. */
  allegati?: number;
  /** Tipo di allegato, che è una categoria e non un contenuto. */
  tipo?: string;
}

/**
 * La porta.
 *
 * **Non ha un fornitore assegnato**, ed è una decisione: l'architettura si
 * astiene dallo sceglierlo finché non è dimostrabile la conformità su regione
 * e trattamento. Quello che esiste oggi sono i punti di emissione — dove un
 * fatto accade — e il fatto che siano provati. Attaccarci un prodotto sarà un
 * adattatore, non una riscrittura.
 *
 * Registrare non deve mai far fallire ciò che si stava facendo: una misura
 * persa è una misura persa, un post non pubblicato è un danno.
 */
export interface MisurazioniDiUtilizzo {
  registra(evento: EventoDiProdotto, proprieta?: ProprietaEvento): void;
}

export const MISURAZIONI = Symbol('MisurazioniDiUtilizzo');
