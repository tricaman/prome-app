import type { Lingua, Messaggi } from '@prome/i18n';
import type { formats } from '@/i18n/formati';

/**
 * Rende tipizzate le chiavi di traduzione: `t('errori.generico.titolo')` è
 * autocompletata e una chiave inesistente non compila.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: Lingua;
    Messages: Messaggi;
    Formats: typeof formats;
  }
}
