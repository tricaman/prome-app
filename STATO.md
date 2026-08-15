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

1. **Verifica** — database vero come servizio, migrazioni, `pnpm -r build`, typecheck, lint, 252 test dell'API.
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

### Il profilo si corregge, e niente a schermo è più inventato ✅

**«Modifica profilo» esiste (15 agosto 2026).** P3 dice da sempre che i quattro dati «restano modificabili ma mai svuotabili — un cognome sbagliato si corregge», e `PUT /profilo/me` lo faceva già: mancava la schermata, su entrambi i client. Non era un dettaglio anagrafico — **l'università decide chi vede i tuoi contenuti** e a quali aule sei ammesso, quindi un errore di battitura nell'onboarding restava per sempre e cambiava in silenzio il tuo pubblico. Quattro casi nuovi provano la metà «modificabili» di P3, che nessun test copriva: la correzione non riporta indietro l'onboarding, un campo svuotato è rifiutato, cambiare ateneo cambia **subito** ciò che si vede (SE2) e **non** tocca l'ateneo congelato di aule e gruppi già creati né fa uscire da dove si è già dentro.

**Nella stessa giornata sono spariti gli ultimi dati inventati.** Erano tutti sulle due schermate più usate: i quattro filtri del feed che cambiavano solo colore (non sono in nessun work package — «filtro» non compare in tutto il piano, e «i miei gruppi» avrebbe richiesto un arco Bacheca → Gruppo che la Context Map vieta); «Salva», «Condividi» e «···» su post veri, senza gestore; il conteggio dei commenti sempre `0`, scritto a mano nel client; il riquadro «Appello di Analisi 2 fra 9 giorni · 3 aule studio» con i numeri nel JSX; e il tab profilo del telefono, finto per intero — identità inventata, contatori `86/23/41` costanti e, come «i tuoi contenuti», **il post di un'altra persona**.

Il modulo dei dati dimostrativi dell'area privata (`packages/contenuti/src/sessione.ts`) **non contiene più dati**: resta il solo tipo della scheda del post. Nessuna schermata può più importare per sbaglio una persona che non esiste.

### Gli spazi si governano ✅

Controllando **quali comandi dell'API avessero un modo per essere raggiunti**, sei non ne avevano nessuno: modificare un'aula, eliminarla, entrarci, retrocedere un moderatore, eliminare un materiale, e modificare un gruppo. Esistevano da agosto, erano provati dai test, e non avevano un bottone. Le conseguenze non erano teoriche: **la visibilità di un'aula si decideva una volta per sempre**, un'aula aperta per sbaglio restava lì, e **chi entrava in un'aula pubblica non ne usciva più**.

Ora la sala ha una scheda «Impostazioni» — titolo, visibilità, data, collocazione in un gruppo, eliminazione per chi modera; **uscita per chiunque**, che è la sola di queste che riguardi ogni partecipante. Il gruppo si rinomina e cambia visibilità. Un materiale si elimina, da chi l'ha portato o da chi modera. La retrocessione da moderatore c'è su entrambi i lati.

**Le aule di un gruppo si trovano**: `GET /aule-studio?gruppoId=…` risponde con quelle collocate lì che chi chiede può vedere, comprese le private se ne è membro. Senza, la collocazione introdotta con E7 non sarebbe servita a niente — la pagina del gruppo mostrava solo le aule in cui si era già dentro, e non c'era modo di entrare nelle altre.

**Un difetto silenzioso corretto nel dominio**: l'ateneo dello spazio si salvava solo se la visibilità nasceva `ATENEO`, quindi un'aula nata privata che fosse stata aperta all'ateneo sarebbe diventata visibile **a nessuno**. Ora si salva sempre alla creazione, che è ciò che AS7 e G5 dicono; si consulta solo quando serve, quindi non cambia nulla di ciò che esiste.

### E12.1 — i gruppi in tasca ✅

