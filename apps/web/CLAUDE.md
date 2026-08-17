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

**Entrambi gli assi si cambiano**, uno alla volta. La contattabilità è rimasta spenta e dichiarata finché nessuna regola la leggeva — un interruttore che non protegge da niente è peggio di uno che manca — e si è accesa quando è nato il gesto in cui può decidere **senza raccontare niente**: invitare una persona che si sta già guardando nella sala di un'aula aperta (`POST /aule-studio/:id/inviti/utente`). Sull'invito **per indirizzo** la regola resta inapplicata di proposito: un rifiuto lì direbbe a chiunque se una certa email ha un account su Prome. La scheda dice per esteso **dove vale**, perché una regola di privacy che non dichiara il proprio perimetro si legge più larga di quello che è.

Il pulsante «Invita» nella tabella dei permessi è spento con la ragione quando `contattabile` è falso: **lo stato lo dichiara il server**, ed è lo stesso valore che l'API applicherebbe — scoprire un divieto da un errore, dopo aver premuto, somiglia a un guasto e non a una scelta di qualcun altro.

### Il profilo e le impostazioni sono due destinazioni

`/app/profilo` è una pagina di **contenuto** — chi sei, cosa hai prodotto — e `/app/impostazioni` una pagina di **controllo**. Fino al 16 agosto 2026 la voce «Profilo» della colonna di navigazione portava alle impostazioni, e una pagina di profilo non esisteva. `/app/profilo/modifica` è una terza destinazione: cinque campi e una ricerca con suggerimenti stanno stretti in un modale, ed è la stessa scelta fatta sul telefono.

**Ogni sezione delle impostazioni è una rotta** (`/app/impostazioni/{privacy,notifiche,aspetto,dati,elimina}`), non un'ancora dentro una pagina sola: su un browser l'indirizzo si salva fra i preferiti, si manda a qualcuno, e il tasto indietro fa quello che ci si aspetta. L'indice sta in `impostazioni/layout.tsx` e porta a destra il valore corrente di ogni voce — è ciò che rende un indice migliore di una lista di controlli, perché quasi sempre chi apre le impostazioni vuole verificare, non cambiare. `/app/impostazioni` resta valido e rimanda alla privacy: era nella navigazione e nei preferiti, e romperlo per una riorganizzazione interna sarebbe un guasto per chi non c'entra.

### Destinazioni nella colonna, azioni nella barra

**`AppTopbar.azioni` accetta solo verbi, e solo sulla schermata che si sta guardando.** Un collegamento a un'altra pagina messo lì esiste su una schermata sola: non è navigazione, è un nascondiglio. Fino al 17 agosto 2026 «Impostazioni» stava esattamente lì, sulla barra del solo profilo — una destinazione globale raggiungibile da un punto solo.

La colonna ha quindi **due zone**, separate da una riga (`app-sidebar.tsx`): sopra i luoghi dove si lavora (`VOCI`: bacheca, aule, gruppi, profilo), sotto come funziona l'applicazione (`VOCI_SERVIZIO` + «Esci»). Non sono due gruppi di collegamenti, sono due categorie: «Impostazioni» come quinta voce accanto a «Gruppi» direbbe che configurare e studiare sono la stessa attività. La scheda in fondo porta al **profilo** — mostra nome, corso e ateneo, e una scheda che mostra l'identità e apre il quadro elettrico è una porta con l'insegna sbagliata.

**La colonna è alta quanto la finestra e non si muove** (`sticky top-0 h-dvh self-start`), e dentro scorre **una parte sola**: il blocco centrale con la navigazione e i gruppi (`min-h-0 flex-1 overflow-y-auto`). Zona di servizio e scheda identità stanno fuori da quel blocco, quindi sono sempre a schermo. Non è un dettaglio estetico: l'elenco dei gruppi cresce fino a otto voci, quindi con l'altezza data dal contenuto «Impostazioni» finiva sotto la piega **proprio da chi ha più gruppi** — e in `bacheca`, dove a scorrere è il documento e non un contenitore interno, se ne andava su insieme alla pagina. Un menu che a volte c'è non è un menu. Qualunque cosa si aggiunga alla colonna va decisa dicendo in quale delle due parti sta: se è una voce stabile, sta fuori dal blocco che scorre.

