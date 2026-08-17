import type { Href } from 'expo-router';

/**
 * Dove stava andando chi è stato mandato all'accesso.
 *
 * Serve a un caso solo, ed è il caso normale degli inviti: si invita **anche
 * chi non ha ancora un account** (IA2), quindi chi apre il collegamento
 * spesso non è dentro. Senza questa memoria la guardia lo manda al benvenuto
 * e l'invito sparisce: entra, si ritrova in bacheca, e deve tornare
 * nell'email a ricominciare — se quel messaggio ce l'ha ancora.
 *
 * **Sta in memoria e non nell'archivio cifrato**, di proposito: deve
 * sopravvivere a due o tre schermate, non a un riavvio. Un'intenzione
 * conservata sul disco tornerebbe a galla giorni dopo, portando su un invito
 * ormai scaduto qualcuno che stava facendo altro.
 */
let inAttesa: string | null = null;

/**
 * I percorsi che si possono riprendere dopo l'accesso.
 *
 * È l'elenco chiuso della stessa regola che il web applica al parametro `da`
 * (`destinazioneDopoAccesso`): si torna solo su una destinazione interna, e
 * mai sulle schermate dell'ingresso — riprendere `/accedi` dopo essere
 * entrati significherebbe rispedire fuori chi è appena entrato.
 */
const RIPRENDIBILI = ['/inviti/', '/inviti-gruppo/', '/post/', '/aula/', '/gruppo/'];

/** Ricorda dove si stava andando. Un percorso non ripreso qui è un percorso perso: va aggiunto all'elenco. */
export function ricordaDestinazione(percorso: string): void {
  inAttesa = RIPRENDIBILI.some((prefisso) => percorso.startsWith(prefisso)) ? percorso : null;
}

/**
 * La destinazione, **una volta sola**: leggerla la consuma.
 *
 * Senza il consumo, un'uscita e un rientro riporterebbero sullo stesso invito
 * chi nel frattempo aveva risposto.
 *
 * Il tipo torna a essere `Href` con una conversione: expo-router tipizza gli
 * indirizzi come letterali, e qui il percorso è una stringa che arriva da
 * fuori. La conversione è lecita perché `ricordaDestinazione` ha già
 * verificato che sia una delle rotte dell'app, ed è il solo punto in cui
 * accade.
 */
export function riscuotiDestinazione(): Href | null {
  const percorso = inAttesa;
  inAttesa = null;
  return percorso ? (percorso as Href) : null;
}
