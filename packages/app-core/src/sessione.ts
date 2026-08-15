import { useSyncExternalStore } from 'react';
import { osservaErroriAutenticati } from '@prome/api-client';

/**
 * Il codice con cui il server dice «questa sessione non vale».
 *
 * È l'unico che deve svuotare l'archivio: gli altri 401 dell'ingresso —
 * codice sbagliato (PR003), codice scaduto (PR004) — parlano del codice
 * appena digitato, non della sessione, e reagire allo stato invece che al
 * codice butterebbe fuori chi sbaglia a scrivere sei cifre.
 */
const ACCESSO_RICHIESTO = 'PR006';

/**
 * Dove il token della sessione viene conservato.
 *
 * Cambia per piattaforma — sul web è l'archivio del browser, sull'app è
 * l'archivio cifrato del sistema — ma il *comportamento* della sessione è lo
 * stesso, e sta qui: chi apre, chi chiude, chi viene avvisato. Duplicarlo nei
 * due client significherebbe due modi di uscire da Prome.
 */
export interface DepositoSessione {
  leggi(): string | null | Promise<string | null>;
  scrivi(token: string): void | Promise<void>;
  cancella(): void | Promise<void>;
}

let deposito: DepositoSessione | undefined;
let token: string | null = null;
let caricata = false;
const ascoltatori = new Set<() => void>();

function avvisa(): void {
  for (const ascoltatore of ascoltatori) ascoltatore();
}

/**
 * Collega la sessione al suo archivio e legge il token già presente.
 *
 * Va chiamata una volta all'avvio, prima di disegnare qualunque schermata che
 * dipenda dall'essere entrati: finché non è finita, `sessioneCaricata()` è
 * falso, ed è la differenza fra «non sei entrato» e «non lo sappiamo ancora».
 */
export async function configuraSessione(nuovoDeposito: DepositoSessione): Promise<void> {
  deposito = nuovoDeposito;

  /**
   * Una sessione può morire senza che questo client lo chieda: revocata da un
   * altro dispositivo, scaduta, portata via dalla cancellazione dell'account.
   * Il token resterebbe nell'archivio per sempre, e l'app continuerebbe a
   * mostrarsi «dentro» mandando richieste che nessuno accetterà più.
   *
   * Sta qui, e non nei due client, per la stessa ragione per cui sta qui tutto
   * il resto: due copie sarebbero due modi diversi di cadere fuori da Prome.
   */
  osservaErroriAutenticati((errore) => {
    if (errore.status !== 401 || errore.errore?.errorCode !== ACCESSO_RICHIESTO) return;
    // Già chiusa: senza questa guardia una pagina con dieci query in volo
    // scriverebbe dieci volte nell'archivio e avviserebbe dieci volte.
    if (token === null) return;
    void chiudiSessione();
  });

  token = (await nuovoDeposito.leggi()) ?? null;
  caricata = true;
  avvisa();
}

/** Il token corrente, o `null`. Lo legge il client API a ogni richiesta. */
export function tokenSessione(): string | null {
  return token;
}

/** Falso finché il token non è stato letto dall'archivio. */
export function sessioneCaricata(): boolean {
  return caricata;
}

/** Dopo la verifica del codice: da qui in poi le richieste sono autenticate. */
export async function apriSessione(nuovoToken: string): Promise<void> {
  token = nuovoToken;
  await deposito?.scrivi(nuovoToken);
  avvisa();
}

/**
 * Chiude la sessione localmente.
 *
 * L'archivio viene svuotato **prima** di avvisare chi ascolta: se l'ordine
 * fosse inverso, una schermata che si ridisegna potrebbe rileggere un token
 * appena invalidato e mandare una richiesta destinata a fallire.
 */
export async function chiudiSessione(): Promise<void> {
  token = null;
  await deposito?.cancella();
  avvisa();
}

const iscriviti = (ascoltatore: () => void): (() => void) => {
  ascoltatori.add(ascoltatore);
  return () => ascoltatori.delete(ascoltatore);
};

/**
 * Lo stato della sessione, che si aggiorna da solo quando si entra o si esce.
 *
 * Sul server non c'è sessione e non ci sarà: la terza funzione risponde
 * sempre «non caricata», così una pagina resa sul server non promette mai
 * contenuti che il browser potrebbe non avere il diritto di vedere.
 */
export function useSessione(): { autenticato: boolean; caricata: boolean } {
  return useSyncExternalStore(
    iscriviti,
    () => (token ? STATO_DENTRO : caricata ? STATO_FUORI : STATO_IN_ATTESA),
    () => STATO_IN_ATTESA,
  );
}

// Oggetti stabili: `useSyncExternalStore` confronta per identità, e restituire
// un oggetto nuovo a ogni lettura manderebbe React in ridisegno infinito.
const STATO_DENTRO = { autenticato: true, caricata: true } as const;
const STATO_FUORI = { autenticato: false, caricata: true } as const;
const STATO_IN_ATTESA = { autenticato: false, caricata: false } as const;
