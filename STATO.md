# Stato di Prome v2 — 15 agosto 2026

Documento di passaggio di consegne. Racconta **cosa funziona davvero**, cosa no, e quali decisioni sono già state prese, così chi riprende non deve ricostruirlo dal codice.

Le regole vincolanti stanno altrove e vanno lette: [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) per il backend, [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) per il web, [`COMMIT_CONVENTION.md`](COMMIT_CONVENTION.md) per i commit, [`deploy/README.md`](deploy/README.md) per l'esercizio. I documenti in [`documentation/`](documentation/) sono l'analisi originale (discovery, dominio, architettura, piano, stima) e **non si modificano a mano**.

---

## In una riga

Prome è in esercizio su prome.app. Una persona può ricevere un codice via email, entrare, compilare il profilo, pubblicare un post con allegato e commentare, e — dal 15 agosto — creare un'aula di studio, invitarci qualcuno, condividerci materiali e scriverci in tempo reale. Le stesse aule, con la chat, funzionano anche sul telefono. Sempre il 15 agosto sono arrivate le **impostazioni di privacy** (prima nascevano chiuse e non c'era modo di cambiarle, quindi la bacheca era di fatto a un utente solo) e i **gruppi**, con l'appartenenza che apre le aule collocate. Restano fuori audio e notifiche.

Il giro completo è stato **provato in produzione il 15 agosto**, non dedotto: codice ricevuto via email, accesso, onboarding, allegato caricato e riscaricato identico all'originale.

---

## Dove gira

Una macchina Hetzner a Norimberga (regione UE, come chiede il work package): Ubuntu 24.04, 2 core, 3,7 GB di RAM, 38 GB di disco, IP `46.224.215.1`. Si entra come utente `deploy`; root è disabilitato di proposito.

```
ssh prome-prod
```

Cinque contenitori, una rete interna, **una sola cosa esposta**:

| servizio | ruolo |
| --- | --- |
| `caddy` | termina TLS, instrada i domini, unico servizio con porte pubbliche |
| `web` | Next.js in modalità standalone |
| `api` | facciata REST, `APP_ROLE=app` |
| `worker` | meccanismi ricorrenti, `APP_ROLE=worker`, **stessa immagine**, nessun listener HTTP |
| `postgres` | database, volume persistente |

Le due unità dell'API escono dalla stessa build e si distinguono solo per configurazione d'avvio: due immagini potrebbero divergere senza che nessuno se ne accorga.

**Domini** — DNS su Cloudflare, tutti con la nuvoletta **grigia**: con il proxy arancione Caddy non riuscirebbe a farsi validare da Let's Encrypt.

- `prome.app` → il sito, certificato Let's Encrypt
- `www.prome.app` → 308 verso l'apex (il sito dichiara `https://prome.app` come canonico)
- `api.prome.app` → l'API, certificato proprio

