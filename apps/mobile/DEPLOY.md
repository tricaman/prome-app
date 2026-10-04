# Deploy — Prome mobile

Guida operativa per portare l'app sugli store. **Le build si fanno in locale**: niente EAS Build,
niente `eas submit`. `eas.json` resta per il dev client, non per il rilascio.

---

## 0. Quadro generale

Una sola variante, un solo identificativo, su entrambe le piattaforme:

| campo | valore |
| --- | --- |
| Nome | Prome |
| Package / bundle id | `app.mariustrica.prome` (Android e iOS) — `.dev` con `APP_VARIANT=development` |
| API | `https://api.prome.app` — scritta nel codice (`src/lib/api.ts`), nessuna env da passare alla build |
| Versione | `version`, `ios.buildNumber`, `android.versionCode` in `app.config.ts` |
| Firma Android | chiave di caricamento locale, `~/keys/prome-upload.keystore` |

> 🔴 **Trappola CNG.** `android/` e `ios/` sono in `.gitignore`: le rigenera `expo prebuild`, e
> ogni modifica fatta a mano dentro quelle cartelle sparisce al prebuild successivo — compresa la
> configurazione di firma. Per questo la firma di release vive in un **config plugin**
> (`plugins/withAndroidReleaseSigning.js`), non in `android/app/build.gradle`.

> 🔴 **Il numero di build è monotòno e la fonte di verità è lo store**, non `app.config.ts`. Un
> `versionCode` già caricato viene rifiutato all'upload. Prima di ogni build guarda l'ultimo valore
> nel track attivo di Play Console e incrementa da lì.

---

## 1. Pre-flight

- [ ] `version` / `versionCode` / `buildNumber` incrementati in `app.config.ts` (§0)
- [ ] Tutto committato
- [ ] `pnpm install` aggiornato, `pnpm --filter @prome/mobile typecheck` verde
- [ ] **API in esercizio raggiungibile** e con le feature della release già deployate: l'app
      installata parla con `api.prome.app`, non con il tuo portatile
