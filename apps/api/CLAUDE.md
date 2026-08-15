# Convenzioni API — Prome

> Aggiornare dopo ogni nuova convenzione o pattern. Le regole qui sono vincolanti per tutto il codice di `apps/api`.

## Principi

1. **La facciata autentica, i moduli autorizzano**: nessuna decisione di visibilità/ammissione nella facciata o nel token.
2. **Contratto client unico**: tutte le forme di ingresso/uscita vivono in `@prome/contracts` (evoluzione solo additiva dentro una versione).
3. **Tutto tradotto lato server**: la lingua viaggia in OGNI richiesta (`?lang` > header `x-lang` > `Accept-Language`, fallback `it`). Il client non traduce mai messaggi del server.
4. **Grafo moduli = Context Map**: Profilo importabile da Bacheca/Gruppo/AulaStudio; questi tre mai tra loro; nessuno importa la Facciata.

## Accesso (E0.2)

**Un solo modo di entrare: email + codice OTP.** Niente password, niente accessi social, nessuna registrazione separata — chi verifica un codice per la prima volta ottiene account e profilo.

- Il fornitore di identità è **Better Auth**, configurato in `infrastruttura/accesso/better-auth.ts`. **Le sue rotte HTTP non sono montate**: i controller lo chiamano come libreria (`auth.api.signInEmailOTP(...)`), così ingresso e uscita restano quelli del contratto — una envelope sola, un formato d'errore solo, messaggi tradotti. Montare le sue rotte introdurrebbe una seconda forma di risposta nella stessa API.
- I suoi errori entrano da un punto solo: `infrastruttura/accesso/errori-del-fornitore.ts` li traduce in `AppException`. Ciò che non riconosce diventa un errore spiegato con il dettaglio nei log, mai un 500 muto.
- Le sue tabelle stanno nello schema **`accesso`**, che non è un contesto di dominio: nessun modulo lo legge. L'unico punto di contatto è `PortaIdentitàUtente`.
- I **nomi dei modelli Prisma** (`User`, `Session`, `Account`, `Verification`) sono quelli del fornitore e non seguono la nomenclatura del progetto: rinominarli vorrebbe dire mantenere a mano una mappatura che si rompe in silenzio. I nomi delle tabelle restano in italiano.

### PortaIdentitàUtente e la guardia

- `modules/profilo/porta-identita-utente.ts` converte la sessione in `UtenteDiDominio` (**solo un id**). Non passano account, sessione, provider; non si decide chi può fare cosa.
- `modules/facciata/guardia-accesso.ts` è registrata come **guardia globale**: ogni endpoint nasce protetto. Aprirne uno è un gesto esplicito, `@SenzaAccesso()`, che si vede nella diff — il contrario lascerebbe scoperto ciò che ci si dimentica di proteggere.
- Nei controller l'utente arriva con `@Utente()`. Su un endpoint protetto c'è sempre: se non ci fosse, la guardia avrebbe già risposto 401 (PR006).
- I codici errore dell'ingresso stanno fra quelli di **Profilo** (PR003–PR008): Accesso non è un contesto, e chi possiede la porta possiede anche i modi in cui può fallire.

### Invio del codice

`AvvisiInUscita` è una porta (`infrastruttura/avvisi-in-uscita/canale-email.ts`). L'unico adattatore è quello di sviluppo, che **scrive il codice nei log e non manda niente**: in produzione l'avvio si ferma (`CANALE_EMAIL=sviluppo` + `NODE_ENV=production` = fail-fast), perché un codice nei log è un codice regalato. Il fornitore vero è ancora uno spike aperto.

## Bacheca: post con allegato (E0.5)

Le invarianti dell'aggregato vivono in `modules/bacheca/dominio/post.ts`, **non nei DTO**: la validazione dell'ingresso protegge dalla richiesta malformata, il costruttore protegge l'aggregato. Sono due cose diverse, e confonderle lascerebbe il Post scoperto quando nasce da un comando che non passa dalla facciata.