**Email** — Brevo, relay SMTP su `smtp-relay.brevo.com:587`. L'IP della macchina è nella lista degli indirizzi autorizzati di Brevo: **senza, l'autenticazione fallisce con `525 Unauthorized IP address`**. Dominio autenticato: SPF (uno solo, con l'`include` di Brevo), DKIM (`brevo1`/`brevo2`), DMARC in sola osservazione.

**Backup** — `prome-backup.timer`, ogni notte, quattordici copie in `/home/deploy/backup`, fuori dai volumi di Docker. `./backup.sh --verifica` **ripristina davvero** su un database usa e getta e conta le tabelle: un ripristino non provato è una speranza, non un piano.

---

## Come si rilascia

**Si pubblica facendo `push` su `main`.** Il resto è automatico e sta in [`.github/workflows/rilascio.yml`](.github/workflows/rilascio.yml):

1. **Verifica** — database vero come servizio, migrazioni, `pnpm -r build`, typecheck, lint, 236 test dell'API.
2. **Immagini** — costruite in CI (non sulla macchina, che ha due core e serve traffico) e pubblicate su `ghcr.io` etichettate con lo sha del commit.
3. **Rilascio** — rsync della configurazione (`--delete`, così la macchina corrisponde al commit), poi [`deploy/rilascia.sh`](deploy/rilascia.sh) via SSH.

Lo script tira giù le immagini, applica le **migrazioni prima** del codice nuovo, avvia, ricarica Caddy a caldo, e alla fine **confronta l'immagine in esecuzione con quella attesa**. Quel controllo non è cerimonia: il primo rilascio automatico finì in verde senza aver sostituito niente, ed è l'unico modo per accorgersene.

Un rilascio alla volta (`concurrency`), quindi i push ravvicinati si mettono in fila.

---

## Cosa funziona davvero

### E0 — online e utilizzabile da capo a fondo ✅

- **E0.1** Scheletro API e schema dati. Postgres con sei schemi (`accesso`, `profilo`, `bacheca`, `gruppo`, `aula_studio`, `cancellazione`), foreign key **solo dentro** lo schema, riferimenti fra contesti come identificatori nudi. Undici migrazioni versionate. Due unità di esecuzione dalla stessa immagine.
- **E0.2** Accesso con email e codice. **Un solo modo di entrare**: niente password, niente social, nessuna registrazione separata — chi verifica un codice per la prima volta ottiene account e profilo.
- **E0.3** Shell web: home, chi siamo, guide, atenei, argomenti, privacy, accesso, feed.
- **E0.4** Onboarding del profilo (nome, cognome, università, corso) con `ImpostazioniDiPrivacy` create nella stessa scrittura e **default restrittivo** (`PRIVATO` su entrambe le voci).
- **E0.5** Post con allegato. Tre tempi: pre-autorizzazione (verifica tipo e dimensione *prima*, prenota la chiave), `PUT` su URL firmato con scadenza, poi creazione del post che cita le chiavi. **I byte non attraversano gli endpoint di dominio.**
- **E0.6** Composer con allegato e lista dei post, ordinamento cronologico.
- **E0.7** Messa in esercizio, con giro completo verificato dal vero.

### E1.6 — strumentazione ✅

Cinque eventi dichiarati in un elenco **chiuso**: `codice_richiesto`, `accesso_effettuato`, `onboarding_completato`, `post_pubblicato`, `allegato_caricato`. Le proprietà ammesse sono un tipo, non una convenzione. **Nessun dato personale**: l'unico riferimento a una persona è `utenteId`.

La porta `MisurazioniDiUtilizzo` è **senza fornitore assegnato**, e resta così finché non è dimostrabile la conformità su regione e trattamento. Esistono i punti di emissione, provati da `test/misurazioni.spec.ts`. Attaccarci un prodotto sarà un adattatore, non una riscrittura.

### E2 — post completi e commenti ✅

- Modifica ed eliminazione con permessi dell'autore verificati **nel modulo**, mai nella facciata. Post inesistente → 404, post altrui → 403: due situazioni diverse per chi le riceve.
- Eliminazione del post: allegati nella stessa transazione, file dall'archivio subito dopo (fuori dalla transazione), commenti **in differita** dall'unità lavoratrice.
- Commenti piatti con moderazione dell'autore del post.
- Feed paginato, dettaglio del post, viewer degli allegati.
- I permessi li **dichiara il server** (`puoModificare`, `puoEliminare`): non farli dedurre al client, sarebbero due copie della stessa regola e quella del client è aggirabile.

### E6.1 — le impostazioni di privacy si cambiano ✅

`PUT /profilo/me/privacy` aggiorna **i soli assi indicati**, ed è ciò che rende vero IP2 senza doverselo ricordare: l'asse omesso resta al valore che aveva, e non esiste lo stato «non impostato». Una richiesta che non cambia niente risponde `PR009`. Non emette eventi né misurazioni: la decisione si interroga alla lettura, quindi vale subito, senza finestra. Diciassette casi in `test/privacy.spec.ts`, scritti prima del codice, verificano separatamente che un post sparisca **dal feed e dal link diretto** — sparire da uno solo è il modo tipico in cui quest'area si rompe.

### E7 — i gruppi, e l'appartenenza che apre le aule ✅

Un gruppo è un **contenitore di utenti con appartenenza e visibilità**: nessun feed, nessuna chat, nessuna notifica propria. Si crea, si amministra, si lascia; si entra **per invito**, con la stessa scadenza a sette giorni dell'aula, e il membro nasce **dopo** l'accettazione (`202`, IG3).

- **La dipendenza fra i contesti va in un verso solo**: Aula studio importa Gruppo, mai il contrario. Attraversa il confine un booleano, quindi **essere moderatore del gruppo non concede nulla dentro un'aula collocata** (AS6) — il core non ha modo di saperlo.
- **La decadenza dell'appartenenza raggiunge chi è già dentro** (SE1): il fatto viaggia sulla corsia rapida, il titolo di ammissione si ri-risolve su dato fresco, e si rimuove **solo chi resta senza** — chi era entrato con un invito proprio non si tocca. Chi è connesso viene tolto anche dalla stanza del socket, perché una connessione aperta non fa nuove richieste.
- **Eliminare un gruppo non elimina alcuna aula**: le collocate tornano sciolte, in differita.
- Ventinove casi in `test/gruppo.spec.ts`, scritti prima del codice.

`gruppo` è ora fra i `DETENTORI_CENSITI` della cancellazione, con la sua colonna nel registro: chi cancella l'account esce da tutti i gruppi, e dove lascerebbe uno spazio senza moderatori il ruolo passa al membro più anziano.

### Mobile (Expo) — parziale

Esistono e funzionano: accesso, inserimento del codice, completamento del profilo, bacheca, composer, dettaglio del post con commenti, **aule studio con materiali, permessi e chat in tempo reale**, impostazioni con privacy e uscita. Rientrando dal background il socket si riapre e la cronologia si rilegge.

**Tre superfici finte sono state rimosse** invece di essere lasciate lì: la scheda gruppi con la sua schermata di dettaglio (sono E12), la schermata di richiesta notifiche — irraggiungibile, e il suo bottone «attiva» non chiedeva alcun permesso — e gli interruttori delle notifiche nelle impostazioni. Resta finto per intero **il tab profilo** (`(tabs)/profilo.tsx`): nome, statistiche e post inventati, e serve un endpoint che non esiste per i conteggi per autore.

**Il lint del mobile non era mai stato configurato**: `expo lint` genera la propria configurazione al primo avvio, e finché nessuno l'ha eseguito il codice nativo è cresciuto senza controllo. Ora la configurazione è committata, la CI la esegue, e i sette errori che aveva fatto emergere in `providers/avvisi-provider.tsx` sono corretti — erano difetti veri: il conto alla rovescia dell'avviso ripartiva a ogni disegno del padre, e un messaggio in uscita poteva spegnere quello appena arrivato.

---

## Cosa non c'è ancora

**E1.1–E1.5 sono superate da una decisione di prodotto.** Il piano prevedeva accesso Google, Apple ed email con password: è stato deciso l'**accesso unificato email + OTP e basta**. Quei tre work package non vanno realizzati così come sono scritti. Restano validi E1.4 (stati di errore) ed E1.5 (homepage e pagine informative complete), in parte già coperti.

**E3 ed E4 sono fatti (15 agosto 2026): l'aula di studio esiste, ci si entra e ci si scrive.** Aule con visibilità e data opzionale (nessuno stato di ciclo di vita: la data non apre né chiude nulla), ruoli e i tre permessi concessi **uno per uno** con la sola lettura come stato legittimo, l'ultimo moderatore che non si rimuove né si retrocede nemmeno con due gesti concorrenti, inviti via email con scadenza a 7 giorni, materiali con argomenti — e eliminare un argomento **non cancella alcun file**, i materiali tornano sciolti. La chat è in tempo reale con Socket.IO, ma **i messaggi sono persistiti prima e pubblicati dopo**: col trasporto spento la conversazione resta scritta e leggibile.

Con E3 è nato anche il **primo canale dei fatti in uscita** (outbox): una tabella per schema scritta nella stessa transazione dell'aggregato, consegna at-least-once con deduplica sull'id dell'evento, corsia rapida a 1 secondo nel worker, purga a 7 giorni. Oggi trasporta un fatto solo — l'accettazione dell'invito, che risponde 202 perché il partecipante non nasce nella stessa transazione.

**M5 è fatta con E3 ed E4: le aule sono anche sul telefono** (elenco, sala, materiali, permessi, chat con rientro da background).

**I gruppi esistono (15 agosto 2026).** Lo schema `gruppo` era stato creato vuoto e il service non aveva un metodo. Ora un gruppo si crea, si amministra e si lascia, e **chi ne fa parte entra nelle aule collocate lì dentro senza un invito ogni volta** — che è la sola ragione per cui i gruppi esistono. G3 è la chiave primaria di Membro, quindi la doppia aggiunta è un'operazione senza effetto invece di un errore; G2 è protetta dal blocco ottimistico, e due moderatori che si retrocedono a vicenda non lasciano il gruppo ingovernabile; G5 congela l'ateneo alla creazione.

Il punto difficile è **la decadenza dell'appartenenza**: chi perde l'appartenenza mentre è dentro un'aula collocata non farà alcuna nuova richiesta, quindi l'informazione gli va incontro sulla corsia rapida. Il titolo di ammissione si ri-risolve su dato fresco e si rimuove **solo chi resta senza** — chi era entrato con un invito proprio non si tocca — e chi è connesso viene tolto anche dalla stanza del socket. Eliminare un gruppo non elimina alcuna aula: le collocate tornano sciolte, in differita.

Fuori perimetro, dichiarato: **l'albero delle cartelle** (le schermate finte lo mostravano, ed è stato tolto insieme ai dati inventati), la chat di gruppo e i post riservati al gruppo, che sono E6.3. Le schermate native dei gruppi sono E12: sul telefono la scheda è stata **rimossa** invece di lasciarla mentire.

Il prossimo passo della fila è la porta a timebox sull'audio (S-audio → E5), che può anche chiudersi con un no: in quel caso l'aula resta testuale, ed è già consegnabile così. **Nessuno dei suoi quattro criteri è codice** — tre reti diverse, telefono, costo del nodo, riavvio non presidiato — quindi va attraversata dal vivo.

**La cancellazione dell'account è implementata (15 agosto 2026).** `POST /account/cancellazione` apre una **grazia di 14 giorni**: sessioni revocate subito, profilo nascosto subito (flag su Profilo, impostazioni intatte), e un nuovo accesso OTP entro la grazia annulla la richiesta; oltre, l'accesso risponde 403. La catena esegue nell'unità lavoratrice — post e commenti **anonimizzati** con id `anonimo-<uuid>` **diverso per record** (nessuna mappa), allegati dei post conservati, profilo e account eliminati — e la **verifica del residuo** (0 record, 0 file su tutti i detentori censiti) finisce nel registro dello schema `cancellazione`, che sopravvive al completamento: dopo un ripristino da backup la ri-applicazione è automatica (ri-verifica oraria + giro d'avvio del worker). Allerta nei log oltre il 25° giorno senza esito totale. Le schermate web e mobile sono collegate (conferma con parola digitata, «Utente rimosso» sui contenuti anonimi, messaggio di riattivazione al rientro); il bottone «Disattiva temporaneamente», mai definito da nessun documento, è stato rimosso. Le regole nuove (percorso privilegiato R12, detentori censiti, prefisso errori `CA`) sono in `apps/api/CLAUDE.md`; i test in `apps/api/test/cancellazione.spec.ts` (37 casi, scritti prima del codice).

