# Convenzioni web — Prome

> Aggiornare dopo ogni nuova convenzione o pattern. Next.js App Router, React 19, Tailwind v4, HeroUI v3, next-intl.

## Struttura

```
src/
├── app/                 rotte e file di convenzione Next (layout, error, sitemap…). Sottili: la logica sta altrove
│   └── [locale]/        ogni pagina pubblica vive sotto un prefisso di lingua
├── components/
│   ├── ui/              primitive del design system (Button, Card, Chip, Avatar, Heading, campi…)
│   ├── contenuti/       blocchi e schede del dominio (AulaStudioCard, PostCard, AllegatoRiga, TestataPagina…)
│   ├── form/            campi collegati al form (Form, FormInput, FormSubmit…)
│   ├── feedback/        QueryBoundary, ErrorBoundary, stati di attesa/errore/vuoto
│   ├── layout/          Logo, Container, Breadcrumb, SiteShell (intestazione + piè di pagina)
│   ├── marketing/       pezzi della pagina iniziale (anteprima dell'aula studio)
│   └── seo/             dati strutturati
│   └── app/             schermate dell'area privata (shell, sala, impostazioni…)
├── content/             modello dei contenuti: tipi, dati e ricerche (`sessione.ts` = area privata)
├── hooks/               punto unico da cui le pagine prendono gli hook
├── i18n/                instradamento, richiesta, navigazione, formati
├── lib/                 configurazione, client API, SEO, schema.org, utilità
├── providers/           contesti dell'applicazione
└── proxy.ts             riconoscimento della lingua a ogni richiesta
```

Regola: **le pagine compongono, non implementano**. Se una pagina supera le ~150 righe o contiene qualcosa che si ripeterà, quel pezzo va in `components/contenuti/`.

## Contenuti

- Ogni pagina pubblica legge da `@/content`: mai dati scritti dentro la pagina.
- Le ricerche (`ateneoDi`, `argomentoDi`, `guidaDi`, `ateneiPiuAttivi`, `guidaInEvidenza`, `guideSecondarie`) sono l'unico modo di accedere ai dati: quando arriverà l'API cambierà il corpo di quelle funzioni, non le pagine. Cercano **solo** fra atenei, argomenti e guide — vedi la sezione qui sotto sul perché non esiste una ricerca che trovi un'aula studio o un post.
- Gli indirizzi si costruiscono **solo** con `percorsi.*`: un URL scritto a mano è un collegamento che si romperà.
- Testi dell'interfaccia → cataloghi i18n. Testi redazionali (descrizioni di atenei e argomenti, corpo delle guide) → `content/`, in italiano.
- I dati dell'area privata sono un insieme separato, `content/sessione.ts`: schermate dell'app da una parte, pagine del sito dall'altra, senza scambi.

## Cosa può stare sul sito pubblico

**Regola non negoziabile: nessun contenuto degli utenti è visibile a chi non ha un account.**

Nel dominio la visibilità di un'aula studio o di un gruppo ha tre valori — Privato, Ateneo, Pubblico — e **"Pubblico" significa aperto a tutti gli studenti iscritti a Prome**, non aperto al web. Un'aula "pubblica" non ha una pagina su prome.app, non compare in una directory e non finisce in un motore di ricerca. Lo stesso vale per post, commenti, materiali, profili e gruppi.

Sul sito pubblico ci sono quindi solo pagine che raccontano il prodotto:

| C'è | Non c'è, e non deve esserci |
| --- | --- |
| Home, Chi siamo, Guide, Privacy | Directory di aule studio |
| Hub di ateneo (numeri aggregati, corsi, testo redazionale) | Pagine di singole aule studio |
| Hub di argomento (testo redazionale, sottoargomenti) | Pagine di post o commenti |
| Illustrazioni del prodotto con contenuti inventati e dichiarati tali | Profili delle persone, pagine di gruppo |

Conseguenze pratiche quando si aggiunge qualcosa:

