import type { Href } from 'expo-router';
import { DOCUMENTI_LEGALI } from '@prome/contenuti';

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
  gruppi: (): Href => '/gruppi',
  mioProfilo: (): Href => '/profilo',
  mieiPost: (): Href => '/attivita/post',
  mieAule: (): Href => '/attivita/aule',
  materialiSalvati: (): Href => '/attivita/materiali',
  componi: (): Href => '/componi',
  creaAula: (): Href => '/crea-aula',
  creaGruppo: (): Href => '/crea-gruppo',
  post: (id: string): Href => ({ pathname: '/post/[id]', params: { id } }),
  aula: (id: string): Href => ({ pathname: '/aula/[id]', params: { id } }),
  gruppo: (id: string): Href => ({ pathname: '/gruppo/[id]', params: { id } }),
  impostazioni: (): Href => '/impostazioni',
  modificaProfilo: (): Href => '/impostazioni/modifica-profilo',
  privacy: (): Href => '/impostazioni/privacy',
  impostazioniNotifiche: (): Href => '/impostazioni/notifiche',
  notifiche: (): Href => '/notifiche',
  aiuto: (): Href => '/aiuto',
  privacyPolicy: (): Href => '/impostazioni/privacy-policy',
  eliminaAccount: (): Href => '/impostazioni/elimina-account',
  utentiBloccati: (): Href => '/impostazioni/utenti-bloccati',
} as const;

/**
 * Le pagine del sito che l'app apre nel browser.
 *
 * Solo la privacy policy ha una schermata nativa, perché la revisione degli
 * store la vuole raggiungibile senza dipendere da una rete di terzi. Termini e
 * linee guida no: cambiano senza che l'app si aggiorni, e una copia dentro il
 * fascio sarebbe una versione vecchia il giorno dopo.
 *
 * I percorsi non sono scritti qui: vengono da `DOCUMENTI_LEGALI`, gli stessi
 * che il sito usa per costruire la propria navigazione.
 */
const URL_SITO = 'https://prome.app';

/** Il documento legale sul sito, nella lingua in cui l'app sta parlando. */
export const paginaDelSito = (percorso: string, lingua: string): string =>
  `${URL_SITO}/${lingua}${percorso}`;

/**
 * I documenti legali per percorso, presi dall'elenco che il sito usa per la
 * propria navigazione: se lì un indirizzo cambia, cambia anche qui, e se
 * sparisce se ne accorge chi legge `undefined` invece di aprire un 404.
 */
export const documentoLegale = Object.fromEntries(
  DOCUMENTI_LEGALI.map((documento) => [documento.href, documento]),
) as Record<(typeof DOCUMENTI_LEGALI)[number]['href'], (typeof DOCUMENTI_LEGALI)[number]>;

