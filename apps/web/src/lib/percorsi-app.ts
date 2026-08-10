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
  gruppo: (slug: string) => `/app/gruppi/${slug}`,
  materiali: () => '/app/materiali',
  impostazioni: () => '/app/impostazioni',
} as const;
