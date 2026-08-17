// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const progetto = __dirname;
const radice = path.resolve(progetto, '../..');

/**
 * Metro dentro il monorepo.
 *
 * **Senza questo file Metro sorveglia solo `apps/mobile`.** I pacchetti
 * condivisi — `@prome/api-client`, `@prome/contracts`, `@prome/i18n`,
 * `@prome/design-tokens` — sono raggiunti attraverso i collegamenti di pnpm e
 * vengono letti una volta sola all'avvio: dopo una rigenerazione del client
 * l'app continua a usare il modulo vecchio, e il sintomo non dice niente
 * — «undefined is not a function» su un hook che nel sorgente esiste. Si
 * risolveva riavviando il server, cioè imparando a convivere con il difetto.
 *
 * Le due righe sono quelle documentate da Expo per i monorepo:
 *
 * - `watchFolders` porta la radice dentro il perimetro sorvegliato, così una
 *   modifica a un pacchetto ricostruisce il fascio come una qualunque
 *   modifica a `src/`;
 * - `nodeModulesPaths` dichiara i due posti in cui cercare le dipendenze —
 *   quelle dell'app e quelle issate alla radice — perché con pnpm non c'è un
 *   unico `node_modules` piatto da risalire.
 */
const config = getDefaultConfig(progetto);

config.watchFolders = [radice];
config.resolver.nodeModulesPaths = [
  path.resolve(progetto, 'node_modules'),
  path.resolve(radice, 'node_modules'),
];

module.exports = config;
