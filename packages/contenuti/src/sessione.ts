/**
 * Il modello di vista di una scheda della bacheca.
 *
 * Qui vivevano i **dati dimostrativi dell'area privata** — una persona
 * inventata, tre gruppi, un albero di cartelle, sei file, i partecipanti e i
 * messaggi di un'aula — che le schermate mostravano al posto dei dati veri.
 * Sono spariti man mano che ogni schermata è stata collegata all'API, e
 * l'ultimo è andato via con il tab profilo del telefono.
 *
 * Resta solo questo tipo, che non è un dato ma una forma: ciò che una scheda
 * della bacheca ha bisogno di sapere per disegnarsi, uguale su web e telefono.
 * Non ha `tag` né un conteggio dei commenti, perché **il feed non li conosce**:
 * i commenti si contano nel dettaglio, dove ci sono davvero.
 */
export interface PostDiBacheca {
  id: string;
  autore: string;
  contesto: string;
  corpo: string;
  allegato?: { nome: string; dettaglio: string };
}