La scheda «Gruppi» è tornata sul telefono, e questa volta mostra i gruppi di chi guarda. Si crea un gruppo, si invita per email, si amministrano i membri (promuovi, retrocedi, rimuovi), si esce, si cambiano nome e visibilità, si elimina — e si vedono **le aule collocate nel gruppo**, comprese quelle in cui non si è ancora entrati, con il bottone per entrarci.

Nessuna regola è stata ricopiata nel telefono, com'è giusto per una superficie: G2 la fa rispettare il server e il messaggio arriva già tradotto. L'unica cosa che il client fa è **non offrire** ciò che sarebbe rifiutato — i gesti di moderazione a chi non modera, e la visibilità di ateneo a un gruppo nato senza ateneo.

Resta fuori l'atterraggio dell'invito **dentro** l'app: l'email punta a un indirizzo web, e aprirlo nell'app è E12.4 (link universali e app sugli store). Chi riceve l'invito lo accetta dal browser, e da quel momento il gruppo compare nella scheda.

Per strada è stato tolto un plurale ICU (`{numero, plural, …}`) che avevo introdotto sui membri: il `traduci` condiviso fa **solo interpolazione**, quindi sul telefono sarebbe uscita la stringa grezza. Ora sono due chiavi, come già faceva la sala per i partecipanti.

### E8 — gli avvisi, e il fornitore che non c'è ✅ (parte server)

La spina dorsale delle notifiche esiste per intero: un apparecchio si registra e si dimentica, le preferenze si leggono e si cambiano, e i due soli eventi che interrompono qualcuno — **un commento sotto un tuo contenuto, un invito** — producono un avviso. Il commento passa dall'outbox della bacheca, nata oggi sulla stessa corsia rapida delle altre due: chi commenta non aspetta un fornitore di notifiche per vedere il proprio commento.

**Il fornitore non c'è, ed è una posizione dichiarata, non un pezzo mancante.** L'architettura esclude ogni fornitore di push privo di regione UE selezionabile, e quella verifica non è stata fatta: l'adattatore `senza-fornitore` non manda niente e non rompe niente, esattamente come per le misurazioni. Attaccarne uno sarà **un adattatore**, perché tutto ciò che decide se, quando e a chi arriva un avviso vive dall'altra parte della porta ed è finito e provato.

Ciò che i 16 test guardano è la parte che il fornitore non decide: che nell'avviso **non entri alcun dato personale** (titolo e corpo sono chiavi, non frasi: il testo del commento, il nome di chi ha scritto e gli indirizzi restano dentro), che non si venga avvisati di sé stessi, che chi ha spento un asse non riceva niente — con la preferenza letta **nell'istante dell'invio** — e che lo stesso fatto consegnato due volte non produca due avvisi.

Sul web le preferenze hanno di nuovo un pannello, e questa volta salva davvero. **La scheda dichiara il proprio stato in prima riga**: «gli avvisi non vengono ancora recapitati, non c'è un fornitore». È l'opposto degli interruttori tolti a luglio, che si dicevano attivi senza salvare niente — la differenza non è l'infrastruttura, è che qui la parte mancante è scritta a schermo. Sul telefono non c'è nulla da mostrare finché non c'è un modulo nativo che registri un token: è E12.3.

Dispositivi e preferenze sono **detentori censiti** dal primo giorno: cadono con il profilo, la verifica del residuo li conta, e l'esportazione li include — senza il token, che non è un dato della persona ma il modo di raggiungere il suo apparecchio.

### E13.1 ed E13.2 — l'app è pronta per essere costruita ✅ (tutto ciò che non passa dai tuoi account)

La catena di distribuzione esiste: `eas.json` con tre profili (dev client, prova interna con APK
diretto, store con AAB e IPA), identificativo `app.prome` su entrambe le piattaforme, versioni tenute
da EAS invece che committate a mano, `usesNonExemptEncryption` dichiarato una volta per sempre e
`permissions: []`, che è la verità: **l'app non chiede alcun permesso di sistema**.

