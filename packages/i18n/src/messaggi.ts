import en from './messaggi/en.json';
import it from './messaggi/it.json';
import type { Lingua } from './lingua';

/**
 * Forma dei cataloghi: l'italiano è il riferimento strutturale, l'inglese deve
 * combaciare. Se una chiave manca o è in più in `en.json`, la riga sotto non
 * compila — è la rete che tiene allineate le due lingue.
 */
export type Messaggi = typeof it;

const _paritaCatalogi: Messaggi = en;
void _paritaCatalogi;

export const catalogi: Record<Lingua, Messaggi> = { it, en };

export function catalogoDi(lingua: Lingua): Messaggi {
  return catalogi[lingua];
}

/**
 * Percorsi validi dentro il catalogo, in notazione puntata
 * (es. `errori.generico.titolo`). Serve ai client per avere chiavi tipizzate.
 */
export type ChiaveMessaggio = ChiaviAnnidate<Messaggi>;

type ChiaviAnnidate<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${ChiaviAnnidate<T[K]>}`;
}[keyof T & string];
