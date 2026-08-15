# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Convenzioni mobile — Prome

> React Native + Expo SDK 57, expo-router. Le stesse regole del web dove ha senso: la logica applicativa è condivisa, cambia solo il modo di disegnarla.

## Struttura

```
src/
├── app/               schermate di expo-router. Sottili: la logica sta altrove
│   └── (tabs)/        le quattro destinazioni: bacheca, aule studio, gruppi, profilo
├── components/
│   ├── ui/            primitive del design system (Text, Button, Input, Card, Screen, Chip, Avatar, Icona…)
│   ├── contenuti/     schede del dominio (PostCard, AulaCard, allegati)
│   ├── app/           pezzi delle schermate (barra audio, campo codice, permessi)
│   ├── form/          campi collegati al form (Form, FormInput, FormSubmit)
│   └── feedback/      QueryBoundary, ErrorBoundary, stati di attesa/errore/vuoto
├── content/           ri-esporta i contenuti condivisi e aggiunge le rotte dell'app
├── hooks/             punto unico da cui le schermate prendono gli hook
├── i18n/              lingua del dispositivo e traduzioni
├── lib/               client API
├── providers/         contesti dell'app
└── theme/             tema chiaro/scuro costruito dai token condivisi
```

## Build di distribuzione (E13.1)

**L'app si costruisce con EAS** (`eas.json`, tre profili): `development` per un dev client,
`preview` per una prova interna (APK diretto), `production` per gli store (AAB e IPA firmati).
Materiale, dichiarazioni e il conto di ciò che manca prima di sottomettere stanno in `STORE.md`, che
si aggiorna nello stesso commit del prodotto: una dichiarazione vecchia è indistinguibile da una
giusta per chi la legge.

- **Le versioni le tiene EAS** (`appVersionSource: "remote"`, `autoIncrement` in produzione): non si
  scrivono `buildNumber` né `versionCode` in `app.json`, e non si committa un bump. La politica del
  piano resta quella: **nessuna funzionalità richiede l'aggiornamento simultaneo di client e
  backend**, e nessuna versione dell'app si rende inutilizzabile prima di 90 giorni dalla
  pubblicazione della successiva. In pratica significa che il server non risponde mai «aggiorna
  l'app» a un client vecchio: l'evoluzione del contratto è solo additiva dentro una versione.
- **`app.prome`** è l'identificativo su entrambe le piattaforme (il dominio è `prome.app`, letto al
  contrario), e non si cambia: cambiarlo dopo la prima pubblicazione significa un'app nuova.
- **`ios.config.usesNonExemptEncryption: false`**: usiamo solo TLS e le API di sistema, che sono
  esenti. Senza questa riga la stessa domanda torna a ogni sottomissione, e una risposta data a mano
  in fretta è una dichiarazione sbagliata su un modulo di conformità.
- **`android.permissions: []`** dice ciò che il prodotto fa davvero: nessun permesso di sistema.
  Niente fotocamera, microfono, posizione, rubrica o notifiche — il selettore di documenti non ne
  chiede. Ogni permesso in più è una domanda in revisione e una spunta in meno all'installazione.
- **`supportsTablet: false`**: l'interfaccia è disegnata per un telefono, e dichiarare l'iPad
  obbligherebbe a screenshot per iPad di schermate che su iPad stanno male.

### L'indirizzo dell'API

`urlApi()` ricava l'indirizzo dalla macchina che serve l'app **solo in sviluppo**. Fuori dallo
sviluppo va su `https://api.prome.app`, e il ripiego **non è più `localhost`**: un'app installata da
uno store non ha un server di sviluppo da cui dedurre un indirizzo, e quel ripiego produceva un'app
che si apre, gira e non raggiunge niente. È un guasto che nessun test può vedere, perché in sviluppo
l'indirizzo c'è sempre. `EXPO_PUBLIC_URL_API` vince su tutto e serve a puntare una build a un
ambiente di prova.

### Icone e splash