**Le icone erano ancora quelle del modello di Expo** — la "E" blu — e i percorsi di `app.json`
puntavano a un bundle `.icon` con il marchio di Expo dentro. Ora le sei immagini si **generano dal
marchio** (`pnpm --filter @prome/mobile icone`, che le ricava da `logo-prome.svg`): non sono sei file
da tenere allineati a mano, e le tre decisioni di geometria stanno nello script. Lo splash usa i
colori dei due temi.

**Un difetto vero, trovato preparando la build**: fuori dallo sviluppo `urlApi()` ripiegava su
`http://localhost:3600`. Una build da store non ha un server di sviluppo da cui dedurre l'indirizzo:
si sarebbe installata, aperta, e non avrebbe raggiunto niente. Nessun test poteva vederlo, perché in
sviluppo l'indirizzo c'è sempre.

**`expo-doctor` è passato da 19/21 a 21/21**, e i due controlli che fallivano non erano cosmetici:
due copie di React nel fascio nativo (19.2.3 del mobile contro 19.2.8 tirata dentro dai peer di
`app-core` — hook e contesti che si rompono sembrando difetti del prodotto) e nove pacchetti fuori
dalla matrice dell'SDK, fra cui `expo-localization` con un major di distanza. Ora il monorepo ha
**una sola versione di React**, quella che Expo pretende esatta.

Il materiale per gli store sta in `apps/mobile/STORE.md`: schede in due lingue, e le **dichiarazioni
sui dati** ricavate tabella per tabella dallo schema invece che a memoria — con la regola che una
tabella nuova nel database è una riga nuova là dentro.

**Manca una funzione, e non è materiale da compilare: segnalazione e blocco non esistono.** La linea
guida 1.2 di Apple le pretende da chi ospita contenuti generati dagli utenti, e Prome li ospita:
post, commenti, messaggi, materiali. Non c'è una chiave di traduzione né un endpoint che le riguardi.
Con l'app così, la revisione la rifiuta — ed è il primo punto degli aperti, non una nota a margine.

### Segnalazione e blocco ✅ (15 agosto 2026, sera)

Era il punto 0 degli aperti e l'ultima funzione fra l'app e gli store: la linea guida 1.2 di Apple pretende segnalazione, blocco e regole pubbliche da chi ospita contenuti degli utenti. Ora ci sono, su tutte e tre le superfici, con i test scritti prima del codice (21 casi) perché è un'area a difetti invisibili: un blocco che non filtra non produce sintomi, e una segnalazione che non arriva a nessuno ringrazia lo stesso.

**Il blocco è della bacheca, in entrambe le direzioni.** Chi blocchi sparisce dal tuo feed, dal link diretto e dai commenti — e tu dai suoi — qualunque sia la sua privacy: la sottrazione vive in `autoriVisibiliA`, lo stesso punto della privacy, perché è la stessa domanda col segno opposto. Dentro aule e gruppi condivisi il blocco **non** decide niente (spazi scelti, con uscita e moderazione proprie): confine dichiarato e provato da un test, perché non venga «sistemato» in silenzio. Le notifiche push fra coppie bloccate non partono, lette all'istante dell'invio. L'elenco dei bloccati, con lo sblocco, sta nelle impostazioni di web e telefono.

**La segnalazione è la coda che qualcuno guarda.** «Segnala» su ogni post e commento altrui, motivo da elenco chiuso, e la regola «si segnala ciò che si vede»: la facciata verifica il soggetto attraverso la lettura del modulo proprietario, 404 altrimenti. La riga è la fonte di verità; l'email a `EMAIL_SUPPORTO` — **obbligatoria in produzione, l'avvio si ferma senza** — è il campanello, con un estratto di 300 caratteri che attraversa solo l'email e non si conserva mai. Doppione = una riga, una sola email. Niente pannello admin: l'operatore agisce via database, e le **linee guida della community** (pagina pubblica nuova, `/linee-guida`) promettono una risposta **entro 24 ore** — un impegno operativo, non decorativo.