- I numeri aggregati (quanti studenti, quante aule questo mese) si possono mostrare: sono statistiche della piattaforma, non contenuti.
- `percorsi.*` contiene solo indirizzi di pagine pubbliche. Se serve un indirizzo verso un contenuto, è un indirizzo dell'app: `percorsiApp.*`.
- `percorsiPubblici()` alimenta la sitemap: se una pagina non può stare lì, non deve esistere sul sito.
- Gli schemi in `lib/schema.ts` descrivono solo le nostre pagine. Non aggiungere `Event`, `DiscussionForumPosting` o `ProfilePage`: descriverebbero contenuti che non pubblichiamo.
- Al browser arrivano solo i gruppi di testi elencati in `NAMESPACE_DEL_CLIENT` (layout di lingua): il vocabolario dell'area privata resta nel sottoalbero `/app`.

## SEO per pagina

Ogni pagina fa tre cose, nell'ordine:

1. `generateMetadata` che passa da `creaMetadata({ lingua, percorso, titolo, descrizione })` — canonico e `hreflang` inclusi;
2. `generateStaticParams` se la rotta è dinamica, così le pagine sono generate in anticipo;
3. `<StructuredData lingua oggetti={[...]} />` con gli schemi giusti da `@/lib/schema`: `briciole` sempre, più `raccolta` per un elenco, `articolo` per una guida, `organizzazioneEducativa` per un ateneo. Sono tutti i costruttori che esistono, e l'elenco è chiuso di proposito: descrivono pagine nostre, non contenuti degli utenti.

Le briciole in pagina (`<Breadcrumb>`) e lo schema `briciole()` vanno dallo stesso array di voci: se divergono, i motori di ricerca mostrano un percorso che nel sito non esiste.

## Area privata (`/app`)

Due aree, due cornici: il sito pubblico usa `SiteShell`, l'app usa `AppShell` (colonna di navigazione + `AppTopbar`). Non mescolarle — rispondono a bisogni diversi e una modifica all'una non deve toccare l'altra.

- Le rotte con sessione stanno nel gruppo `app/[locale]/app/(sessione)/`, che applica `AppShell`. Accesso e onboarding restano fuori: prima di avere un account la navigazione non ha nulla da mostrare.
- **L'accesso è unificato: email + codice OTP, nessuna password.** `ModuloAccesso` è due passi in una schermata (email → codice) e non ha commutatori di metodo, accessi social né "password dimenticata". Non esiste una pagina di registrazione: `/app/accedi` serve sia chi torna sia chi arriva la prima volta, ed è il motivo per cui i due inviti nell'intestazione portano allo stesso indirizzo.
- **Ogni pagina di `/app` passa `noIndex: true`** a `creaMetadata` e non entra in `percorsiPubblici()`: è area privata, non deve finire nell'indice né nella sitemap.
- Gli indirizzi si costruiscono con `percorsiApp.*`, come quelli pubblici con `percorsi.*`.
- I dati della sessione dimostrativa vivono in `content/sessione.ts`: quando arriverà l'autenticazione, quel file sparisce e le schermate leggono la sessione reale senza cambiare forma.
- I permessi di un'aula studio si gestiscono con `components/app/sala/permessi.ts`: tre permessi indipendenti, insieme vuoto = sola lettura, e un Moderatore li ha sempre tutti e tre (`bloccatoAcceso` sullo `Switch`, non nascosto).

### Impostazioni di privacy

Le regole di privacy si mostrano **solo come il server le ha confermate**: `impostazioni-privacy.tsx` legge il profilo e scrive con `useApiMutation`, senza alcuno stato locale. Niente aggiornamento ottimistico qui, mai — un valore a schermo che non è stato salvato è la bugia peggiore che questa schermata possa dire, perché chi legge «Pubblico» crede di essere visibile e nessuno lo smentirà. I valori sono quelli del contratto (`PRIVATO|ATENEO|PUBBLICO`); le etichette e le descrizioni stanno in i18n e devono descrivere **ciò che il server applica davvero**, non il modello di dominio nella sua interezza.

