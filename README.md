# Prome — v2

Piattaforma di studio per studenti universitari: post con allegati in bacheca, aule studio con chat e audiochat, gruppi. Motto: **Tributo al progresso**.

La documentazione di progetto (discovery, domain model, architettura, stima, piano) è in [documentation/](documentation/) — generata dalla pipeline donumAI, **non va modificata a mano**.

## Struttura

```
apps/
  api/             backend NestJS + Fastify (monolite modulare; unità "app" e "worker")
  web/             Next.js App Router — sito pubblico e applicazione web
  mobile/          React Native + Expo
packages/
  contracts/       tipi del contratto client (envelope, errori, paginazione)
  api-client/      client generato da OpenAPI: tipi + hook React Query
  app-core/        logica condivisa web/mobile: chiamate, form, stati delle query
  contenuti/       tipi del dominio, contenuti dimostrativi e ricerche
  design-tokens/   colori, spaziature, raggi, tipografia, icone — unica fonte di verità
  i18n/            cataloghi di traduzione e negoziazione della lingua
```

Ogni pacchetto condiviso esiste per non scrivere due volte la stessa cosa: **una regola, un posto**. Il tema è definito una volta e diventa CSS per il web e oggetto TS per il mobile; i messaggi di interfaccia sono un solo catalogo per entrambi; il comportamento delle chiamate API (avvisi, errori sui campi, invalidazione) è uno solo.

Il grafo dei moduli del backend rispecchia la Context Map del domain model: `profilo`, `bacheca`, `gruppo`, `aula-studio` (core), più `facciata` (REST versionata) e `worker`.

Convenzioni per contribuire: [apps/api/CLAUDE.md](apps/api/CLAUDE.md), [apps/web/CLAUDE.md](apps/web/CLAUDE.md), [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md).

## Scelte trasversali

**Visibilità** — un'aula studio o un gruppo può essere Privato, Ateneo o Pubblico, e **"Pubblico" vuol dire aperto a tutti gli studenti iscritti**, non al web. Nessun contenuto degli utenti — aule, post, commenti, materiali, profili, gruppi — è raggiungibile senza un account né indicizzato: il sito pubblico racconta il prodotto, l'app contiene i contenuti.

**Accesso** — **unificato, email + codice OTP. Non esistono password**, e non esiste una registrazione separata: si scrive l'email, arriva un codice a sei cifre, si entra; se l'account non c'era nasce lì, e l'onboarding (nome, cognome, università, corso) segue. Niente accessi social, niente "password dimenticata", niente "cambia password" nelle impostazioni — se una schermata li propone, è un residuo da togliere.

**Tema** — chiaro e scuro, entrambi definiti nel disegno. Segue l'impostazione di sistema e si può forzare; i valori stanno una volta sola in `@prome/design-tokens` e diventano CSS per il web e oggetto TS per il mobile.

**Lingua** — italiano e inglese. Il client rileva la lingua da browser o dispositivo e ripiega sull'inglese; la manda a ogni richiesta (`x-lang`) e l'API risponde con messaggi già tradotti. **I client non traducono mai i messaggi del server.**

**Errori** — ogni errore esce dall'API come `{ statusCode, errorCode, message, errorId, timestamp, details? }`: `errorCode` individua il punto esatto nel codice, `errorId` correla la segnalazione dell'utente con i log, `details` porta gli errori di validazione campo per campo (che i form mostrano sotto ai campi giusti).

**Risposte** — ogni successo esce come `{ data, meta }`, con `meta.message` tradotto e la paginazione in `meta.pagination`.

**Niente schermate bianche** — confini di errore a tre livelli sul web (globale, di pagina, di sezione) e uno sopra l'intera app mobile.

## Database

Postgres 16 con **schemi disgiunti per bounded context** (`profilo`, `bacheca`, `gruppo`, `aula_studio`) più lo schema tecnico `cancellazione`. Niente foreign key tra schemi: i riferimenti cross-context sono ID nudi. Prisma con `multiSchema`.

## Comandi

```bash
pnpm install            # installa tutto il workspace
cp .env.example .env    # configura l'ambiente (l'API fa fail-fast se manca qualcosa)

pnpm db:up              # Postgres 16 in Docker (localhost:5432, prome/prome)
pnpm db:migrate         # applica le migration

pnpm dev:api            # API su :3001 (unità "app") — /docs per la documentazione OpenAPI
pnpm dev:worker         # unità "worker" (stessa codebase, APP_ROLE=worker)
pnpm dev:web            # web su :3000
pnpm dev:mobile         # Expo

pnpm api:client         # rigenera il client dall'OpenAPI: DOPO ogni modifica agli endpoint
pnpm typecheck          # typecheck di tutto il workspace
pnpm build              # build di tutto il workspace (in ordine di dipendenza)
pnpm --filter @prome/api test
```

Dopo aver modificato i token del design system: `pnpm --filter @prome/design-tokens build` (rigenera `tokens.css`, che è committato).

## Rifiniture rimandate

- Negazione dell'accesso cross-schema a livello di privilegi DB (per ora è una convenzione, non è imposta dal motore).
- Better Auth, Socket.IO, Cloudflare R2, LiveKit (gate S-audio), provider email (gate S-mail), FCM.
- Outbox per-schema e recapito fatti E1–E6; catena di cancellazione account.
- CI, deploy, osservabilità (7 segnali) e allarmi.
- File definitivi del logo e delle icone (web e app usano un segnaposto che rispetta il marchio).
# prome-app
