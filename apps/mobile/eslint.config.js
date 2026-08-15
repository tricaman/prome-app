const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Regole del client mobile.
 *
 * Non c'erano: `expo lint` genera questa configurazione al primo avvio, e
 * finché nessuno l'ha eseguito il codice nativo è cresciuto senza controllo —
 * mentre il web aveva il proprio dalla prima riga. Committarla è ciò che rende
 * il controllo ripetibile invece che occasionale.
 */
module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