Per lo stesso motivo l'interfaccia mostra un asse solo, la visibilità dei contenuti: la contattabilità è un valore vero e salvato, ma **nessuna regola la legge ancora** (vedi `apps/api/CLAUDE.md`), e un interruttore che non protegge da niente è peggio di un interruttore che manca. Quando qualcosa la applicherà, il riquadro torna.

### Preferenze di notifica

`impostazioni-notifiche.tsx` **dichiara il proprio stato invece di tacerlo**: le preferenze si salvano davvero e il server le rispetta, ma nessun avviso viene ancora recapitato perché non c'è un fornitore, e la scheda lo dice in prima riga. È l'opposto degli interruttori tolti a luglio, che si dicevano attivi senza salvare niente — la differenza non è la presenza di un'infrastruttura, è che qui la parte mancante è scritta a schermo.

Come per la privacy: nessuno stato locale, si manda **solo l'asse toccato**, e se la scrittura fallisce l'interruttore torna dov'era.

### Segnala e blocca

Un'affordance sola per contenuto — «Segnala» — che apre `segnala-e-blocca.tsx` sul posto: motivi da elenco chiuso, e dentro lo stesso pannello «Blocca {nome}» con conferma a due passi. Compare **sui contenuti degli altri**, mai sui propri né su un autore `rimosso`; sui commenti la condizione è il confronto con il proprio profilo, **non** `!puoEliminare` — il proprietario del post può eliminare i commenti altrui ed è esattamente chi deve potersi difendere sotto casa propria: X e «Segnala» convivono.

Dopo un blocco dal dettaglio si torna in bacheca (il post non esiste più per chi guarda); da un commento si invalidano commenti **e** feed. L'elenco dei bloccati sta nelle impostazioni sotto la privacy, con lo sblocco **senza conferma**: reversibile — la conferma sta dove si blocca. La nav dei documenti legali è `NavLegale` con parametro `corrente`: `attivo` nei dati significa «la pagina esiste», non «è questa».

## Marchio

Logo e marchio denominativo sono quelli storici del prodotto: `public/logo-prome.svg` per il segno e `components/layout/wordmark.tsx` per la scritta (tracciati originali, non ridisegnati). La scritta usa `currentColor`, quindi non servono varianti per fondo chiaro e scuro. Non sostituirli con testo tipografico.

## Sessione

Il token sta in `localStorage` sul web e nell'archivio cifrato del sistema sull'app; il *comportamento* — chi apre, chi chiude, chi viene avvisato — è uno solo, in `@prome/app-core/sessione`. `lib/api.ts` collega l'archivio e passa il token al client API, che lo mette in `Authorization` a ogni richiesta.

`useSessione()` dice se si è dentro e **se lo si sa già**: sul server la risposta è sempre «non lo sappiamo», così una pagina resa dal server non promette contenuti che il browser potrebbe non avere il diritto di vedere. Sono tre stati e non due: «non lo sappiamo ancora» è un'attesa, e trattarlo come un rifiuto butterebbe fuori a ogni ricarica chi è regolarmente dentro.

