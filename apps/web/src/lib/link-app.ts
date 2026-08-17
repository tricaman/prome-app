/**
 * I due file che dicono al sistema operativo «questo indirizzo lo apre l'app».
 *
 * Sono la metà server dei link universali (iOS) e degli app link (Android):
 * la decisione «app o browser» **non la prendiamo noi**. Un riconoscimento
 * del dispositivo dall'`User-Agent` saprebbe dire «questo è un iPhone», mai
 * «questo iPhone ha Prome installata» — che è l'unica domanda che conta — e
 * l'unico modo di agire su quella supposizione sarebbe rimandare a
 * `prome://…`, che su un telefono senza l'app produce l'errore del browser
 * proprio a chi stiamo invitando. Con questi file l'indirizzo resta uno solo:
 * il sistema apre l'app se c'è, la pagina web se non c'è, e la pagina web è
 * una pagina vera.
 *
 * **Sono solo per gli inviti**, ed è deliberato: l'app rivendica ciò che sa
 * aprire. Rivendicare tutta `/app/` la farebbe aprire su «Pagina non
 * trovata» ogni volta che qualcuno tocca un indirizzo dell'area privata
 * senza una schermata corrispondente. L'elenco è lo stesso di
 * `apps/mobile/src/app/+native-intent.tsx`, e i due si cambiano insieme.
 *
 * **Senza configurazione i due file non esistono** (404). Un `apple-app-site-association`
 * con un Team ID sbagliato non è un file a metà: è un file che Apple scarica,
 * mette in cache sui propri server e rispetta — e i collegamenti smettono di
 * funzionare senza che nulla lo segnali. Meglio nessun file, che è lo stato
 * di oggi e si comporta esattamente come oggi.
 */

/** Lo stesso identificativo di `app.json`, sulle due piattaforme. */
const IDENTIFICATIVO_APP = 'app.prome';

/**
 * Con e senza prefisso di lingua: l'email manda a `/app/inviti/<id>` e il
 * sito redirige a `/it/app/inviti/<id>`, ma un indirizzo copiato dal browser
 * la lingua ce l'ha già.
 */
const PERCORSI_INVITI = [
  '/app/inviti/*',
  '/app/inviti-gruppo/*',
  '/*/app/inviti/*',
  '/*/app/inviti-gruppo/*',
];

/**
 * Il Team ID Apple e l'impronta della chiave di firma Android.
 *
 * Sono pubblici per costruzione — vengono serviti a chiunque — ma vivono
 * nell'ambiente e non nel codice perché appartengono agli account, non al
 * prodotto: si leggono da App Store Connect e da `eas credentials`. Non sono
 * `NEXT_PUBLIC_`: servono al server che risponde, non al browser, e così si
 * cambiano con un riavvio invece che con una ricostruzione.
 */
const teamIdApple = () => process.env.APPLE_TEAM_ID?.trim();
const improntaAndroid = () => process.env.ANDROID_SHA256_FIRMA?.trim();

/** `null` finché il Team ID non c'è: vedi sopra, un file sbagliato è peggio di nessun file. */
export function associazioneApple(): object | null {
  const team = teamIdApple();
  if (!team) return null;

  return {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${IDENTIFICATIVO_APP}`],
          components: PERCORSI_INVITI.map((percorso) => ({ '/': percorso })),
        },
      ],
    },
  };
}

/**
 * `null` finché l'impronta non c'è.
 *
 * Può essercene più d'una separata da virgole, e non è un caso limite: la
 * chiave con cui EAS firma le build interne e quella con cui Play ri-firma
 * ciò che pubblica **sono diverse**, e un'app installata dallo store
 * verificherebbe contro un'impronta che non è la sua.
 */
export function associazioneAndroid(): object[] | null {
  const impronte = improntaAndroid()
    ?.split(',')
    .map((impronta) => impronta.trim().toUpperCase())
    .filter(Boolean);
  if (!impronte?.length) return null;

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: IDENTIFICATIVO_APP,
        sha256_cert_fingerprints: impronte,
      },
    },
  ];
}