**Le impostazioni di privacy si cambiano (15 agosto 2026).** Nascono al valore più chiuso e fino a quel giorno non esisteva alcun endpoint per toccarle: chi si iscriveva vedeva solo i propri post, per sempre, e la bacheca in esercizio da agosto era di fatto a un utente solo. Nessun test se ne era accorto, perché i test aprono un profilo scrivendo diritti nel database — saltando la strada che agli utenti mancava. Ora c'è `PUT /profilo/me/privacy`, che aggiorna i soli assi indicati e non emette alcun evento: la decisione si rilegge, e per questo vale subito. **La contattabilità resta salvata ma non applicata da nessuna regola**, e i client non la mostrano: gli inviti viaggiano per indirizzo email, che può non avere un account, e verificarla lì direbbe a chi invita se quella persona è iscritta a Prome.

---

## Decisioni già prese, da non rimettere in discussione

1. **Accesso unificato: email + codice OTP.** Niente password, niente social. Non esiste una pagina di registrazione: `/app/accedi` serve sia chi torna sia chi arriva la prima volta.
2. **Il sito pubblico non contiene nessun contenuto degli utenti.** «Aula pubblica» significa aperta agli iscritti a Prome, **non al web**. Niente directory di aule, niente pagine di post, profili o gruppi. La tabella di cosa può e non può stare sul sito è in `apps/web/CLAUDE.md`.
3. **Il sito è servito dalla macchina, non da Vercel.** Un solo sistema di build. La versione su Vercel aveva `localhost:3600` come indirizzo dell'API: si vedeva, ma nessuna chiamata sarebbe arrivata da nessuna parte.
4. **Better Auth è usato come libreria, non come router.** Le sue rotte HTTP **non sono montate**: i controller lo chiamano come funzioni, così l'envelope e il formato d'errore restano quelli del contratto.
5. **I pacchetti condivisi consumati da web e mobile esportano i sorgenti TypeScript**, non `dist`. Un pacchetto compilato in CommonJS che importa `@tanstack/react-query` ne ottiene una copia diversa da quella dell'app: due istanze, due contesti React, e un `QueryClientProvider` corretto che produce comunque «No QueryClient set».
6. **La visibilità si risolve alla lettura**, interrogando le impostazioni dell'autore. Il Post **non ha** un attributo di visibilità: cambiare le proprie impostazioni ha effetto immediato su ciò che si è già pubblicato.

