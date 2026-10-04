import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configurazione Expo, controllata da `APP_VARIANT`.
 *
 * Due varianti, con identificativo e nome diversi, così sviluppo e store
 * possono convivere sullo stesso telefono:
 *
 * | `APP_VARIANT`   | identificativo                | nome          |
 * | --------------- | ----------------------------- | ------------- |
 * | `development`   | `app.mariustrica.prome.dev`   | `Prome (Dev)` |
 * | *non impostata* | `app.mariustrica.prome`       | `Prome`       |
 *
 * **Il valore di ripiego è la produzione, al contrario di norbo, ed è una
 * scelta.** `android/` e `ios/` sono rigenerate dal prebuild (CNG) e portano
 * la variante con cui sono state generate: con il ripiego su `development`,
 * dimenticare la variabile prima di una build di rilascio produce un pacchetto
 * `.dev` che sale sullo store — e non c'è nessun errore, perché è un artefatto
 * valido. Nella direzione opposta il guasto è visibile subito: sul telefono
 * compare «Prome» invece di «Prome (Dev)», e te ne accorgi in dieci secondi.
 *
 * L'indirizzo dell'API **non sta qui**: in esercizio è scritto in
 * `src/lib/api.ts`, perché un'app installata da uno store non ha un server di
 * sviluppo da cui dedurlo. Solo `EXPO_PUBLIC_URL_API`, se presente, lo scavalca.
 */

type Variante = 'development' | 'production';

const VARIANTE = (process.env.APP_VARIANT ?? 'production') as Variante;
const IN_SVILUPPO = VARIANTE === 'development';

/** Il dominio al contrario, come le altre app. Il sito è `prome.app`. */
const IDENTIFICATIVO_BASE = 'app.mariustrica.prome';

/**
 * The numeric App Store id from App Store Connect (App Information > Apple ID).
 * It is what the "Rate Prome" settings row opens on iOS
 * (`src/lib/recensione-nativa.ts`).
 */
const ID_APP_STORE: string | undefined = '6819014965';

const identificativo = IN_SVILUPPO ? `${IDENTIFICATIVO_BASE}.dev` : IDENTIFICATIVO_BASE;
const nome = IN_SVILUPPO ? 'Prome (Dev)' : 'Prome';

/**
 * I collegamenti del sito li rivendica solo la produzione.
 *
 * L'associazione vive sul server (`/.well-known/assetlinks.json` e
 * `apple-app-site-association`, in `apps/web/src/lib/link-app.ts`) e nomina un
 * identificativo solo: quello di produzione. Una build di sviluppo che
 * rivendicasse gli stessi indirizzi non li aprirebbe comunque — la verifica
 * fallisce, la sua firma non è quella dichiarata — ma comparirebbe fra i
 * candidati e renderebbe ambiguo chi apre cosa quando le due app sono
 * installate insieme. Lo schema `prome://` resta attivo su entrambe.
 */
const percorsiInviti = [
  { scheme: 'https', host: 'prome.app', pathPrefix: '/app/inviti' },
  { scheme: 'https', host: 'prome.app', pathPrefix: '/app/inviti-gruppo' },
  { scheme: 'https', host: 'prome.app', pathPattern: '/.*/app/inviti/.*' },
  { scheme: 'https', host: 'prome.app', pathPattern: '/.*/app/inviti-gruppo/.*' },
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: nome,
  slug: 'prome',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'prome',
  userInterfaceStyle: 'automatic',
  primaryColor: '#32E0C4',
  ios: {
    bundleIdentifier: identificativo,
    // La fonte di verità è App Store Connect, non questo file: si incrementa
    // rispetto all'ultima build già caricata, non rispetto a ciò che si legge qui.
    buildNumber: '1',
    supportsTablet: false,
    config: {
      // Solo crittografia di sistema (HTTPS/TLS): dichiararlo qui evita la
      // domanda sull'export a ogni caricamento.
      usesNonExemptEncryption: false,
    },
    ...(IN_SVILUPPO ? {} : { associatedDomains: ['applinks:prome.app'] }),
  },
  android: {
    package: identificativo,
    // La fonte di verità è Play Console: il prossimo è il massimo fra tutti i
    // track + 1. Un valore già caricato viene rifiutato all'upload.
    versionCode: 1,
    permissions: [],
    // I moduli nativi dichiarano permessi che l'app non chiede mai: qui
    // vengono tolti dal manifesto, perché un permesso dichiarato e non usato
    // va spiegato agli store e allarma chi installa.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#32E0C4',
      backgroundImage: './assets/images/android-icon-background.png',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    ...(IN_SVILUPPO
      ? {}
      : {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              category: ['BROWSABLE', 'DEFAULT'],
              data: percorsiInviti,
            },
          ],
        }),
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // Rimette la firma di release a ogni prebuild: `android/` è rigenerata e
    // senza questo l'AAB esce firmato con la chiave di debug (vedi DEPLOY.md §3).
    './plugins/withAndroidReleaseSigning',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F9FB',
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#14181F',
          image: './assets/images/splash-icon.png',
        },
      },
    ],
    'expo-image',
    'expo-localization',
    'expo-sharing',
    [
      'expo-image-picker',
      {
        photosPermission:
          "Prome apre le tue foto solo quando scegli tu di allegarne una a un post o a un materiale d'aula.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    variante: VARIANTE,
    // Store pages for the "Rate Prome" row. Always the production listing,
    // even from a `.dev` build: that one is not on any store.
    idAppStore: ID_APP_STORE,
    pacchettoAndroid: IDENTIFICATIVO_BASE,
  },
});
