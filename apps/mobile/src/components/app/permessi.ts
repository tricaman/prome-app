import type { Partecipante } from '@prome/contenuti';

/**
 * I tre permessi di un partecipante a un'aula studio.
 *
 * Sono esattamente tre e si concedono uno alla volta: l'insieme vuoto è la
 * condizione legittima di "sola lettura", non un quarto valore né un ruolo.
 *
 * La stessa logica esiste identica sul web: quando il dominio passerà
 * dall'interfaccia all'API, resterà un solo posto da cui leggerla.
 */
export interface Permessi {
  parlare: boolean;
  scrivere: boolean;
  caricare: boolean;
}

export type NomePermesso = keyof Permessi;

export const PERMESSI: readonly NomePermesso[] = ['parlare', 'scrivere', 'caricare'];

export const TUTTI_I_PERMESSI: Permessi = { parlare: true, scrivere: true, caricare: true };

/**
 * Un Moderatore ha sempre tutti e tre i permessi finché resta in ruolo: non si
 * possono revocare, e l'interfaccia deve mostrarlo invece di lasciar provare
 * un gesto che il dominio rifiuterebbe.
 */
export function permessiDi(
  partecipante: Partecipante,
  stato: Record<string, Permessi>,
): Permessi {
  if (partecipante.moderatore) return TUTTI_I_PERMESSI;
  return stato[partecipante.id] ?? TUTTI_I_PERMESSI;
}

export function eSolaLettura(permessi: Permessi): boolean {
  return !permessi.parlare && !permessi.scrivere && !permessi.caricare;
}

export function permessiIniziali(partecipanti: readonly Partecipante[]): Record<string, Permessi> {
  return Object.fromEntries(
    partecipanti.map((partecipante) => [partecipante.id, { ...TUTTI_I_PERMESSI }]),
  );
}
