# Convenzione Git: branch e messaggi di commit

## Struttura dei Branch

Utilizziamo un Git Flow basato su **environment-driven branching** con 3 o 4 branch principali che rispecchiano i nostri ambienti.

### Branch principali (environment-based)

- `develop`: branch di sviluppo, qui mergiamo le MR dai feature branch
- `staging`: ambiente di test interno per prove del team di sviluppo
- `uat`: ambiente di pre-produzione per test del cliente (quando richiesto)
- `master`: branch di produzione, ambiente live

### Branch di supporto

- `feat/*`: per lo sviluppo di nuove funzionalità (partono da develop)
- `refactor/*`: per refactoring del codice esistente
- `hotfix/*`: per correzioni urgenti in produzione

### Flusso delle Merge Request

- **Flusso standard (senza UAT):** `feat/*` → `development` → `staging` → `master`
- **Flusso con UAT (quando richiesto dal cliente):** `feat/*` → `development` → `staging` → `uat` → `master`

## Regole obbligatorie

### 1. Creazione feature branch

```bash
git checkout development
git pull origin development
git checkout -b feat/nuova-funzionalità
```

### 2. Merge Request flow

- **Feature → Development:** MR standard con review obbligatoria
- **Development → Staging:** deploy automatico per test interni
- **Staging → UAT:** solo quando richiesto dal cliente per test separati (quando esiste)
- **UAT/Staging → Master:** deploy in produzione dopo approvazione

### 3. Naming convention

- Feature: `feat/nuova-feature`
- Refactor: `refactor/nome-refactoring`
- Hotfix: `hotfix/fix-urgente`

### 4. Protezione dei branch

- I branch `develop`/`staging`/`uat`/`master` sono tutti protetti
- Nessun push diretto sui branch protetti

### 5. Gestione degli ambienti

**Development:**
- Primo punto di integrazione per tutte le feature
- Tutte le MR dai feature branch arrivano qui
- Review obbligatoria: un senior + 1 altro sviluppatore

**Staging:**
- Ambiente per test interni del team di sviluppo
- Qui facciamo le nostre prove e verifiche
- Deploy automatico dopo merge da development

**UAT (User Acceptance Testing):**
- Ambiente separato per test del cliente
- Permette al cliente di testare senza interferenze dei nostri test
- Deploy automatico dopo merge da staging

**Master:**
- Ambiente di produzione
- Deploy automatico in produzione dopo merge
- Solo codice completamente testato e approvato

## Commit Messages (Conventional Commits)

