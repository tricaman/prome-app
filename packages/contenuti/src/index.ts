import { ARGOMENTI, ATENEI, GUIDE } from './dati';
import type { Argomento, Ateneo, Guida } from './tipi';

export * from './tipi';
export * from './sessione';
export * from './legali';
export { ARGOMENTI, ATENEI, GUIDE };

/**
 * Ricerche sui contenuti.
 *
 * Sono le uniche funzioni che le schermate usano per leggere i dati: quando i
 * contenuti arriveranno dall'API basterà cambiare il corpo di queste funzioni
 * (e renderle asincrone), senza toccare né il sito né l'app.
 *
 * Cercano soltanto fra atenei, argomenti e guide, cioè fra le pagine che
 * scriviamo noi. **Non esiste, e non va aggiunta, una ricerca che trovi
 * un'aula studio, un post, un gruppo o una persona a partire da un indirizzo
 * pubblico**: sarebbe il primo pezzo di un elenco visibile senza account, e i
 * contenuti degli utenti si leggono solo da dentro l'app, dai dati della
 * sessione. La visibilità "Pubblico" significa aperta agli studenti iscritti,
 * non al web.
 *
 * Gli indirizzi non stanno qui: web e mobile hanno sistemi di navigazione
 * diversi e ognuno costruisce i propri.
 */

export const ateneoDi = (slug: string): Ateneo | undefined =>
  ATENEI.find((ateneo) => ateneo.slug === slug);

export const argomentoDi = (slug: string): Argomento | undefined =>
  ARGOMENTI.find((argomento) => argomento.slug === slug);

export const guidaDi = (slug: string): Guida | undefined =>
  GUIDE.find((guida) => guida.slug === slug);

/**
 * The first universities of the list, in the order `ATENEI` declares them:
 * used for the internal links between hubs. Not "the most active": there is
 * no real activity figure to sort by.
 */
export const ateneiInEvidenza = (limite = 5): readonly Ateneo[] => ATENEI.slice(0, limite);

export const guidaInEvidenza = (): Guida | undefined => GUIDE.find((guida) => guida.inEvidenza);

export const guideSecondarie = (): readonly Guida[] => GUIDE.filter((guida) => !guida.inEvidenza);