---

## Le invarianti, e dove vivono

Non stanno nei DTO. La validazione dell'ingresso protegge dalla richiesta malformata, il costruttore protegge l'aggregato: sono due cose diverse.

- **B1** testo non vuoto, ≤ 5.000 caratteri · **B3** file completo, tipo ∈ {PDF, immagine, testo}, 0 < dimensione ≤ 25 MB · **B4** post e allegati nella stessa transazione · **B5** il Post non ha visibilità propria · **B6** senza prova di onboarding non c'è Post.
- **B6 è codificato nel tipo**: `ProvaOnboardingCompletato` ha un simbolo non esportato, quindi nessun altro file può fabbricarla — si può solo riceverla da `ProfiloService`. Non scrivere una prova finta per riusare il costruttore.
- **C3** il Commento non ha foreign key verso il post: riferisce il `postId` per identità, l'esistenza si verifica al comando e la finestra la chiude l'unità lavoratrice.

---

## Difetti trovati in esercizio, e cosa hanno insegnato

Vale la pena conoscerli, perché sono tutti della stessa famiglia: cose che in sviluppo non si vedono.

- **La build funzionava solo dove era già stata fatta.** I pacchetti che espongono `dist` non venivano costruiti prima di chi li usava: su un checkout pulito, dieci «module not found». Ora ogni app costruisce da sé le proprie dipendenze.
- **Il rilascio è finito in verde senza rilasciare niente.** `docker compose run` legge lo stdin, e con lo script passato via heredoc si è mangiato le righe successive. Da qui la verifica finale dello script.
- **Il primo caricamento in produzione è finito in 500.** `EACCES` sull'archivio: un volume Docker vuoto eredita i permessi dalla cartella che trova nell'immagine, e lì non c'era — è nato di root, e il processo non ci poteva scrivere. In sviluppo l'archivio è una cartella del progetto e appartiene a chi lancia il processo, quindi il difetto era invisibile.
- **Il worker girava in ciclo di riavvio** perché mandava email senza avere i18n registrato.
- **`backup.sh` sorgeva `.env`**, dove `SMTP_MITTENTE=Prome <accesso@prome.app>` è una redirezione della shell. Un file di segreti si legge, non si esegue.

