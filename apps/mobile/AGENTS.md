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
