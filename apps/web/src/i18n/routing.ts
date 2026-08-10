import { defineRouting } from 'next-intl/routing';
import { COOKIE_LINGUA, LINGUA_DI_RIPIEGO, LINGUE_SUPPORTATE } from '@prome/i18n';

/**
 * Instradamento per lingua.
 *
 * Ogni pagina vive sotto un prefisso esplicito (`/it/...`, `/en/...`): le due
 * versioni hanno URL distinti e stabili, condizione necessaria perché i motori
 * di ricerca le indicizzino entrambe e perché `hreflang` abbia senso.
 *
 * La lingua iniziale la sceglie il browser (header `Accept-Language`); se non
 * chiede nessuna lingua supportata si ripiega sull'inglese. La scelta esplicita
 * dell'utente viene ricordata in un cookie e vince sulla negoziazione.
 */
export const routing = defineRouting({
  locales: LINGUE_SUPPORTATE,
  defaultLocale: LINGUA_DI_RIPIEGO,
  localePrefix: 'always',
  localeDetection: true,
  localeCookie: {
    name: COOKIE_LINGUA,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  },
});