- **Il muro sta nel layout, non nelle pagine**: `RichiedeSessione` avvolge il gruppo `(sessione)` e l'onboarding, quindi una schermata nuova nasce protetta per il solo fatto di stare lì — la stessa scelta della guardia globale dell'API. Non aggiungere controlli di sessione dentro una pagina: sarebbero una seconda regola, e quella dimenticata non si vede.
- Quando la sessione manca, la guardia rimanda a `/app/accedi?da=<percorso>`; `destinazioneDopoAccesso` (in `lib/percorsi-app.ts`) è **l'unico** punto che convalida quel parametro e accetta solo percorsi interni a `/app/` — senza, la schermata di accesso diventerebbe un trampolino verso un dominio qualunque, con il nostro a fare da garanzia.
- **La cache delle query si svuota nella guardia**, non dove si preme «esci»: una sessione cade in molti modi — il bottone, una revoca da un altro dispositivo, una scadenza — e solo la guardia li vede tutti. Se restasse, chi entra dopo sullo stesso computer troverebbe in bacheca i post di chi c'era prima.
- **`SoloSenzaSessione` rimanda indietro chi arriva su `/app/accedi` già dentro, ma non chi entra proprio lì.** La sessione nasce su quella pagina: se guardasse `autenticato` a ogni disegno, un istante dopo il codice verificato la guardia e `ModuloAccesso` navigherebbero tutti e due, e vincerebbe l'ultimo — mandando sulla bacheca chi il profilo non l'ha ancora compilato.
- **Si esce con `useEsci()`** (`@prome/app-core`), da due punti: la colonna di navigazione e le impostazioni. Revoca la sessione sul server e poi svuota l'archivio locale — **e lo svuota anche se il server non risponde**: tenere dentro chi ha chiesto di uscire è il modo peggiore di rispondere a quel gesto, e su un computer condiviso è il caso in cui «esci» conta davvero.
- Un 401 `PR006` su una richiesta partita **con** un token chiude la sessione da sé (la reazione vive in `@prome/app-core/sessione`, registrata una volta per entrambi i client). Gli altri 401 dell'ingresso — codice sbagliato, codice scaduto — parlano del codice appena digitato, non della sessione, e non devono buttare fuori nessuno.

## Fare una chiamata

Gli hook sono generati da OpenAPI (`pnpm api:client` dopo ogni modifica agli endpoint). Le letture passano da `QueryBoundary`, le scritture da `useApiMutation`.

**Lettura** — la pagina descrive solo il caso "ci sono i dati":

```tsx
const aule = useElencoAuleStudio()

<QueryBoundary query={aule}>
  {({ data }) => <ElencoAule aule={data} />}
</QueryBoundary>
```

Attesa, errore, vuoto e aggiornamento in secondo piano sono già gestiti; per casi particolari si passano `caricamento`, `vuoto`, `errore` o `eVuoto`.

**Scrittura** — l'avviso di esito, gli errori sui campi e l'invalidazione della cache sono automatici:

```tsx
const salva = useApiMutation({
  mutationFn: creaAulaStudio,
  invalida: [getElencoAuleStudioQueryKey()],
  form,                                   // gli errori di validazione finiscono sui campi
  onSuccess: () => router.push('/aule'),
})
```

- **Non scrivere `onError` per mostrare l'errore**: ci pensa l'hook, con il messaggio già tradotto dal server.
- **Non tradurre i messaggi dell'API**: `meta.message` e `message` arrivano nella lingua della richiesta.
- `messaggioSuccesso` / `messaggioErrore` servono solo per sovrascrivere il server; di norma non si usano.

## Fare un form

Uno schema zod descrive le regole, `useForm` le applica, i campi si collegano da soli:

```tsx
const schema = z.object({
  titolo: z.string().min(1).max(200),
  descrizione: z.string().max(5_000).optional(),
})

const form = useForm({ schema, defaultValues: { titolo: '', descrizione: '' } })
const salva = useApiMutation({ mutationFn: creaPost, form })

<Form form={form} onSubmit={(valori) => salva.mutate({ data: valori })}>
  <FormInput name="titolo" etichetta={t('post.titolo')} obbligatorio />
  <FormTextarea name="descrizione" etichetta={t('post.descrizione')} massimoCaratteri={5000} />
  <FormSubmit>{t('comune.salva')}</FormSubmit>
</Form>
```

- Un nuovo tipo di campo si aggiunge in `components/form/` usando `useCampo`: **mai** `useController` nelle pagine.
- La validazione parte al blur e si aggiorna a ogni modifica.
- Aggiornamenti parziali: `form.valoriModificati()` invia solo i campi toccati.

## Internazionalizzazione

