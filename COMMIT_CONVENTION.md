# Convenzione per i messaggi di commit

I commit di questo repository seguono lo standard [Conventional Commits](https://www.conventionalcommits.org/).

## Formato

```
tipo(ambito): descrizione breve

corpo opzionale

footer opzionale
```

- **tipo** (obbligatorio): categoria della modifica, vedi tabella sotto.
- **ambito** (opzionale): parte del monorepo toccata, es. `api`, `web`, `mobile`, `api-client`, `contracts`, `i18n`.
- **descrizione** (obbligatoria): all'imperativo presente ("aggiungi", "correggi", "rimuovi"), minuscola, senza punto finale, massimo 72 caratteri.
- **corpo** (opzionale): spiega il *cosa* e il *perché* della modifica, non il *come*. Separato dalla prima riga da una riga vuota. Per modifiche ampie usa un elenco puntato.
- **footer** (opzionale): riferimenti a issue (`Closes #12`) o breaking change.

## Tipi

| Tipo | Quando usarlo |
|------|---------------|
| `feat` | nuova funzionalità visibile all'utente o nuova API |
| `fix` | correzione di un bug |
| `refactor` | modifica al codice che non cambia il comportamento |
| `perf` | miglioramento delle prestazioni |
| `test` | aggiunta o modifica di test |
| `docs` | solo documentazione |
| `style` | formattazione, senza impatto sul codice |
| `build` | dipendenze, configurazione di build, tooling |
| `ci` | pipeline e automazioni |
| `chore` | manutenzione varia che non rientra nelle categorie sopra |

## Breaking change

Aggiungi `!` dopo il tipo/ambito (`feat(api)!: ...`) e descrivi la rottura nel footer:

```
BREAKING CHANGE: descrizione della modifica incompatibile
```

## Regole aggiuntive

- Un commit = un cambiamento logico. Evita commit "calderone" quando possibile.
- Il messaggio è in italiano, coerente con il linguaggio ubiquo del progetto.
- **Non aggiungere** trailer di co-autoria generati da strumenti (es. `Co-Authored-By: Claude ...`) né altri riferimenti agli strumenti usati per scrivere il codice.

## Esempi

```
feat(api): aggiungi endpoint per la pubblicazione dei post
fix(web): correggi il redirect dopo il completamento del profilo
refactor(api-client): rigenera i modelli dal contratto OpenAPI
docs: aggiungi convenzione per i messaggi di commit
```
