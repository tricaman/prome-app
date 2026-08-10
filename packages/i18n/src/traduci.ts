import type { ChiaveMessaggio, Messaggi } from './messaggi';

export type ValoriInterpolazione = Record<string, string | number>;

/**
 * Risolve una chiave puntata dentro il catalogo e sostituisce i segnaposto
 * `{nome}`. È l'implementazione usata dal client mobile; sul web la stessa
 * sintassi è interpretata dalla libreria di internazionalizzazione, così i
 * cataloghi restano identici per entrambi.
 *
 * Se la chiave manca restituisce la chiave stessa: in sviluppo si vede subito
 * cosa non è stato tradotto, e l'interfaccia non mostra mai una stringa vuota.
 */
export function traduci(
  messaggi: Messaggi,
  chiave: ChiaveMessaggio,
  valori?: ValoriInterpolazione,
): string {
  const testo = risolvi(messaggi, chiave);
  if (testo === undefined) return chiave;
  return valori ? interpola(testo, valori) : testo;
}

function risolvi(messaggi: Messaggi, chiave: string): string | undefined {
  let corrente: unknown = messaggi;
  for (const parte of chiave.split('.')) {
    if (corrente === null || typeof corrente !== 'object') return undefined;
    corrente = (corrente as Record<string, unknown>)[parte];
  }
  return typeof corrente === 'string' ? corrente : undefined;
}

function interpola(testo: string, valori: ValoriInterpolazione): string {
  return testo.replace(/\{(\w+)\}/g, (originale, nome: string) =>
    nome in valori ? String(valori[nome]) : originale,
  );
}