- Lingue: italiano e inglese, rilevate dal browser, **ripiego inglese**. La stessa regola vale per l'app mobile e per l'API.
- I testi stanno in `@prome/i18n` (`src/messaggi/{it,en}.json`), condivisi con il mobile. Le chiavi sono tipizzate: una chiave inesistente non compila, e una chiave presente in una sola lingua non compila.
- Nei componenti: `useTranslations()`; nelle funzioni server: `getTranslations()`.
- Collegamenti e navigazione: **sempre** da `@/i18n/navigazione` (`Link`, `useRouter`, `usePathname`), mai da `next/link` o `next/navigation`, altrimenti si perde il prefisso di lingua.
- Date e numeri: usare i formati dichiarati in `i18n/formati.ts`.

## SEO

- Ogni pagina esporta `generateMetadata` che passa da `creaMetadata({ lingua, percorso })`: garantisce titolo, descrizione, URL canonico, `hreflang` per entrambe le lingue e anteprime social.
- Una nuova pagina pubblica va aggiunta a `PERCORSI_PUBBLICI` in `lib/seo.ts`, così entra nella sitemap con le sue alternative.
- Le pagine di servizio passano `noIndex: true`.
- Le pagine pubbliche sono rese sul server e non fanno chiamate al caricamento: devono arrivare complete al primo byte.
- `robots.ts`, `sitemap.ts`, `manifest.ts` e l'immagine di anteprima sono generati dal codice: non aggiungere file statici equivalenti.

## Design system

- Colori, spaziature, raggi e ombre vengono da `@prome/design-tokens` e diventano CSS in `tokens.css` (**generato**: modificare il pacchetto, poi `pnpm --filter @prome/design-tokens build`).
- **Un solo vocabolario di colore**: i ruoli in italiano (`bg-sfondo`, `bg-superficie`, `text-testo`, `text-testo-corpo`, `text-testo-tenue`, `border-bordo`, `bg-primario`, `text-primario-accento`, `text-errore`) più le rampe in inglese, che sono scale e non ruoli (`bg-primary-500`, `text-neutral-700`). Nomi come `text-muted` o `bg-primary` **non esistono**: Tailwind non segnala una classe inventata, la ignora e basta — il colore sparisce senza errori.
- **Usare i ruoli, non le rampe.** Un gradino della rampa è un colore fisso: nel tema scuro resta com'è, e un `text-neutral-700` diventa testo quasi nero su fondo notte. La rampa va bene solo dove il colore è davvero lo stesso nei due temi — il menta del marchio (`bg-primary-500`), i campioni che mostrano un tema, i riempimenti decorativi.

### I quattro insiemi di colore, e quando usarli

| Insieme | Segue il tema | Serve per |
| --- | --- | --- |
| **Ruoli** (`text-testo-corpo`, `bg-superficie`, `border-bordo`) | sì | tutto ciò che è testo, superficie o bordo della pagina |
| **Tinte** (`bg-tinta-menta`, `text-tinta-rosa-testo`) | sì | chip, badge, riquadri colorati. Sul chiaro sono paste opache, sullo scuro il colore a bassa opacità |
| **Fascia inversa** (`bg-superficie-inversa`, `text-superficie-inversa-tenue`) | il fondo sì, i testi no | piè di pagina, barra dell'audio, intestazione dell'aula: sono scuri in **tutti e due** i temi |
| **Riempimenti** (`bg-riempimento-1…5`) | no | avatar e pastiglie decorative, che restano pastello anche di notte (sopra ci va `text-riempimento-testo`) |

Sbagliare insieme non produce un errore, produce un colore che scompare. I due casi che ricorrono: usare `text-primario-testo` (il testo *sopra* il riempimento menta, cioè verde scurissimo) su un fondo `tinta-menta` invece di `text-tinta-menta-testo`; e usare i ruoli della pagina dentro la fascia inversa, dove servono i ruoli della fascia.
- **La libreria di componenti chiama `--accent` l'azione del marchio**, non `--primary` (che in HeroUI v3 non esiste): la mappatura da ruolo a variabile sta nel generatore dei token, ed è l'unico posto dove va toccata.
- I token usano selettori `:root:root` di proposito: la libreria emette le proprie variabili dopo le nostre, e senza quella specificità in più vincerebbe lei.