Seguiamo la specifica [Conventional Commits](https://www.conventionalcommits.org/) per standardizzare i messaggi di commit e facilitare la generazione automatica di changelog e il versionamento semantico.

### Formato base

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types consentiti e impatto sul versionamento

| Tipo di commit | Incremento versione | Descrizione |
|----------------|---------------------|-------------|
| `feat`/`feature` | minor (Y) | Nuove funzionalità |
| `fix` | patch (Z) | Correzione di un bug |
| `docs` | patch (Z) | Solo modifiche alla documentazione |
| `style` | patch (Z) | Modifiche che non alterano il codice (formattazione, spazi) |
| `refactor` | patch (Z) | Refactoring del codice senza modifiche funzionali |
| `perf` | patch (Z) | Miglioramenti di performance |
| `test` | patch (Z) | Aggiunta o correzione di test |
| `build` | patch (Z) | Modifiche al sistema di build o dipendenze esterne |
| `ci` | patch (Z) | Modifiche ai file di configurazione CI/CD |
| `chore` | patch (Z) | Altri cambiamenti che non modificano src o test |
| `revert` | patch (Z) | Ripristino di un commit precedente |
| `improvement`/`impr` | patch (Z) | Miglioramenti a funzionalità esistenti |

> **Nota:** qualsiasi commit con `BREAKING CHANGE:` nel corpo o con `!` dopo il tipo (es. `feat!:`) incrementa la versione **major (X)**.

### Versionamento semantico (X.Y.Z)

Seguiamo il versionamento semantico dove:

- **X (major):** cambiamenti incompatibili con le versioni precedenti
- **Y (minor):** nuove funzionalità compatibili con versioni precedenti
- **Z (patch):** correzioni di bug e miglioramenti compatibili

Il versionamento viene gestito automaticamente dalla CI/CD in base al tipo di commit:

- Commit di tipo `feat` incrementano la versione minor (Y)
- Commit di tipo `fix`, `refactor`, `perf`, `improvement` incrementano la versione patch (Z)
- Commit con `BREAKING CHANGE` o `!` incrementano la versione major (X)

### Scopes

Lo scope è opzionale ma **fortemente consigliato**: indicalo sempre quando la modifica riguarda un modulo preciso. Definisce la parte del progetto interessata dalla modifica, es. `feat(bacheca): aggiungi i commenti ai post`.

**Scope di questo repository:** `api`, `web`, `mobile`, `api-client`, `app-core`, `contracts`, `i18n`, oppure il nome del modulo di dominio toccato (`accesso`, `profilo`, `bacheca`, ...).

**Definizione degli scope:** lo scope sarà definito nelle card Kanban ed esso rappresenta il modulo, componente o area funzionale del progetto. Deve essere conciso e descrittivo (una sola parola, in minuscolo).

**Esempi di scope:**
- Componenti UI (`ui`, `button`, `modal` ecc.)
- Aree funzionali (`auth`, `cart`, `search`)
- Livelli tecnici (`api`, `store`, `utils`)

**Processo di utilizzo:**
1. Lo scope viene definito nella card Kanban
2. Gli sviluppatori utilizzano lo scope indicato nella card
3. Per commit che toccano più aree, usare lo scope principale o ometterlo

> **Nota:** mantenere coerenza negli scope è fondamentale per facilitare la generazione di changelog e la tracciabilità delle modifiche.

### Description

- Deve essere concisa (max 72 caratteri)
- Scritta **in italiano**, coerente con il linguaggio ubiquo del progetto
- All'imperativo presente: "aggiungi" non "aggiunto" o "aggiunge"
- Prima lettera non maiuscola
- Nessun punto finale

### Body (opzionale)

- Separato dalla description da una linea vuota
- Spiega la motivazione del cambiamento
- Può essere su più righe
- Può includere dettagli tecnici

### Footer (opzionale)

- Per riferimenti a issue tracker: `Fixes #123, #456`
- Per breaking changes: `BREAKING CHANGE: <description>`
- **Non aggiungere** trailer di co-autoria generati da strumenti (es. `Co-Authored-By: Claude ...`) né altri riferimenti agli strumenti usati per scrivere il codice

### Esempi completi

```
feat(bacheca): aggiungi i commenti ai post

Permette di commentare i post della bacheca, con paginazione
e cancellazione da parte dell'autore.

Refs: #123
```

```
fix(profilo): correggi il salvataggio delle impostazioni di privacy

I valori di visibilità venivano sovrascritti con il default
a ogni aggiornamento del profilo.

Fixes #456
```

```
refactor(api): semplifica la gestione degli errori

BREAKING CHANGE: il formato della risposta di errore è cambiato.
Formato precedente: { error: { message: string } }
Nuovo formato: { message: string, code: number }
```

## Integrazione con card Kanban

Per collegare i commit alle card Kanban:

1. **Nelle card definire:**
   - Il tipo di attività (feat, fix, ecc.)
   - Gli scope principali coinvolti
   - ID della card nel titolo
2. **Nel primo commit della feature:**
   - Usare il tipo e lo scope indicati nella card
   - Includere l'ID della card nel footer: `Refs: #CARD-ID`
3. **Nei commit successivi:**
   - Mantenere coerenza con il tipo principale
   - Specificare sotto-scope se necessario
   - Continuare a riferirsi alla card

## Hotfix process

Per correzioni urgenti in produzione:

1. Creare hotfix branch da master:

   ```bash
   git checkout master
   git pull origin master
   git checkout -b hotfix/fix-urgente
   ```

2. Implementare la correzione nel branch hotfix
3. Creare MR dal branch hotfix verso `master` (con review accelerata ma comunque obbligatoria) **senza cancellare il branch di origine**
4. Dopo approvazione, mergiare la MR su `master`
5. Backport della correzione verso `development`/`staging`/`uat` (sempre tramite MR, mai push diretti)
