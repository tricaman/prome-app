import * as path from 'node:path';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { LINGUA_DI_RIPIEGO } from '@prome/i18n';

/**
 * Registrazione dell'i18n, condivisa dalle due unità di esecuzione.
 *
 * Sta qui e non dentro `AppModule` perché **anche il worker traduce**: manda
 * email, e i testi delle email seguono la stessa regola di tutto il resto —
 * tradotti dal server, mai dal client. Registrarlo in un posto solo lasciava
 * l'unità lavoratrice senza, e si vedeva soltanto al primo avvio in
 * produzione, quando il contenitore entrava in ciclo di riavvio.
 *
 * I risolutori della lingua contano solo per l'unità applicativa, che ha
 * richieste HTTP da cui ricavarla; nel worker la lingua arriva dal dato.
 */
export const registrazioneI18n = I18nModule.forRoot({
  fallbackLanguage: LINGUA_DI_RIPIEGO,
  loaderOptions: {
    path: path.join(__dirname, '../i18n/'),
    watch: process.env.NODE_ENV === 'development',
  },
  resolvers: [
    { use: QueryResolver, options: ['lang'] },
    new HeaderResolver(['x-lang']),
    AcceptLanguageResolver,
  ],
});