**Sistemando i commenti è emerso e chiuso un buco di E6.2**: la privacy non era applicata ai commenti, che la schermata impostazioni prometteva da sempre («vale per i post e i commenti che pubblichi»). Ora un commento segue la visibilità del suo autore — un autore PRIVATO ha commenti invisibili a tutti, proprietario del post compreso — e commentare esige di vedere il post: prima chiunque con un id poteva commentare e leggere la discussione di un post che il feed non gli avrebbe mai mostrato.

Blocchi e segnalazioni sono **detentori censiti** dal primo giorno: catena, registro (`segnalazioniEliminateIl`), residuo contato in entrambe le direzioni, esportazione — chi ho bloccato senza nomi, mai chi ha bloccato me. STORE.md §1.1 ora dice dove sta ogni cosa, e la §8 lo dice al revisore.

### Mobile (Expo) — parziale

Esistono e funzionano: accesso, inserimento del codice, completamento del profilo, bacheca, composer, dettaglio del post con commenti, **aule studio con materiali, permessi e chat in tempo reale**, impostazioni con privacy e uscita. Rientrando dal background il socket si riapre e la cronologia si rilegge.

**Le superfici finte sono state rimosse** invece di essere lasciate lì: la scheda gruppi con la sua schermata di dettaglio (sono E12), la schermata di richiesta notifiche — irraggiungibile, e il suo bottone «attiva» non chiedeva alcun permesso — gli interruttori delle notifiche nelle impostazioni, e infine il tab profilo, che ora mostra il profilo vero.

Il feed del telefono ora **carica altre pagine** come quello del web (`useInfiniteQuery` + un bottone «Carica altri»): prima si fermava a venti post, e il ventunesimo semplicemente non esisteva per chi usava il telefono — il feed finiva, e sembrava che non ci fosse altro.

**Il lint del mobile non era mai stato configurato**: `expo lint` genera la propria configurazione al primo avvio, e finché nessuno l'ha eseguito il codice nativo è cresciuto senza controllo. Ora la configurazione è committata, la CI la esegue, e i sette errori che aveva fatto emergere in `providers/avvisi-provider.tsx` sono corretti — erano difetti veri: il conto alla rovescia dell'avviso ripartiva a ogni disegno del padre, e un messaggio in uscita poteva spegnere quello appena arrivato.

---

## Cosa non c'è ancora

**E1.1–E1.5 sono superate da una decisione di prodotto.** Il piano prevedeva accesso Google, Apple ed email con password: è stato deciso l'**accesso unificato email + OTP e basta**. Quei tre work package non vanno realizzati così come sono scritti. Restano validi E1.4 (stati di errore) ed E1.5 (homepage e pagine informative complete), in parte già coperti.

**E3 ed E4 sono fatti (15 agosto 2026): l'aula di studio esiste, ci si entra e ci si scrive.** Aule con visibilità e data opzionale (nessuno stato di ciclo di vita: la data non apre né chiude nulla), ruoli e i tre permessi concessi **uno per uno** con la sola lettura come stato legittimo, l'ultimo moderatore che non si rimuove né si retrocede nemmeno con due gesti concorrenti, inviti via email con scadenza a 7 giorni, materiali con argomenti — e eliminare un argomento **non cancella alcun file**, i materiali tornano sciolti. La chat è in tempo reale con Socket.IO, ma **i messaggi sono persistiti prima e pubblicati dopo**: col trasporto spento la conversazione resta scritta e leggibile.

Con E3 è nato anche il **primo canale dei fatti in uscita** (outbox): una tabella per schema scritta nella stessa transazione dell'aggregato, consegna at-least-once con deduplica sull'id dell'evento, corsia rapida a 1 secondo nel worker, purga a 7 giorni. Oggi trasporta un fatto solo — l'accettazione dell'invito, che risponde 202 perché il partecipante non nasce nella stessa transazione.

**M5 è fatta con E3 ed E4: le aule sono anche sul telefono** (elenco, sala, materiali, permessi, chat con rientro da background).

