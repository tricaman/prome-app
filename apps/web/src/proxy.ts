import creaProxy from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Riconosce la lingua e porta l'utente sulla versione giusta del sito.
 * `/` viene rediretto verso la lingua negoziata dal browser, o verso quella
 * scelta in precedenza e ricordata nel cookie.
 */
export default creaProxy(routing);

export const config = {
  // Tutto tranne le rotte interne di Next, le API e i file con estensione
  // (immagini, font, robots.txt, sitemap.xml...).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