### Tema chiaro e scuro

Il tema segue l'impostazione di sistema e si può cambiare dal selettore nell'intestazione (sito) e nella barra dell'app, o scegliere in **Impostazioni → Aspetto**. Lo gestisce `providers/tema.tsx` (non più `next-themes`, rimosso): la scelta sta in `localStorage` sotto la chiave `theme` con i valori `system|light|dark`, e si legge **dopo il montaggio** — leggerla durante l'idratazione farebbe disegnare al browser qualcosa di diverso dal server, che è il modo classico di far fallire l'idratazione.

Ad applicare il tema prima della prima pittura è `SCRIPT_TEMA` (`lib/tema.ts`), servito dal layout di lingua. **Va scritto come HTML grezzo dentro un contenitore, non come elemento React**, e non è un vezzo: React 19 vieta di *creare* un tag `<script>` durante un disegno lato browser, e un disegno lato browser dell'intera pagina avviene ogni volta che l'idratazione fallisce — per esempio quando un'estensione (MetaMask e simili) infila un nodo nel `<body>` prima di React. Con il tag dentro `dangerouslySetInnerHTML` di un `<div>`, React non crea mai uno script: reimposta l'HTML del contenitore, e uno script inserito via `innerHTML` il browser non lo esegue. Alla prima lettura invece sì, perché lì lo legge l'analizzatore della pagina.

Perché non si può fare più semplice: applicare il tema dal server (da un cookie) renderebbe **dinamiche** tutte le pagine pubbliche, che oggi sono generate in anticipo; farlo dopo l'idratazione riporterebbe il lampo chiaro. Lo script inline è il prezzo di quelle due cose insieme.

Le superfici scure non sono la rampa neutra rovesciata ma una scala propria (`scuro` in `colori.ts`), più fredda e con scatti brevi fra un livello e l'altro. Una schermata nuova va guardata in tutti e due i temi prima di dirla finita.

- I componenti di `components/ui/` sono l'unico punto che conosce la libreria sottostante: le pagine importano da lì, mai da `@heroui/react`.
- Un nuovo componente di libreria si aggiunge con un involucro che espone proprietà in linguaggio di prodotto (`variante="primaria"`), non in linguaggio di libreria.

## Pacchetti condivisi: sorgenti, non `dist`

`@prome/app-core`, `@prome/api-client` e `@prome/contenuti` esportano i **sorgenti TypeScript** (`"exports": "./src/index.ts"`), non una cartella compilata.

Non è una scorciatoia. Un pacchetto compilato in CommonJS che importa `@tanstack/react-query` ne ottiene la copia CJS, mentre l'app ne importa la copia ESM: due istanze dello stesso modulo, due contesti React diversi, e un `QueryClientProvider` montato correttamente che produce comunque «No QueryClient set». Lo stesso vale per qualunque libreria basata su contesto. Esportare i sorgenti fa risolvere una copia sola al bundler.

Un pacchetto nuovo consumato da web o mobile segue la stessa regola.

## Errori e schermate bianche

Tre reti, a profondità diverse:

1. `app/global-error.tsx` — fallisce il layout stesso; scrive il proprio `<html>`, testi di ripiego, stili in linea.
2. `app/[locale]/error.tsx` — fallisce una pagina; il layout resta in piedi.
3. `<ErrorBoundary>` — fallisce una porzione (un pannello, un widget); il resto continua a funzionare.

Attorno a qualunque sezione che può fallire da sola va un `ErrorBoundary`. Gli errori delle chiamate API non passano di qui: li gestiscono `QueryBoundary` e `useApiMutation`.