**E11.1 era però incompleta, e questa riga lo nascondeva.** Il work package dice «lista, creazione, dettaglio, partecipanti»: la **creazione non esisteva** — chi aveva soltanto il telefono poteva entrare in un'aula aperta da altri ma non aprirne una — i **materiali erano in sola lettura**, e dei partecipanti si potevano cambiare i permessi ma non promuovere, retrocedere o rimuovere nessuno. Non si poteva nemmeno invitare. Ora tutto questo c'è, e il caricamento riusa lo stesso `expo-document-picker` e la stessa funzione condivisa del composer dei post: nessun modulo nativo nuovo.

Sul telefono l'aula nasce **estemporanea**: un selettore di data nativo sarebbe un modulo in più e una ricostruzione del dev client per un campo che, per AS8, non apre né chiude nulla. Programmarla resta un gesto del web, e la schermata lo dice. Restano al web anche le impostazioni dell'aula (titolo, visibilità, eliminazione).

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

0. ~~Prima di sottomettere agli store servono segnalazione e blocco~~ — **fatto (15 agosto 2026, sera)**: vedi la sezione «Segnalazione e blocco». Resta tuo: mettere un indirizzo vero in `EMAIL_SUPPORTO` al prossimo rilascio (l'avvio in produzione si ferma senza), e ricordare che la casella va letta — le linee guida promettono 24 ore.

1. **Un difetto trovato oggi, e corretto: la pagina di atterraggio dell'invito a un'aula non esisteva.** L'email di invito la nomina dal giorno in cui gli inviti sono in esercizio — punta a `/app/inviti/<id>` — e chi apriva quel collegamento trovava «Pagina non trovata». Il server faceva la sua parte da sempre: mancava soltanto la schermata. **Nessun test dell'API poteva vederlo**, perché non era l'API a essere rotta, ed è esattamente ciò che il giro dal vivo del punto 2 avrebbe scoperto al primo tentativo.

2. **M4 non è chiusa finché non è provata dal vivo.** Il codice c'è (E3+E4), ma l'accettazione dell'epica chiede atti che nessun test sostituisce: il giro completo **con due persone reali e invito via email vero**, da un dispositivo diverso da quello di sviluppo; le misure di soglia da registrare (apertura della sala, ingresso dopo l'accettazione, comparsa del messaggio agli altri); la degradazione osservata **spegnendo davvero** archivio, canale email e trasporto; e — poiché lo schema è cambiato — il **ripristino del database riprovato**.
3. **Il giro dei gruppi va provato a due account** (E7), e comprende la misura che l'epica chiede di registrare: A crea un gruppo e vi colloca un'aula, B accetta l'invito arrivato per email vera ed **entra senza invito all'aula**, poi A rimuove B mentre B è dentro la sala — B deve essere allontanato **entro pochi secondi** e non rientrare. Va verificato dal vivo anche AS6: B moderatore del gruppo entra nell'aula collocata **in sola lettura**.
4. **«Scarica i tuoi dati» esiste (15 agosto 2026), ma solo sul web.** `GET /account/dati` produce la copia completa che la privacy policy promette per nome, composta dalla facciata interrogando gli stessi detentori che la cancellazione deve svuotare — i due elenchi vanno aggiornati insieme, altrimenti la copia si dichiara completa senza esserlo. Sul telefono manca: salvare un file richiede `expo-file-system` e `expo-sharing`, che sono moduli nativi non installati e comportano una ricostruzione del dev client. Da fare quando si toccherà il pacchetto nativo.
5. **La suite dell'API è a volte rossa su una macchina carica.** Tre fallimenti in una ventina di giri, sempre con altro in esecuzione in parallelo, e serie lunghe di giri verdi quando gira da sola — oggi cinque di fila dopo l'arrivo dei 16 test delle notifiche (268 casi). Oggi **due casi sono stati catturati**, e sono due cose diverse:

   - *«i commenti di un post eliminato spariscono al giro dell'unità lavoratrice»* (E2) — **capito e corretto**: la pulizia guarda un **lotto** di post per volta, e con altre suite in esecuzione sullo stesso database il lotto può essere pieno di post altrui. In esercizio è indifferente (il giro dopo li prende), ma il test pretendeva *un* giro solo: ora ne fa fino a cinque e si ferma appena il conto è a zero. È lo stesso difetto di isolamento che ho evitato scrivendo i test delle notifiche.
   - *«rifiuta un codice scaduto con PR004»* (E0.2) — **localizzato, non spiegato**: risponde PR003 «codice non valido» invece di PR004 «scaduto». L'ipotesi è che il fornitore di identità spazzi via le righe di verifica scadute quando un'altra richiesta qualunque passa di lì, e che il codice sparisca fra la riga che ne sposta indietro la scadenza e la verifica — con la riga sparita, «scaduto» diventa indistinguibile da «inesistente». È un'ipotesi, e finché non è provata resta aperta: accettare entrambi i codici toglierebbe al test l'unica cosa che verifica.

   La configurazione ha già `testTimeout: 30000` e `maxWorkers: 50%` per la contesa sul database. Una cosa è però migliorata di lato: i test delle notifiche contano **solo gli avvisi del proprio post**, perché le suite condividono database e corsia dei fatti — contare tutto avrebbe reso quei casi sensibili a ciò che stava facendo un'altra suite, che è uno dei modi in cui questa intermittenza si crea. Una suite che a volte è rossa insegna a rilanciarla invece che a indagare, ed è il modo in cui un difetto vero passa inosservato.
