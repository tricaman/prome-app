import { configuraApiClient } from '@prome/api-client';
import { configuraSessione, tokenSessione } from '@prome/app-core';
import { LINGUA_DI_RIPIEGO, type Lingua } from '@prome/i18n';
import { config } from './config';

/**
 * Configurazione del client API, fatta una volta sola all'importazione.
 *
 * La lingua è letta a ogni richiesta da una variabile aggiornata dal provider:
 * così ogni chiamata parte con l'header giusto e i messaggi del server —
 * esiti e errori — tornano già tradotti, senza che le pagine se ne occupino.
 */
let linguaCorrente: Lingua = LINGUA_DI_RIPIEGO;

export function impostaLinguaApi(lingua: Lingua): void {
  linguaCorrente = lingua;
}

const CHIAVE_SESSIONE = 'prome.sessione';

/**
 * Il token vive nell'archivio del browser, non in un cookie: l'API sta su
 * un'altra origine e la sessione viaggia in `Authorization`, la stessa forma
 * che usa l'app. Un modo solo di autenticarsi, due client.
 *
 * `configuraSessione` non parte durante il rendering sul server, dove
 * `localStorage` non esiste: la sessione è una cosa del browser.
 */
if (typeof window !== 'undefined') {
  void configuraSessione({
    leggi: () => window.localStorage.getItem(CHIAVE_SESSIONE),
    scrivi: (token) => window.localStorage.setItem(CHIAVE_SESSIONE, token),
    cancella: () => window.localStorage.removeItem(CHIAVE_SESSIONE),
  });
}

configuraApiClient({
  baseUrl: config.urlApi,
  lingua: () => linguaCorrente,
  token: () => tokenSessione() ?? undefined,
});