**Le sei immagini di `assets/images` sono generate**, non disegnate: `pnpm --filter @prome/mobile
icone` le ricava da `apps/web/public/logo-prome.svg`, lo stesso marchio del sito. Non ritoccarle a
mano — sono sei file che devono restare uguali fra loro, e a mano non lo restano. Le tre decisioni
di geometria (zona sicura Android a 0,66, segno mai ricolorato perché contiene un raster
incorporato, posizione conservata rispetto al cerchio) sono spiegate in `scripts/genera-icone.mjs`.

Lo splash usa i colori dei due temi (`#F7F9FB` e `#14181F`, gli stessi ruoli di `sfondo`) con il
marchio intero al centro: non si ricolora, quindi funziona su entrambi senza una seconda immagine.

### Dipendenze: la matrice dell'SDK non è un consiglio

`npx expo-doctor` deve restare a **21/21**. Prima della prima build ne fallivano due, e nessuna delle
due era cosmetica:

- **due copie di React** (19.2.3 per il mobile, 19.2.8 tirata dentro dai peer di `app-core`): nel
  fascio nativo sono due istanze, cioè hook e contesti che si rompono in modi che sembrano difetti
  del prodotto. La cura sta negli `overrides` di pnpm alla radice — **una sola versione di React nel
  monorepo, quella che l'SDK di Expo pretende esatta**, perché fra i due consumatori è il più
  stretto a dover vincere;
- **nove pacchetti fuori dalla matrice dell'SDK**, fra cui `expo-localization` con un intero major di
  distanza. Si allineano con `npx expo install --check` e `--fix`.

Un peer non soddisfatto (`@expo/metro-runtime`) **non si aggiusta con un override**: gli override non
toccano i peer. Si installa nell'app la versione attesa, e allora la risoluzione torna a posto.

## Accesso

**Unificato: email + codice OTP, nessuna password.** `accedi.tsx` chiede solo l'email e passa a `codice.tsx` portandosi dietro l'indirizzo (`rotte.codice(email)`), che va ripetuto in schermata: è l'unico modo per accorgersi di averlo sbagliato prima di aspettare un messaggio che non arriverà. Non c'è una registrazione separata, quindi la schermata iniziale ha un invito solo.

## Sessione

La guardia sta in `app/_layout.tsx`, sopra lo `Stack`, e l'elenco `SENZA_SESSIONE` è **chiuso e per esclusione**: una schermata nuova nasce protetta per il solo fatto di non essere lì dentro. L'elenco inverso lascerebbe scoperto ciò che ci si dimentica di aggiungere.

- Finché `caricata` è falso non si disegna niente: l'archivio cifrato si legge in modo asincrono, e la schermata di partenza è quella di chi non è entrato — mostrarla a chi è entrato sarebbe un lampo di app sbagliata a ogni apertura.
- **`codice` è pubblico ma non rimanda indietro chi è dentro**, e non è una dimenticanza: è la schermata su cui la sessione nasce, e se lo facesse navigherebbe insieme alla schermata, mandando sulla bacheca chi il profilo non l'ha ancora compilato.
- **La cache delle query la svuota la guardia**, non il bottone: una sessione cade in molti modi — l'uscita, una revoca da un altro dispositivo, una scadenza — e solo la guardia li vede tutti.
- **Si esce con `useEsci()`** (`@prome/app-core`, lo stesso del web), dalle impostazioni: questo telefono o tutti i dispositivi. L'archivio locale si svuota **anche se il server non risponde**, e la schermata non naviga — ci pensa la guardia, così esiste un modo solo di uscire.

## Visibilità dei contenuti

Un'aula studio o un gruppo può essere Privato, Ateneo o Pubblico, e **"Pubblico" significa aperto a tutti gli studenti iscritti a Prome**, non al web. I contenuti si vedono solo da dentro l'app: non esistono pagine pubbliche di aule, post, materiali, profili o gruppi. Quando si scrive una descrizione di visibilità — nella creazione di un'aula o nelle impostazioni privacy — non deve mai promettere indicizzazione o visibilità agli anonimi.

## Contenuti e rotte