- **B1** testo non vuoto dopo trim, ≤ 5.000 caratteri · **B3** ogni file completo, tipo ∈ {PDF, immagine, testo}, dimensione > 0 e ≤ 25 MB · **B4** post e allegati nella stessa transazione · **B5** il Post **non ha** attributo di visibilità · **B6** senza la prova di onboarding non c'è Post.
- **B6 in codice**: `ProvaOnboardingCompletato` ha un simbolo non esportato, quindi nessun altro file può fabbricarla — si può solo riceverla da `ProfiloService.provaDiOnboarding()`. Non scrivere una prova finta per riusare il costruttore: se serve solo la regola sul file, c'è `verificaFileArchiviato()`.
- **B5 in lettura**: `elenca()` risolve chi vede cosa **adesso**, interrogando le Impostazioni di privacy dell'autore. Cambiare le proprie impostazioni ha quindi effetto immediato su ciò che si è già pubblicato. Non aggiungere una colonna di visibilità sul post per fare prima.

### Caricamento dei file

**I byte non attraversano gli endpoint di dominio.** Tre tempi: `POST /bacheca/allegati/pre-autorizzazione` (verifica tipo e dimensione *prima*, prenota la chiave), `PUT /archivio/...` con firma e scadenza nell'indirizzo, poi `POST /bacheca` che cita le chiavi.

- `ArchivioDiFile` è una porta; l'unico adattatore è `ArchivioLocale`, che scrive su disco ma **usa lo stesso flusso firmato** di un fornitore vero: sostituirlo non tocca né i controller né la Bacheca.
- Le chiavi hanno per prefisso contesto e proprietario logico (`bacheca/allegato/<id>/<nome>`), **mai l'identificativo utente**: sopravvivono alla cancellazione dell'account e finiscono negli indirizzi.
- `AllegatoInAttesa` è la prenotazione fra pre-autorizzazione e pubblicazione. Sta in una tabella separata proprio per B4: nella tabella degli allegati, ogni caricamento abbandonato sarebbe un allegato orfano.
- I corpi binari li abilita `registraCorpiBinari()` (`config/fastify.ts`), condivisa fra `main.ts` e i test: senza, Fastify risponde 415 a un PDF.

### Post completi e commenti (E2)

- **Modifica ed eliminazione**: solo l'autore, e il controllo sta nel modulo — mai nella facciata, che attraversa quattro contesti. Post inesistente → 404, post altrui → 403: sono due azioni diverse per chi le riceve.
- **Eliminare un post** porta via gli allegati nella stessa transazione (B4) e i file dall'archivio **subito dopo**, fuori dalla transazione: un archivio lento non deve tenerne una aperta. I **commenti** spariscono invece in differita — sono aggregati autonomi e nessuno li aspetta.
- **Il Commento non ha foreign key verso il post** (C3): riferisce il `postId` per identità. L'esistenza si verifica al comando, su lettura fresca, e la finestra che resta la chiude `PuliziaBachecaService` dall'unità lavoratrice. Quando arriverà il recapito dei fatti (E3), quella riconciliazione diventerà la reazione a un fatto.
- **I permessi li dichiara il server**: `puoModificare` sul post, `puoEliminare` sul commento. Non farli dedurre al client — sarebbero due copie della stessa regola, e quella del client è aggirabile.
- **Lettura di un singolo post**: post inesistente e post non visibile rispondono entrambi 404. «Esiste ma non puoi vederlo» racconta comunque che esiste.

## Cancellazione dell'account (V5/SE3)

Componente **trasversale**, non un bounded context: `modules/cancellazione` orchestra e verifica, ma **non decide alcuna sorte** — la sorte la decide il modulo proprietario del dato. È l'unico modulo autorizzato a importare più contesti insieme; nessun modulo lo importa (solo Facciata, App e Worker) e **nessun modulo legge lo schema `cancellazione`**.

