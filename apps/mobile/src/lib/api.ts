import Constants from 'expo-constants';
import { configuraApiClient } from '@prome/api-client';
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
  return host ? `http://${host}:3001` : 'http://localhost:3001';
}

configuraApiClient({
  baseUrl: urlApiPredefinito(),
  lingua: () => linguaCorrente,
});
