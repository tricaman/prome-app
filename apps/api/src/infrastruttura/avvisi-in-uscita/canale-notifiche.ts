/**
 * AvvisiInUscita — canale delle notifiche.
 *
 * È il secondo trasporto dello stesso componente che manda le email: due
 * strade diverse per una responsabilità sola, **recapitare fuori dall'app un
 * avviso prodotto da un modulo**. Come per l'email, chi la usa dichiara *cosa*
 * mandare e a chi, mai con quale servizio.
 *
 * **Su ciò che esce vale una regola stretta**: l'avviso non trasporta dati
 * personali oltre gli identificativi tecnici necessari ad aprire il contenuto
 * giusto. Non il testo del commento, non il nome di chi ha scritto, non
 * l'indirizzo di nessuno. Un avviso attraversa un fornitore, i sistemi
 * operativi di due piattaforme e la schermata di blocco di un telefono che
 * può essere di chiunque in quel momento: è il posto meno protetto in cui un
 * dato personale possa finire, ed è il motivo per cui il titolo è una frase
 * fissa e tradotta, non una citazione del contenuto.
 *
 * Su iOS **non esiste un meccanismo di trasporto proprio**: quello è imposto
 * dalla piattaforma, ed è un'esclusione dichiarata del progetto.
 */

/** Le sole occasioni in cui il prodotto interrompe qualcuno. Elenco chiuso. */
export type TipoDiAvviso = 'commento' | 'invito';

export interface AvvisoDaRecapitare {
  /**
   * Cosa apre l'avviso quando lo si tocca: un percorso interno all'app, mai un
   * indirizzo assoluto. Il contenuto lo si legge dopo, dentro, dove le regole
   * di visibilità valgono ancora.
   */
  percorso: string;
  /**
   * **Chiave**, non frase: i testi stanno in `i18n/<lingua>/notifiche.json` e la
   * traduzione avviene al recapito, non alla produzione — un fatto nato
   * stanotte non deve portarsi dietro la lingua di stanotte.
   *
   * Con quale lingua è la domanda che si risolve **insieme al fornitore**:
   * oggi non conserviamo una lingua per persona, e il posto naturale dove
   * prenderla è l'apparecchio che registra il token, che la conosce. Finché
   * nessuno recapita, la chiave viaggia così com'è ed è la cosa onesta:
   * tradurla adesso vorrebbe dire sceglierne una per tutti.
   */
  titolo: string;
  corpo: string;
}

export interface CanaleNotifiche {
  /**
   * Recapita un avviso ai dispositivi indicati.
   *
   * Non promette la consegna e non ritorna nulla: una notifica è consegnata a
   * un fornitore, non a una persona. Chi chiama non deve poter dedurre dal
   * successo che qualcuno l'abbia vista.
   */
  recapita(token: readonly string[], avviso: AvvisoDaRecapitare): Promise<void>;
}

/** Gettone di iniezione: l'interfaccia è un tipo, e a runtime non esiste. */
export const CANALE_NOTIFICHE = Symbol('CanaleNotifiche');
