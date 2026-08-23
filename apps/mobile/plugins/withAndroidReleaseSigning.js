/**
 * Expo config plugin: firma di release per Android.
 *
 * `android/` è rigenerata dal prebuild (CNG) e il `build.gradle` che ne esce
 * firma la release con la **chiave di debug**: un AAB così è accettato da
 * gradle, si installa, e viene **rifiutato da Play Console** senza che niente,
 * prima dell'upload, lo segnali. Questo plugin riscrive quel pezzo a ogni
 * prebuild, così la correzione non va rifatta a mano dopo ogni rigenerazione.
 *
 * Le credenziali stanno nelle gradle properties dell'utente
 * (`~/.gradle/gradle.properties`), **mai nel repository**:
 *
 *   PROME_UPLOAD_STORE_FILE=/Users/<tu>/keys/prome-upload.keystore
 *   PROME_UPLOAD_STORE_PASSWORD=********
 *   PROME_UPLOAD_KEY_ALIAS=upload
 *   PROME_UPLOAD_KEY_PASSWORD=********
 *
 * Se mancano, la release ricade sulla chiave di debug: le build locali di
 * prova continuano a funzionare, e quel ripiego è dichiarato invece che
 * silenzioso — `§ Verifica firma` in DEPLOY.md dice come accorgersene.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const BLOCCO_FIRMA = `
        release {
            if (project.hasProperty('PROME_UPLOAD_STORE_FILE')) {
                storeFile file(PROME_UPLOAD_STORE_FILE)
                storePassword PROME_UPLOAD_STORE_PASSWORD
                keyAlias PROME_UPLOAD_KEY_ALIAS
                keyPassword PROME_UPLOAD_KEY_PASSWORD
            }
        }`;

const FIRMA_CONDIZIONALE = `release {
            signingConfig project.hasProperty('PROME_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`;

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let contenuto = cfg.modResults.contents;

    // 1. Aggiunge signingConfigs.release accanto a quello di debug (idempotente).
    if (!contenuto.includes('PROME_UPLOAD_STORE_FILE')) {
      contenuto = contenuto.replace(
        /signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*\}/m,
        (trovato) => trovato.replace(/\}\s*\}$/, `}${BLOCCO_FIRMA}\n    }`),
      );
    }

    // 2. Il buildType release usa quella firma quando le properties ci sono.
    //    Prima con il commento che il template Expo ci mette sopra, poi senza:
    //    la seconda forma copre i prebuild già passati da questo plugin.
    contenuto = contenuto.replace(
      /release\s*\{\s*\/\/ Caution![^\n]*\n\s*\/\/ see https:\/\/reactnative\.dev[^\n]*\n\s*signingConfig signingConfigs\.debug/,
      FIRMA_CONDIZIONALE,
    );
    contenuto = contenuto.replace(
      /release\s*\{\s*signingConfig signingConfigs\.debug\b/,
      FIRMA_CONDIZIONALE,
    );

    if (!contenuto.includes("hasProperty('PROME_UPLOAD_STORE_FILE') ? signingConfigs.release")) {
      throw new Error(
        'withAndroidReleaseSigning: non ho trovato il buildType release da riscrivere. ' +
          'Il template Expo è cambiato: aggiorna il plugin, non il build.gradle (viene rigenerato).',
      );
    }

    cfg.modResults.contents = contenuto;
    return cfg;
  });