**L'avatar in testata è `MenuAccount`** (Profilo, Impostazioni, Esci), non più un ritratto inerte: è l'angolo che tutti premono cercando l'account. Non è una seconda navigazione — le voci sono le stesse della colonna — ed è **l'unica strada per le impostazioni sotto i 1024px**, dove `AppSidebar` non viene montata. Sta in `AppTopbar` per la stessa ragione della campanella: dieci pagine la renderebbero in dieci punti.

Il debito resta scritto: sotto i 1024px `AppShell` non monta alcuna navigazione, solo la barra. Finché è così, ogni destinazione che esiste **solo** nella colonna è irraggiungibile da lì.

**Le azioni stanno sull'oggetto su cui agiscono.** «Modifica profilo» è sulla scheda d'identità in `hub-profilo.tsx`, in `contorno`: era in cima allo schermo, unico bottone pieno della pagina, a mille pixel dalla scheda che modifica, per un gesto che si fa una volta all'anno. Stessa ragione per la pastiglia della visibilità, che è un collegamento a `/app/impostazioni/privacy`: è l'unica impostazione che quella schermata dichiara, e dichiararla senza dire dove si cambia obbliga a cercarla nell'indice.

### I propri contenuti: tre pagine, nessun endpoint nuovo

Le tessere del profilo portano tutte da qualche parte, e i quattro numeri vengono dalla paginazione (`limit: 1`: serve il totale, non l'elenco):

- **`/app/profilo/post`** è la bacheca con `?soloMiei=true` — un parametro, non una collezione nuova: `/bacheca/miei` avrebbe avuto la stessa forma, la stessa paginazione e gli stessi difetti da correggere due volte. Ci compaiono anche i post che le proprie impostazioni nascondono agli altri: la visibilità dice chi vede le cose **altrui**.
- **`/app/profilo/aule`** riusa `GET /aule-studio`, che risponde già «le aule di cui faccio parte». Si chiama «le tue aule» e non «create da te» perché chi ha aperto un'aula non è scritto da nessuna parte, e l'unico indizio — essere moderatore — vale anche per chi è stato promosso dopo.
- **`/app/profilo/materiali`** è la raccolta personale (`GET /materiali-salvati`), con l'aula di provenienza su ogni riga: un elenco di nomi di file senza provenienza non dice niente.

### Segnaposto: quello che il disegno prevede e il prodotto non ha

`lib/segnaposto.ts` **è** l'elenco del debito: `rg SEGNAPOSTO_ apps/web/src` lo conta in un comando, e quando l'endpoint arriva si cancella la riga e il compilatore indica ogni punto da sistemare. Non contraddice la regola di questa sezione — «qui c'è solo ciò che funziona» — la rende applicabile a un disegno più ricco del prodotto: **la struttura si ritaglia intera, ma nulla di ciò che non funziona può somigliare a qualcosa che funziona.**

Tre marcatori, sempre insieme: la costante in quel file; `presto={SEGNAPOSTO_…}` su `RigaElenco` (spegne la riga, mostra «Presto», toglie valore e freccia) oppure `gestoSospeso(SEGNAPOSTO_…)` accanto a `isDisabled` per un comando; e una riga `SEGNAPOSTO:` nel docblock del file. Un numero che non c'è si scrive `—`, mai `0`.

**Un segnaposto è un ritardo, non un ripensamento.** Ciò che è stato deciso di non fare non diventa una riga spenta con la pastiglia «Presto»: quella pastiglia è una promessa, e su qualcosa che non arriverà è la peggiore che si possa fare. Va tolto, e la ragione resta scritta qui.

È il caso del **profilo pubblico**. Il disegno prevedeva `prome.app/u/{nome}`, un bottone «Vedi profilo pubblico» e una pastiglia sulla scheda d'identità: niente di tutto questo esiste, e non è in ritardo. **I dati delle persone su Prome sono privati e non sono mai liberamente accessibili** — vedi la regola non negoziabile più su. Un profilo non ha un indirizzo pubblico, non finisce in un motore di ricerca e non si condivide. Per la stessa ragione la visibilità dei contenuti, quando compare accanto a un nome, porta sempre la sua etichetta: «Privato» da solo si legge come «questo profilo è privato», «Pubblico» come «questo profilo è sul web», e la seconda lettura è falsa.

### Notifiche: campanella, elenco, 404

La campanella sta **dentro `AppTopbar`**, non nelle `azioni` delle pagine: dieci pagine la renderebbero in dieci punti, e quella dimenticata sarebbe una schermata senza campanella. Porta il numero vero di non lette (`useNotificheLive`: query con rilettura a 60 s + socket sulla stanza personale che invalida — il socket non porta dati, porta un campanello) e naviga a `/app/notifiche`, che è una pagina e non un popover: ha un indirizzo, e la stessa forma esiste sul telefono.

Il click su una riga **naviga subito e segna letta senza aspettare** (best-effort, niente `useApiMutation`: un toast a ogni click è rumore). I testi si traducono dal `tipo` sul client: la riga non porta nomi né frasi. La destinazione si costruisce da `risorsaTipo`+`risorsaId` con `percorsiApp.*`.

**I due file `.well-known` sono la metà server dei link universali** (`app/.well-known/…/route.ts`, costruiti da `lib/link-app.ts`): dicono a iOS e ad Android che `https://prome.app/app/inviti/<id>` lo sa aprire l'app. La decisione «app o browser» **non si prende qui** — nessun riconoscimento dell'`User-Agent`, nessuna redirezione verso `prome://`: quella supposizione non può sapere se l'app è installata, e sbagliando manda un invitato su un errore del browser. Senza i valori d'ambiente i due indirizzi rispondono **404**, che è la verità e si comporta come prima; un file con un Team ID sbagliato verrebbe invece messo in cache da Apple e romperebbe i collegamenti in silenzio. I percorsi rivendicati sono **solo quelli degli inviti**, e sono gli stessi di `apps/mobile/src/app/+native-intent.tsx`: si cambiano insieme.

**Un invito ha due risposte, e stanno una accanto all'altra** (`accetta-invito-aula.tsx`, `accetta-invito-gruppo.tsx`): «Entra» (202, poi si entra quando il server conferma che il partecipante c'è — la finestra di IA3 si dichiara, non si nasconde dietro un caricamento muto) e «Rifiuta» (200, l'invito si chiude e la scheda lo dice). Le stesse due schermate esistono native sul telefono: la pagina web non è più l'unica strada, ma è **la stessa decisione**, e va cambiata di là insieme.

**«Risorsa non trovata»**: le destinazioni (post, gruppo, sala, inviti) passano al `QueryBoundary` un ramo `errore` che su `statusErrore(e) === 404` mostra `RisorsaNonTrovata` — senza Riprova, perché riprovare un 404 produce lo stesso 404. Il 404 si riconosce dallo **status**, mai elencando codici di dominio.

### Preferenze di notifica

`impostazioni-notifiche.tsx` **dichiara il proprio stato invece di tacerlo**: le preferenze si salvano davvero e il server le rilegge all'istante dell'invio, ma governano **i canali che interrompono** — l'email del commento oggi, il push quando ci sarà un fornitore — mai la campanella, dove le notifiche arrivano sempre. Spegnere un asse significa «non disturbarmi», non «nascondimi l'informazione», e la scheda lo dice in prima riga. È l'opposto degli interruttori tolti a luglio, che si dicevano attivi senza salvare niente.

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