---

## Aperto, in ordine di importanza

1. **M4 non è chiusa finché non è provata dal vivo.** Il codice c'è (E3+E4), ma l'accettazione dell'epica chiede atti che nessun test sostituisce: il giro completo **con due persone reali e invito via email vero**, da un dispositivo diverso da quello di sviluppo; le misure di soglia da registrare (apertura della sala, ingresso dopo l'accettazione, comparsa del messaggio agli altri); la degradazione osservata **spegnendo davvero** archivio, canale email e trasporto; e — poiché lo schema è cambiato — il **ripristino del database riprovato**.
2. **Il giro dei gruppi va provato a due account** (E7), e comprende la misura che l'epica chiede di registrare: A crea un gruppo e vi colloca un'aula, B accetta l'invito arrivato per email vera ed **entra senza invito all'aula**, poi A rimuove B mentre B è dentro la sala — B deve essere allontanato **entro pochi secondi** e non rientrare. Va verificato dal vivo anche AS6: B moderatore del gruppo entra nell'aula collocata **in sola lettura**.
3. **«Scarica i tuoi dati»** è promesso dalla privacy policy e non esiste. La frase sull'informativa che mancava per M1 (il materiale d'aula sopravvive alla cancellazione) è stata invece aggiunta.
4. **La porta S-audio non è attraversabile da qui**: i suoi quattro criteri di uscita — tre o quattro persone che si sentono da reti diverse, funzionamento da telefono, costo del nodo dentro il budget, riavvio non presidiato — si verificano solo con un nodo LiveKit vero. Il timebox è di 2,5 giorni e allo scadere un esito non nettamente positivo **vale come negativo**: l'audio esce dal perimetro e l'aula resta testuale, che è già consegnabile.
5. **L'`MX` di `prome.app` punta alla macchina**, che non ha un server di posta: chi risponde all'email di accesso scrive nel vuoto. Mandare i codici funziona lo stesso.
6. **SSH è aperto al mondo** e prende migliaia di tentativi al giorno. Restringerlo nel pannello Hetzner è più solido di fail2ban, perché blocca prima che sshd veda il pacchetto.
7. **L'archivio dei file è locale**, su un volume della macchina. Quando arriverà un fornitore con regione UE dichiarata, sarà un adattatore: `ArchivioLocale` usa già lo stesso flusso firmato di un fornitore vero.
8. **Il profilo dell'account di prova ha dati inventati** («Andrea Trica», Politecnico di Milano): li ho messi io per provare il giro, vanno corretti.
9. **Il progetto Vercel è ancora attivo** e va dismesso.
10. **Residui DNS del vecchio hosting**: `ftp`, `mail`, `_cpanel-dcv-test-record`, `_acme-challenge`.

