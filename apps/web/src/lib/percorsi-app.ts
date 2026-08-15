/**
 * Indirizzi dell'area privata.
 *
 * Stanno sotto `/app` per una ragione pratica: separano a colpo d'occhio ciò
 * che richiede un accesso da ciò che è pubblico e indicizzato, sia leggendo un
 * URL sia leggendo l'albero delle cartelle.
 */
export const percorsiApp = {
  accedi: () => '/app/accedi',
  benvenuto: () => '/app/benvenuto',
  bacheca: () => '/app/bacheca',
  post: (id: string) => `/app/post/${id}`,
  auleStudio: () => '/app/aule-studio',
  aulaStudio: (id: string) => `/app/aule-studio/${id}`,
  gruppi: () => '/app/gruppi',
  gruppo: (id: string) => `/app/gruppi/${id}`,
  invito: (id: string) => `/app/inviti/${id}`,
  invitoGruppo: (id: string) => `/app/inviti-gruppo/${id}`,
  impostazioni: () => '/app/impostazioni',
} as const;

/** Il parametro con cui l'accesso sa dove riportare chi è stato rimandato lì. */
export const PARAMETRO_DESTINAZIONE = 'da';

/**
 * Dove atterrare dopo l'accesso, quando è stata chiesta una destinazione.
 *
 * Accetta **solo** percorsi interni all'area privata. Un indirizzo assoluto —
 * o uno che comincia con `//`, che il browser legge come un altro dominio —
 * trasformerebbe la schermata di accesso in un trampolino verso un sito
 * qualunque, con il nostro dominio a fare da garanzia. La convalida sta qui e
 * non dove il parametro si legge: chi lo leggerà domani non deve doverla
 * ricordare.
 */
export function destinazioneDopoAccesso(richiesta: string | null | undefined): string {
  if (!richiesta) return percorsiApp.bacheca();
  if (!richiesta.startsWith('/app/') || richiesta.startsWith('//')) return percorsiApp.bacheca();
  // Rimandare all'accesso chi è appena entrato sarebbe un anello chiuso.
  if (richiesta.startsWith(percorsiApp.accedi())) return percorsiApp.bacheca();
  return richiesta;
}
