# Convenzioni API — Prome

> Aggiornare dopo ogni nuova convenzione o pattern. Le regole qui sono vincolanti per tutto il codice di `apps/api`.

## Principi

1. **La facciata autentica, i moduli autorizzano**: nessuna decisione di visibilità/ammissione nella facciata o nel token.
2. **Contratto client unico**: tutte le forme di ingresso/uscita vivono in `@prome/contracts` (evoluzione solo additiva dentro una versione).
3. **Tutto tradotto lato server**: la lingua viaggia in OGNI richiesta (`?lang` > header `x-lang` > `Accept-Language`, fallback `it`). Il client non traduce mai messaggi del server.
4. **Grafo moduli = Context Map**: Profilo importabile da Bacheca/Gruppo/AulaStudio; questi tre mai tra loro; nessuno importa la Facciata.

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
- Codici per contesto: **Profilo PR001-999, Bacheca BA, Gruppo GR, Aula studio AS** (`modules/{contesto}/constants/error-codes.ts`); sistema S/V/H in `common/constants/error-codes.ts`. Stesso messaggio, punti diversi → codici diversi.
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

- L'infrastruttura trasversale è coperta da `test/infrastruttura-api.spec.ts`: se tocchi filtro/interceptor/pipe, i test devono passare (`pnpm --filter @prome/api test`).
- I test usano `creaValidationPipe()` (`common/pipes`), la STESSA di `main.ts`: mai duplicare la configurazione della pipe.
- Aree a difetti invisibili (auth, upload, permessi/visibilità, cancellazione account): test automatici obbligatori, scritti prima del codice.