6. **La porta S-audio non è attraversabile da qui**: i suoi quattro criteri di uscita — tre o quattro persone che si sentono da reti diverse, funzionamento da telefono, costo del nodo dentro il budget, riavvio non presidiato — si verificano solo con un nodo LiveKit vero. Il timebox è di 2,5 giorni e allo scadere un esito non nettamente positivo **vale come negativo**: l'audio esce dal perimetro e l'aula resta testuale, che è già consegnabile.
7. **L'`MX` di `prome.app` punta alla macchina**, che non ha un server di posta: chi risponde all'email di accesso scrive nel vuoto. Mandare i codici funziona lo stesso.
8. **SSH è aperto al mondo** e prende migliaia di tentativi al giorno. Restringerlo nel pannello Hetzner è più solido di fail2ban, perché blocca prima che sshd veda il pacchetto.
9. **L'archivio dei file è locale**, su un volume della macchina. Quando arriverà un fornitore con regione UE dichiarata, sarà un adattatore: `ArchivioLocale` usa già lo stesso flusso firmato di un fornitore vero.
10. **Il profilo dell'account di prova ha dati inventati** («Andrea Trica», Politecnico di Milano): li ho messi io per provare il giro, vanno corretti.
11. **Il progetto Vercel è ancora attivo** e va dismesso.
12. **Residui DNS del vecchio hosting**: `ftp`, `mail`, `_cpanel-dcv-test-record`, `_acme-challenge`.

---

## Come si lavora

```bash
pnpm db:up                              # Postgres locale, porta 6400
pnpm --filter @prome/api exec prisma migrate deploy
pnpm dev:api                            # API
pnpm dev:web                            # sito, porta 3500
pnpm --filter @prome/api test           # 252 test, serve il database
pnpm api:client                         # rigenera il client dopo OGNI modifica agli endpoint
```

- **Commit**: Conventional Commits in italiano con scope, per esempio `feat(bacheca): …`. **Mai** il trailer `Co-Authored-By`.
- **Errori**: sempre e solo `AppException`, con codice per contesto (Profilo `PR`, Bacheca `BA`, Gruppo `GR`, Aula studio `AS`). Chiave del messaggio tipizzata: una chiave inesistente non compila.
- **Traduzioni**: tutto tradotto lato server, la lingua viaggia in ogni richiesta. Una chiave presente in una sola lingua non compila.
- **Aree a difetti invisibili** (accesso, caricamenti, permessi, cancellazione account): test automatici obbligatori, scritti prima del codice.
- **Colori**: usare i ruoli (`bg-superficie`, `text-testo-corpo`), non le rampe. Tailwind non segnala una classe inventata: la ignora, e il colore sparisce senza errori. Una schermata nuova va guardata in tutti e due i temi prima di dirla finita.