- [ ] **Un account di prova vero su produzione**, con dati dentro (un'aula, qualche post): serve al
      revisore di Google (§4.3 «Accesso all'app») e ai tester
- [ ] Android: le quattro `PROME_UPLOAD_*` in `~/.gradle/gradle.properties` (§3.0)

---

## 2. Chiave di caricamento Android — una tantum, già fatta

La chiave esiste già: `~/keys/prome-upload.keystore` (alias `upload`), password e dettagli in
`~/keys/prome-keystore-info.txt`. **Non è nel repo e non deve entrarci.** Se un giorno servisse
rifarla (perdita del file, reset richiesto a Google):

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ~/keys/prome-upload.keystore \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Prome, OU=Prome, O=Prome, L=Brescia, ST=BS, C=IT"
```

E le properties in `~/.gradle/gradle.properties` (mai nel repo):

```properties
PROME_UPLOAD_STORE_FILE=/Users/<tu>/keys/prome-upload.keystore
PROME_UPLOAD_STORE_PASSWORD=********
PROME_UPLOAD_KEY_ALIAS=upload
PROME_UPLOAD_KEY_PASSWORD=********
```

> Questa è la chiave di **caricamento**, non quella con cui l'app arriva sui telefoni: quella la
> tiene Google (Play App Signing) e non la vedrai mai. Conseguenza pratica: se perdi il keystore
> l'app non è persa — si chiede a Google il reset della upload key. Il contrario non vale, ed è
> il motivo per cui l'affidamento a Google conviene.

---

## 3. Android — build dell'AAB

### 3.0 Verifica che le credenziali ci siano

```bash
grep PROME_UPLOAD ~/.gradle/gradle.properties
```

> Senza queste quattro righe la build **riesce lo stesso** e firma con la chiave di debug. Play
> rifiuta quell'AAB all'upload, dopo che hai aspettato la compilazione: controlla prima, e
> ricontrolla la firma dopo (§3.3).

### 3.1 Prebuild — obbligatorio prima di ogni build di rilascio

```bash
cd apps/mobile
pnpm exec expo prebuild --platform android --clean --no-install
```

> `APP_VARIANT` non impostata **è** la produzione: è il ripiego di `app.config.ts`, scelto perché
> l'errore vada nella direzione visibile (§0). Per il dev client, invece, la variante si dichiara:
> `APP_VARIANT=development pnpm exec expo prebuild --platform android --clean --no-install`.

Verifica che il plugin di firma abbia fatto il suo lavoro:

```bash
grep -c PROME_UPLOAD_STORE_FILE android/app/build.gradle   # → 3 (verificato)
grep -E "applicationId|versionCode|versionName" android/app/build.gradle
```

### 3.2 Build

```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` → è il file da caricare.

APK per provarla su un telefono senza passare da Play: `./gradlew assembleRelease` →
`android/app/build/outputs/apk/release/app-release.apk`.

> La prima build dopo un `--clean` compila tutto il nativo: mettici una decina di minuti. Le
> successive sono molto più rapide.

### 3.3 Verifica firma — prima di caricare

```bash
unzip -p android/app/build/outputs/bundle/release/app-release.aab "META-INF/*.RSA" \
  | keytool -printcert | grep -E "Proprietario|Owner|CN="
```

Deve comparire `CN=Prome`. Se leggi `androiddebugkey` la firma è quella di debug: rileggi §3.0.

---

## 4. Google Play Console — prima pubblicazione

### 4.1 Crea l'app

Play Console → **Crea app**:

- Nome: `Prome` (max 30 caratteri, è quello che si vede nello store)
- Lingua predefinita: **Italiano (it-IT)**
- App o gioco: **App** · Gratuita o a pagamento: **Gratuita**
- Le due dichiarazioni finali (norme per gli sviluppatori, leggi USA sull'export)

> ⚠️ Due scelte **irreversibili**: «gratuita» non torna «a pagamento», e il **package name**
> `app.mariustrica.prome` si fissa al primo AAB caricato — per sempre, anche se cancelli l'app.

### 4.2 Scheda del negozio

Testi pronti in `STORE.md` §3 (italiano e inglese). Grafica richiesta:

| Elemento | Formato |
| --- | --- |
| Icona | 512×512 PNG a 32 bit |
| Grafica in evidenza | 1024×500 PNG/JPG |
| Screenshot telefono | almeno 2, lato lungo 1080 px o più, 16:9 o 9:16 |

Le cinque schermate da catturare, in ordine, sono elencate in `STORE.md` §7 (tema chiaro per tutte).

### 4.3 «Contenuti dell'app» — le dichiarazioni

È la sezione che blocca il rilascio se lasciata a metà, e va compilata una volta sola:

- **Norme sulla privacy**: `https://prome.app/privacy`
- **Accesso all'app**: *tutte le funzionalità richiedono credenziali* → inserisci email e password
  di un account di prova vero su produzione. Senza, la revisione vede una schermata di login e
  rifiuta: in Prome **niente è pubblico**, non c'è un giro possibile da ospite.
- **Annunci**: no
- **Classificazione dei contenuti**: questionario IARC. La risposta che pesa è **contenuti generati
  dagli utenti: sì** (con segnalazione e blocco presenti — sono implementati, vedi `STORE.md` §1.1)
- **Pubblico di destinazione**: **18+**. Includere le fasce 13-17 fa scattare i requisiti «Famiglie»
  (norme aggiuntive, dichiarazioni sui contenuti per bambini): non serve per un prodotto
  universitario
- **Sicurezza dei dati**: le risposte, ricavate tabella per tabella, sono in `STORE.md` §6 — copia
  da lì invece che rispondere a memoria
- Le restanti dichiarazioni (app di governo, funzionalità finanziarie, salute, notizie): no

### 4.4 Scegli il track giusto — leggi prima di caricare

- **Test interno**: fino a 100 tester per elenco email, nessuna revisione, disponibile in minuti.
  È il posto giusto per far girare l'app a chi la deve provare adesso.
- **Test chiuso**: passa dalla revisione (giorni, non minuti) e pretende scheda e dichiarazioni
  complete.

> 🔴 **Se il tuo account per sviluppatori è personale e creato dopo il 13 novembre 2023**, Google
> chiede un **test chiuso con almeno 12 tester che restano iscritti per 14 giorni consecutivi**
> prima di poter chiedere l'accesso alla produzione. **Il test interno non conta**: se sei in
> quel caso, i giorni cominciano a scorrere solo quando pubblichi su *test chiuso*, e caricare
> prima in interno non anticipa niente. Il requisito, se si applica, lo vedi scritto nella
> dashboard dell'app in Play Console — controllalo **prima** di decidere il track, perché sbagliare
> qui costa due settimane.

### 4.5 Carica e distribuisci

Track scelto → **Crea nuova release**:

1. **Firma dell'app**: alla prima release Play chiede come gestire la chiave di firma → *«Usa una
   chiave generata da Google»* (consigliata). L'AAB che carichi diventa da solo la chiave di
   caricamento.
2. Carica `app-release.aab`.
3. Nome della release: lascia quello proposto (`1 (1.0.0)`).
4. Note di rilascio, in italiano e inglese.
5. **Rivedi e pubblica**.

Poi, nella scheda del track: **Tester** → crea un elenco email → aggiungi gli indirizzi (devono
essere gli account Google con cui installano) → salva → copia il **link di partecipazione** e
mandalo ai tester. Ognuno lo apre, accetta, e da lì l'app compare su Play come installabile.

> I tester non vedono la build nell'istante in cui pubblichi: sul test interno passano di solito
> pochi minuti, e la prima volta il link di partecipazione va accettato prima che l'app risulti
> trovabile.

---

## 4.6 Dopo il primo upload: l'impronta per i link universali

Gli app link Android (`/.well-known/assetlinks.json`, servito da `apps/web/src/lib/link-app.ts`)
vogliono l'impronta **SHA-256 della chiave con cui l'app arriva sui telefoni** — che con Play App
Signing è quella di **Google**, non la tua chiave di caricamento. La trovi solo dopo il primo
upload: Play Console → **Integrità dell'app** → *Firma delle app* → «Certificato della chiave di
firma dell'app» → SHA-256. Va nell'ambiente del sito come `ANDROID_SHA256_FIRMA` (e il Team ID
Apple come `APPLE_TEAM_ID`, quando arriveremo a iOS).

> Finché quelle variabili non ci sono, i due file `.well-known` rispondono **404 di proposito**: un
> file con l'impronta sbagliata viene scaricato, messo in cache dal sistema e rispettato — i
> collegamenti smettono di aprirsi nell'app senza che niente lo segnali. Meglio nessun file.

---

## 5. Verifica dopo l'installazione

- [ ] L'app si chiama **Prome** e ha l'icona giusta (non la "E" di Expo)
- [ ] Accesso funzionante contro `api.prome.app`
- [ ] Bacheca, aule e chat rispondono: se il socket non si apre, l'app sembra vuota senza dirlo

---

## 6. iOS — App Store

Local build + fastlane, same flow as `norbo-mobile/DEPLOY.md` section 3 (same machine, same
team `XFS75S4BYM`, same App Store Connect API key). EAS is not used.

### 6.0 One-time setup (done 2026-10-04)

- Bundle ID `app.mariustrica.prome` registered with the **Associated Domains** capability
  (needed by `applinks:prome.app`; without it the profile does not cover the entitlement and
  signing fails).
- `fastlane/Appfile`, `fastlane/Fastfile` (lane `prod`), and the team key
  `fastlane/AuthKey_279X5Y7X6H.p8` (gitignored by `*.p8`).
- The app record in App Store Connect is created **by hand** (the API cannot create apps).
  Once it exists, its numeric Apple ID goes in `ID_APP_STORE` in `app.config.ts`.

### 6.1 Build + TestFlight upload

Use ONE shell with a UTF-8 locale for the whole session: this machine defaults to US-ASCII,
and both `pod install` and xcpretty (inside `fastlane`) crash on it.

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
cd apps/mobile
pnpm exec expo prebuild --platform ios --clean --no-install
(cd ios && pod install)
EXPO_PUBLIC_URL_API=https://api.prome.app fastlane ios prod
```

- Bump `ios.buildNumber` in `app.config.ts` before every upload: App Store Connect rejects a
  build number it already has for the same version.
- If the build log freezes, check the keychain prompt first:
  `pgrep -fl "codesign|SecurityAgent"` (see norbo DEPLOY.md 3.0).
- Output: `build/prome-prod.ipa`. The build lands in TestFlight and is NOT sent to review.