- I dati e le ricerche vengono da `@prome/contenuti`, lo stesso pacchetto che usa il sito: mai copiare dati fra le due app.
- Le rotte si costruiscono con `rotte.*` da `@/content`, mai stringhe scritte a mano.
- Le icone sono in `@prome/design-tokens`: aggiungerne una significa aggiungere un tracciato là, così il segno resta identico sul web.

## Caricare un file

Tre tempi, come sul web: si dichiarano nome, tipo e dimensione a `preautorizzaAllegato`, si mandano i byte **direttamente all'archivio** con `caricaConAvanzamento` (`@prome/app-core`, la stessa funzione del web), poi si pubblica citando le chiavi. I byte non passano dagli endpoint di dominio.

Su React Native il corpo del caricamento è `{ uri, name, type }` e non un `Blob`: il file resta sul disco e lo legge il livello nativo mentre invia, invece di finire tutto in memoria. `XMLHttpRequest` accetta entrambe le forme, ed è il motivo per cui la funzione è una sola.

Il file parte appena scelto e il bottone di pubblicazione resta spento finché un caricamento è a metà: pubblicare allora citerebbe una chiave senza byte.

## Fare una chiamata

Identico al web, perché gli hook sono gli stessi (`@prome/app-core`):

```tsx
const aule = useElencoAuleStudio()

<QueryBoundary query={aule}>
  {({ data }) => <ElencoAule aule={data} />}
</QueryBoundary>

const salva = useApiMutation({
  mutationFn: creaAulaStudio,
  invalida: [getElencoAuleStudioQueryKey()],
  form,
})
```

L'avviso di esito compare in alto e scompare da solo; gli errori di validazione del server finiscono sui campi. **Non tradurre i messaggi dell'API**: arrivano già nella lingua giusta.

In sviluppo l'indirizzo dell'API è ricavato dalla macchina che serve l'app (`lib/api.ts`): il telefono non raggiunge `localhost`. Per forzarlo: `EXPO_PUBLIC_URL_API`.

## Fare un form

```tsx
const form = useForm({ schema, defaultValues: { titolo: '' } })
const salva = useApiMutation({ mutationFn: creaPost, form })

<Form form={form}>
  <FormInput name="titolo" etichetta={t('post.titolo')} obbligatorio />
  <FormSubmit titolo={t('comune.salva')} onSubmit={(v) => salva.mutate({ data: v })} />
</Form>
```

Non c'è un evento di invio come sul web: l'invio parte da `FormSubmit`, che valida e mostra l'attesa da sé.

## Tema e design system

- **Mai** colori o misure scritti a mano: tutto da `useTema()` (`tema.colori`, `tema.spaziatura`, `tema.raggio`, `tema.testo`, `tema.ombra`).
- I valori vengono da `@prome/design-tokens`, gli stessi del sito: un colore cambiato lì cambia entrambe le app.
- Il tema segue l'impostazione di sistema del dispositivo. Ogni schermata va provata anche in tema scuro.
- Testo sempre con il componente `Text` e la sua `variante`, mai `Text` di react-native.
- Ogni schermata è avvolta da `Screen`, che gestisce sfondo e aree sicure (notch, barra gesti).
- Area toccabile minima 48 punti: `Button` la rispetta già.

## Internazionalizzazione

- Lingua del dispositivo se supportata, altrimenti **inglese**: stessa regola del sito e dell'API.
- Testi in `@prome/i18n`, condivisi con il web. Chiavi tipizzate: `t('errori.generico.titolo')`.
- Interpolazione con `{nome}`: `t('errori.codice', { codice })`.

## Errori e schermate bianche

- `ErrorBoundary` è montato sopra tutta l'app in `providers.tsx`: un errore mostra un messaggio con un pulsante, non una schermata bianca da cui si esce solo riavviando.
- Attorno a una sezione che può fallire da sola va un `ErrorBoundary` dedicato.
- Gli errori delle chiamate API non passano di qui: li gestiscono `QueryBoundary` e `useApiMutation`.