---

## Come si lavora

```bash
pnpm db:up                              # Postgres locale, porta 6400
pnpm --filter @prome/api exec prisma migrate deploy
pnpm dev:api                            # API
pnpm dev:web                            # sito, porta 3500
pnpm --filter @prome/api test           # 236 test, serve il database
pnpm api:client                         # rigenera il client dopo OGNI modifica agli endpoint
```

- **Commit**: Conventional Commits in italiano con scope, per esempio `feat(bacheca): …`. **Mai** il trailer `Co-Authored-By`.
- **Errori**: sempre e solo `AppException`, con codice per contesto (Profilo `PR`, Bacheca `BA`, Gruppo `GR`, Aula studio `AS`). Chiave del messaggio tipizzata: una chiave inesistente non compila.
- **Traduzioni**: tutto tradotto lato server, la lingua viaggia in ogni richiesta. Una chiave presente in una sola lingua non compila.
- **Aree a difetti invisibili** (accesso, caricamenti, permessi, cancellazione account): test automatici obbligatori, scritti prima del codice.
- **Colori**: usare i ruoli (`bg-superficie`, `text-testo-corpo`), non le rampe. Tailwind non segnala una classe inventata: la ignora, e il colore sparisce senza errori. Una schermata nuova va guardata in tutti e due i temi prima di dirla finita.
