/**
 * Dal valore del contratto alla chiave del testo.
 *
 * Il contratto parla in maiuscolo (`PRIVATO`), i cataloghi in minuscolo. Sta in
 * un posto solo perché serve a due schermate, e vive qui e non dentro una di
 * loro: i file delle rotte esportano la schermata, non funzioni di servizio.
 */
export function etichettaVisibilita(valore: string): 'privato' | 'ateneo' | 'pubblico' {
  if (valore === 'PUBBLICO') return 'pubblico';
  if (valore === 'ATENEO') return 'ateneo';
  return 'privato';
}
