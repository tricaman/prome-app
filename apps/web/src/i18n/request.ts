import { getRequestConfig } from 'next-intl/server';
import { catalogoDi, eLinguaSupportata, LINGUA_DI_RIPIEGO } from '@prome/i18n';
import { formats } from './formati';

/**
 * Configurazione per richiesta: decide lingua e catalogo che il server userà
 * per rendere la pagina. I cataloghi arrivano dal pacchetto condiviso, gli
 * stessi che usa l'app mobile.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const richiesta = await requestLocale;
  const locale = eLinguaSupportata(richiesta) ? richiesta : LINGUA_DI_RIPIEGO;

  return {
    locale,
    messages: catalogoDi(locale),
    formats,
    // Fuso deciso qui una volta per tutte: le date rese dal server e quelle
    // rese dal browser devono coincidere, altrimenti l'idratazione segnala
    // differenze e React ridisegna la pagina.
    timeZone: 'Europe/Rome',
    // Una chiave mancante non deve mai rompere la pagina in produzione.
    getMessageFallback: ({ key }) => key,
  };
});