- **Grazia di 14 giorni**: `POST /account/cancellazione` (202) crea la voce nel registro, revoca TUTTE le sessioni e nasconde subito il profilo (`Profilo.inCancellazioneDal`, scritto solo via `ProfiloService`). Un accesso OTP entro la grazia annulla (delete **condizionato sul tempo**: chiude la gara col worker senza colonne di stato); oltre, l'accesso risponde 403 `CA001` e revoca la sessione appena creata.
- **La catena** esegue nel worker, in quest'ordine vincolante: Bacheca (anonimizza) → Profilo (elimina) → Accesso (elimina). Eliminare il profilo prima dell'anonimizzazione esporrebbe post con l'id reale «senza profilo», cioè visibili e collegabili.
- **Anonimizzazione**: id `anonimo-<uuid>` **nuovo per record** (mai uno pseudonimo per utente: due post non devono restare collegabili), **nessuna mappa** conservata. `modules/bacheca/cancellazione-bacheca.service.ts` è **l'unico file che scrive `autore_id`** (R12): non aggiungere scritture altrove.
- **Accesso**: `infrastruttura/accesso/cancellazione-accesso.ts` è il **secondo** punto sancito che tocca lo schema `accesso` (l'altro è `PortaIdentitàUtente`): non aggiungerne altri. Fatto non ovvio: l'`identifier` delle righe OTP è `sign-in-otp-<email>` — si eliminano per `contains`, nella **stessa transazione** dell'utente, perché dopo l'email non è più nota a nessuno.
- **Verifica del residuo (SE3)**: 0 record e 0 file su TUTTI i detentori censiti — l'elenco chiuso è `DETENTORI_CENSITI` in `cancellazione.service.ts`, con copia speculare nell'helper `residuoDi` di `test/cancellazione.spec.ts`: **si aggiornano insieme a ogni nuovo detentore**. I file degli allegati dei post anonimizzati DEVONO restare.
- **Il registro sopravvive al completamento** (solo `utente_id` + istanti + esiti, nessun altro dato personale): serve alla **ri-applicazione automatica dopo un ripristino** — il giro ri-verifica ogni ora anche le voci completate e ri-esegue la catena se trova residuo risorto. Allerta (`logger.error`) oltre il 25° giorno senza esito totale.
- Gli eventi (`cancellazione_richiesta`/`annullata`/`completata`) viaggiano **senza `utenteId`**.
- I contenuti anonimizzati restano visibili **a ogni iscritto** (`elenca`/`leggi` ammettono la classe `anonimo-`), mai al web; il server manda `rimosso: true` sull'autore e i client mostrano «Utente rimosso».

## Misurazioni di utilizzo (E1.6)

`MisurazioniDiUtilizzo` è una porta **senza fornitore assegnato**, e resta tale finché non è dimostrabile la conformità su regione e trattamento: quello che esiste sono i punti di emissione, provati da `test/misurazioni.spec.ts`. Attaccarci un prodotto sarà un adattatore, non una riscrittura.

- L'elenco degli eventi è **chiuso** (`EventoDiProdotto`): un evento a stringa libera diventa in poche settimane un elenco di nomi simili, e un errore di battitura produce una serie storica che sembra vuota.
- Le proprietà ammesse sono **un tipo, non una convenzione** (`ProprietaEvento`): ciò che non è dichiarato lì non si può emettere. **Nessun dato personale** — niente email, nomi, testi o nomi di file; l'unico riferimento a una persona è `utenteId`, lo stesso che i log possono portare.
- Si emette **dopo** che il gesto è riuscito: un accesso fallito non è un accesso, e contarlo gonfierebbe la sola misura su cui il prodotto dovrà decidere qualcosa.

## Formato delle risposte (tutte, nessuna eccezione)

**Successo** — envelope automatico via `ResponseInterceptor` globale (i controller/service ritornano dati NUDI, mai wrappare a mano):

```json
{ "data": { ... }, "meta": { "status": 200, "message": "Operazione completata", "timestamp": "..." } }
```

Liste paginate: il service ritorna `PaginatedResult<T>` (`{ data: T[], meta: { total, page, limit, totalPages } }`) e l'interceptor sposta la paginazione in `meta.pagination`.

**Errore** — prodotto dal `GlobalExceptionFilter`:

```json
{ "statusCode": 404, "errorCode": "PR001", "message": "Profilo non trovato", "errorId": "uuid", "timestamp": "...", "details": [ ... ] }
```

- `errorCode`: localizzatore del punto esatto di lancio (indipendente dal messaggio).
- `message`: già tradotto. `errorId`: UUID che correla la segnalazione con i log.
- `details`: solo per validazione (`V001`), campo per campo, tradotti.

## Errori: come lanciarli

Sempre e solo `AppException` per gli errori di dominio:

```typescript
import { AppException } from '../../common/exceptions';
import { ProfiloErrorCode } from './constants/error-codes';

throw new AppException(ProfiloErrorCode.NOT_FOUND, 'PROFILO_NOT_FOUND', HttpStatus.NOT_FOUND, { utenteId });
```

- `messageKey` è TIPIZZATA da `src/i18n/it/errors.json` (autocomplete; una chiave inesistente non compila).
- Codici per contesto: **Profilo PR001-999, Bacheca BA, Gruppo GR, Aula studio AS, Cancellazione CA** (`modules/{contesto}/constants/error-codes.ts`); sistema S/V/H in `common/constants/error-codes.ts`. Stesso messaggio, punti diversi → codici diversi.
- Nuovo errore: aggiungi il codice nel contesto, la chiave in **entrambi** `i18n/it/errors.json` e `i18n/en/errors.json` (la parità è verificata a compile time), poi lancia.
- Nuovo contesto: crea `constants/error-codes.ts` col suo prefisso e aggiungilo alla union `ErrorCode` in `common/constants/error-codes.ts`.
- I 5xx non intenzionali sono mascherati dal filtro: il dettaglio resta SOLO nei log (mai nomi o contenuti utente nei log — solo `utente_id`).
- Debug da segnalazione utente: `errorCode` → cerca il codice in `modules/*/constants/error-codes.ts`; `errorId` → grep nei log.

## Successi: messaggio sempre dichiarato

- `@ResponseMessage('successes.CHIAVE')` obbligatorio su POST/PATCH/DELETE (chiave tipizzata da `successes.json`, tradotta). GET può usare il default.
- Nuova chiave: sempre in entrambe le lingue (`it` + `en`).
- `@SkipResponseWrapper()` solo per risposte che DEVONO essere raw (stream, redirect, webhook).

## Ingresso: DTO con class-validator

- Ogni body/query ha un DTO in `modules/{contesto}/dtos/` (o `common/dto/` se trasversale). Pipe globale: `whitelist` + `forbidNonWhitelisted` + `transform` (campi non previsti = errore V001).
- Le query di lista estendono **sempre** `PaginationDto` (`common/dto`): `page` (default 1), `limit` (default 20, max 100), `sortBy`, `sortOrder`.
- I messaggi dei vincoli standard sono tradotti automaticamente (mappa in `global-exception.filter.ts` + `i18n/*/validation.json`). Vincolo nuovo o messaggio specifico: `@MinLength(8, { message: 'validation.MIA_CHIAVE' })` e aggiungi la chiave in entrambe le lingue.
- Separare `Crea{X}Dto` e `Aggiorna{X}Dto` (usare `PartialType` quando ha senso).

## OpenAPI

- `@ApiWrappedResponse({ type })` per risorsa singola, `@ApiPaginatedResponse({ type })` per liste. MAI `@ApiOkResponse`/`@ApiCreatedResponse` diretti: non documentano l'envelope.
- Ogni endpoint ha `@ApiTags` e `@ApiOperation`. Docs su `/docs` (solo fuori produzione).
- I tipi wire condivisi stanno in `@prome/contracts`; le classi `*Dto` con `@ApiProperty` li implementano (`implements`), così contratto e documentazione non divergono.

## Client generato (Orval + React Query)

- La spec OpenAPI è la fonte del client: `pnpm api:client` (root) emette `packages/contracts/openapi.json` e rigenera `@prome/api-client` (tipi + hook TanStack Query v5, mutator fetch condiviso web/mobile).
- **Rilanciare `pnpm api:client` dopo ogni modifica a endpoint o DTO**; i file in `packages/api-client/src/generated` non si toccano a mano.
- Dare un `operationId` parlante con `@ApiOperation({ operationId: '...' })` quando il nome dell'hook generato conta.

## Test

- **Serve un database**: `pnpm db:up` prima di `pnpm --filter @prome/api test`. Il percorso di ingresso è un'area a difetti invisibili, e provarlo contro un doppio significherebbe provare il doppio.
- L'infrastruttura trasversale è coperta da `test/infrastruttura-api.spec.ts`; accesso e profilo da `test/accesso-e-profilo.spec.ts`, che copre anche i percorsi infelici (codice sbagliato, scaduto, troppi tentativi, nessuna sessione, onboarding parziale).
- Jest trasforma anche il fornitore di identità e la sua catena, pubblicati solo come ESM (`transformIgnorePatterns` in `package.json`): Node li carica da sé, Jest no.
- I test usano `creaValidationPipe()` (`common/pipes`), la STESSA di `main.ts`: mai duplicare la configurazione della pipe.
- Aree a difetti invisibili (auth, upload, permessi/visibilità, cancellazione account): test automatici obbligatori, scritti prima del codice.
