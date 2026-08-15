import type { Href } from 'expo-router';

/**
 * Contenuti dell'app, con in più i percorsi di navigazione.
 *
 * I dati e le ricerche vivono nel pacchetto condiviso, perché sono gli stessi
 * del sito; qui si aggiunge solo ciò che è proprio dell'app, cioè come si
 * raggiunge una schermata.
 */
export * from '@prome/contenuti';

/**
 * Le destinazioni dell'app, una volta sola.
 *
 * Il tipo di ritorno è `Href`, cioè l'insieme delle rotte che expo-router
 * genera leggendo `src/app`: un indirizzo scritto male non compila. Le rotte
 * con parametri usano la forma a oggetto invece dell'interpolazione, perché è
 * l'unica che fa controllare anche il nome del parametro.
 */
export const rotte = {
  benvenuto: (): Href => '/',
  accedi: (): Href => '/accedi',
  codice: (email: string): Href => ({ pathname: '/codice', params: { email } }),
  profilo: (): Href => '/completa-profilo',
  bacheca: (): Href => '/bacheca',
  auleStudio: (): Href => '/aule-studio',
  mioProfilo: (): Href => '/profilo',
  componi: (): Href => '/componi',
  post: (id: string): Href => ({ pathname: '/post/[id]', params: { id } }),
  aula: (id: string): Href => ({ pathname: '/aula/[id]', params: { id } }),
  impostazioni: (): Href => '/impostazioni',
  eliminaAccount: (): Href => '/impostazioni/elimina-account',
} as const;

