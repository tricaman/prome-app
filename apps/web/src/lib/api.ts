import { configuraApiClient } from '@prome/api-client';
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

configuraApiClient({
  baseUrl: config.urlApi,
  lingua: () => linguaCorrente,
});
