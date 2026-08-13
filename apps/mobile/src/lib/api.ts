import Constants from 'expo-constants';
import * as ArchivioSicuro from 'expo-secure-store';
import { configuraApiClient } from '@prome/api-client';
import { configuraSessione, tokenSessione } from '@prome/app-core';
import { LINGUA_DI_RIPIEGO, type Lingua } from '@prome/i18n';

/**
 * Configurazione del client API, fatta una volta sola all'importazione.
 *
 * La lingua viene letta a ogni richiesta: così i messaggi del server — esiti e
 * errori — tornano già nella lingua dell'utente e le schermate non traducono
 * nulla di ciò che arriva dall'API.
 */
let linguaCorrente: Lingua = LINGUA_DI_RIPIEGO;

export function impostaLinguaApi(lingua: Lingua): void {
  linguaCorrente = lingua;
}

/**
 * In sviluppo il telefono non raggiunge `localhost`: quello è il telefono
 * stesso. Si ricava l'indirizzo della macchina che serve l'app e si punta lì.
 */
function urlApiPredefinito(): string {
  const daAmbiente = process.env.EXPO_PUBLIC_URL_API;
  if (daAmbiente) return daAmbiente;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3600` : 'http://localhost:3600';
}

const CHIAVE_SESSIONE = 'prome.sessione';

/**
 * Il token sta nell'archivio cifrato del sistema (portachiavi su iOS,
 * Keystore su Android), non in quello semplice: è la credenziale con cui si
 * entra nell'account, e su un telefono smarrito la differenza è tutta lì.
 */
void configuraSessione({
  leggi: () => ArchivioSicuro.getItemAsync(CHIAVE_SESSIONE),
  scrivi: (token) => ArchivioSicuro.setItemAsync(CHIAVE_SESSIONE, token),
  cancella: () => ArchivioSicuro.deleteItemAsync(CHIAVE_SESSIONE),
});

configuraApiClient({
  baseUrl: urlApiPredefinito(),
  lingua: () => linguaCorrente,
  token: () => tokenSessione() ?? undefined,
});
