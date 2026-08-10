---
artifact: "implementation_plan"
title: "Implementation Plan"
project: "Prome"
client: "Myself"
version: 1
status: "approved"
created_at: "2026-08-09T20:27:23.995Z"
approved_at: "2026-08-09T20:27:39.573Z"
stage: "implementation"
attempt: 1
run_id: "01de2132-ec73-4452-9176-721cc5b657d7"
version_id: "8edcaa48-6d82-463b-92c4-c8fee1d2897b"
generated_by: "documento generato da donumAI — le modifiche si fanno nella pipeline, non in questo file"
---

# Implementation Plan

## Epics & Work Packages

Il lavoro è decomposto in **14 epiche** e **56 work package**. Ogni epica è un'unità di valore osservabile: ha un outcome che una persona reale può usare e una demo mostrabile a qualcuno. Nessuna epica porta il nome di un layer tecnico, di una fase o di un contenitore — il lavoro di predisposizione iniziale (scheletro API, schema dati, shell web, messa in esercizio) è assorbito dentro E0, e ogni integrazione esterna (email, archiviazione file, trasporto realtime, audio, notifiche) vive dentro l'epica funzionale che la consuma.

Ogni work package è un'unità di assegnazione: **un solo ruolo owner**, **esito binario** (fatto / non fatto), **nessuno oltre 5 giorni**, e un **asse di split** dichiarato dal vocabolario chiuso. Le taglie in giorni sono indicative e servono unicamente a tenere binario ogni work package: **non ristimano nulla** e non sostituiscono la stima approvata (102,7 giorni-persona di sviluppo, 225,6 attesi con gli uplift).

---

### Come leggere la mappatura verso l'architettura

Ogni epica è agganciata ai componenti dell'architettura approvata. Le corrispondenze ricorrenti, dichiarate una volta e valide ovunque:

| Area funzionale | Componenti coinvolti |
|---|---|
| Identità e accesso | `PortaIdentitàUtente` (traduce, non decide), modulo `Profilo` |
| Profilo, onboarding, privacy | `Profilo`, `FacciataDellApp` |
| Post, allegati, commenti | `Bacheca`, `ArchivioDiFile`, `FacciataDellApp` |
| Aule studio, materiali, ruoli | `AulaStudio` (core), `ArchivioDiFile` |
| Chat testuale | `AulaStudio` / `Gruppo` (proprietari del messaggio), `TrasportoInTempoReale` (consegna soltanto) |
| Audiochat | `PortaAudiochat`, `AulaStudio` (solo il Permesso di Parlare) |
| Gruppi | `Gruppo`, contratto di appartenenza verso `AulaStudio` |
| Notifiche | `AvvisiInUscita` |
| Client | `FacciataDellApp` (contratto unico versionato), `AppMobile` |
| Meccanismi ricorrenti e cancellazione | `CadenzaDeiMeccanismiRicorrenti`, `RecapitoDeiFattiDiDominio`, `CancellazioneDellAccount` |

Due regole trasversali valgono dentro ogni work package e non vengono ripetute item per item: **la facciata autentica, i moduli autorizzano** (nessuna decisione di visibilità o di ammissione risiede in `FacciataDellApp` o nel titolo di accesso), e **nessuna chiamata bloccante a un fornitore dentro il percorso di una richiesta del client**.

---

### E0 — Il nuovo Prome è online e utilizzabile da capo a fondo

**Outcome:** una persona qualsiasi apre Prome in un ambiente pubblicamente accessibile, si registra con email e codice OTP, compila il profilo (nome, cognome, università, corso) e pubblica un post con un PDF allegato che sopravvive al refresh.

**Demo:** *«Apro Prome dal telefono di un amico: si registra con la sua email, riceve davvero il codice, compila università e corso, allega le slide di Analisi 1 a un post e pubblica. Ricarichiamo la pagina: il post e il PDF ci sono ancora.»*

**Componenti toccati:** `PortaIdentitàUtente`, `Profilo`, `Bacheca`, `ArchivioDiFile`, `AvvisiInUscita` (canale email per l'OTP), `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E0.1 Scheletro del servizio API e schema dati con migrazioni | BE | 1.5 | workflow steps |
| E0.2 Registrazione e accesso con email e codice OTP, solo percorso felice | BE | 1.0 | simple-then-complex |
| E0.3 Shell web: landing minima, privacy policy, login, feed | FE | 1.5 | workflow steps |
| E0.4 Onboarding profilo: API, gate post-registrazione e flusso guidato | BE | 1.5 | workflow steps |
| E0.5 Post con allegato: API, caricamento file, validazione del tipo e limite di dimensione | BE | 2.5 | major effort first |
| E0.6 Composer con allegato e lista post | FE | 1.5 | simple-then-complex |
| E0.7 Messa in esercizio dell'ambiente e pubblicazione dell'applicazione accessibile pubblicamente | BE | 1.5 | workflow steps |

**Contenuto operativo dei work package**

- **E0.1** — istanza relazionale unica con i **quattro schemi disgiunti** (`profilo`, `bacheca`, `gruppo`, `aula_studio`) più lo schema tecnico `cancellazione`, privilegi per schema con accesso incrociato negato dal motore, foreign key solo *dentro* lo schema (inclusa l'unica cascata `bacheca.allegato → bacheca.post`), riferimenti fra contesti come identificatori nudi. Migrazioni versionate e applicabili **senza finestra sorvegliata**. Moduli dichiarati con il grafo delle dipendenze coincidente con la Context Map; le due unità di esecuzione — applicativa e lavoratrice — ricavate dalla stessa immagine e differenziate per configurazione di avvio.
- **E0.2** — traduzione dell'account autenticato in Utente di dominio dentro `PortaIdentitàUtente`: passa `UtenteDiDominio`, non passano account, sessione, provider. Solo il percorso felice: richiesta del codice, verifica, sessione. L'invio reale dell'OTP passa dal canale email di `AvvisiInUscita` con fornitore reale, non simulato.
- **E0.3** — shell con **privacy policy e informativa raggiungibili prima dell'onboarding**, con indirizzo stabile e rendering lato server. È il requisito che rende possibile raccogliere i dati di profilo in E0.4 e non un abbellimento: la pagina precede la raccolta.
- **E0.4** — `Profilo` e `ImpostazioniDiPrivacy` **creati nella stessa scrittura**, con default restrittivo, e `Profilo` che può esistere con onboarding non completato. Gate post-registrazione che porta l'utente a compilare nome, cognome, università, corso — università **autodichiarata**, nessuna verifica. La copia locale del riferimento utente nasce al completamento dell'onboarding, non alla creazione del profilo.
- **E0.5** — è il work package più corposo dell'epica ed è il primo per effort dentro E0 (*major effort first*): pre-autorizzazione firmata al caricamento, byte che **non attraversano il backend**, upload diretto verso `ArchivioDiFile` con regione UE dichiarata, comunicazione dell'esito e creazione dell'aggregato. Validazione di tipo (PDF, immagine, file testuale) e dimensione (> 0 e ≤ 25 MB). Chiavi con prefisso per contesto e proprietario logico, **mai per identificativo utente**.
- **E0.6** — composer con barra di avanzamento del caricamento e lista dei post; nessun ranking, ordinamento cronologico.
- **E0.7** — provisioning con regione UE dichiarata su ogni fornitore toccato, segreti fuori dal repository con **avvio fail-fast** se ne manca uno, backup con ripristino a 3 giorni e copie giornaliere a 14, log strutturati con conservazione a 14 giorni. È il work package che rende l'ambiente **pubblicamente raggiungibile e verificato con un giro completo registrazione → pubblicazione** prima di qualunque smantellamento del vecchio sistema.

**Nota di perimetro.** L'avvio della cancellazione dell'account dall'applicazione, con verifica «nessun record e nessun file residuo», è condizione di chiusura della prima milestone e viene realizzato dentro questa epica come parte di E0.4 (superficie di richiesta) ed E0.7 (esecuzione e verifica del residuo lato unità lavoratrice). Non è un'epica a sé perché non produce valore osservabile indipendente: è la contropartita dell'apertura al pubblico.

---

### E1 — Entro in Prome come preferisco

**Outcome:** chi arriva su Prome capisce cos'è dalle pagine informative e sceglie come accedere fra accesso Google, accesso Apple ed email con password, con errori e recupero gestiti.

**Demo:** *«Apro la home, leggo cos'è Prome, entro con Google in due tap; da un altro telefono entro con Apple; sbaglio apposta la password e vedo un messaggio sensato, con il recupero che funziona davvero.»*

**Componenti toccati:** `PortaIdentitàUtente`, `Profilo`, `FacciataDellApp`, `MisurazioniDiUtilizzo` (posto dichiarato).

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E1.1 Accesso Google e collegamento dell'account esistente | BE | 1.5 | data-entry methods |
| E1.2 Accesso Apple | BE | 1.5 | data-entry methods |
| E1.3 Email con password e recupero password | BE | 1.5 | data-entry methods |
| E1.4 Schermate di autenticazione complete con tutti gli stati di errore | FE | 2.0 | workflow steps |
| E1.5 Homepage completa e pagine informative | FE | 1.5 | workflow steps |
| E1.6 Strumentazione degli eventi di prodotto | FE | 1.0 | reducing the variations |

**Contenuto operativo dei work package**

- **E1.1–E1.3** — tre modalità di ingresso separate perché l'asse è il **metodo di immissione**: ciascuna ha una configurazione esterna propria (credenziali OAuth, certificati Apple, invio email per il recupero) e un esito binario indipendente. Tutte e tre convergono sullo stesso punto di traduzione: `PortaIdentitàUtente` produce `UtenteDiDominio` e nient'altro. E1.1 include il **collegamento a un account già esistente** con la stessa email, che è il caso in cui un errore produce due profili per la stessa persona.
- **E1.4** — copre esplicitamente i **percorsi infelici**: credenziale errata, account inesistente, provider non raggiungibile, link di recupero scaduto. Nessuno di questi produce schermata bianca o errore non spiegato.
- **E1.5** — homepage e pagine informative complete, con l'informativa aggiornata a ciò che il prodotto tratta davvero, inclusa la dichiarazione che **un materiale caricato in aula resta accessibile anche dopo la cancellazione dell'account**, con il solo caricatore anonimizzato.
- **E1.6** — strumentazione degli eventi di prodotto sul percorso di ingresso. Il componente di misurazione **resta senza fornitore assegnato** finché non è dimostrabile la conformità su regione e trattamento: il work package predispone i punti di emissione e l'asserzione dei segnali nei test, non attiva un prodotto di analisi.

---

### E2 — Pubblico materiale e ne discuto

**Outcome:** uno studente gestisce i propri post (modifica, cancellazione, più allegati), scorre un feed che regge il volume e discute nei commenti, moderando quelli sotto ai propri post.

**Demo:** *«Correggo un post già pubblicato e ne cancello un altro; scorro il feed che carica altre pagine mentre scendo; un compagno apre il PDF nel dettaglio e lascia un commento, io lo cancello perché è fuori tema.»*

**Componenti toccati:** `Bacheca`, `ArchivioDiFile`, `RecapitoDeiFattiDiDominio` (eliminazione dei commenti di un post eliminato), `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E2.1 Post completo: modifica, eliminazione, permessi dell'autore | BE | 1.5 | operations (CRUD) |
| E2.2 Allegati multipli, immagini e limiti di dimensione | BE | 1.5 | data variations |
| E2.3 Feed paginato e dettaglio post con viewer degli allegati | FE | 2.0 | workflow steps |
| E2.4 Commenti: modello, API, moderazione dell'autore | BE | 1.0 | operations (CRUD) |
| E2.5 Interfaccia dei commenti sotto il post | FE | 1.0 | workflow steps |

**Contenuto operativo dei work package**

- **E2.1** — completa le operazioni oltre la creazione già coperta da E0.5. L'eliminazione di un post porta con sé i suoi allegati **nella stessa transazione** (nessun allegato orfano nemmeno per un istante) e i file corrispondenti sono cancellati dall'archivio; l'eliminazione dei commenti collegati avviene invece **in modo differito**, perché sono un aggregato distinto e nessuno sta aspettando. Permessi dell'autore verificati nel modulo proprietario, mai nella facciata.
- **E2.2** — variazione sui dati: più allegati per post, tipo immagine oltre al PDF, limiti di dimensione applicati e messaggio esplicito al rifiuto. Il rifiuto di un file troppo grande è uno dei percorsi infelici che l'epica deve mostrare funzionante.
- **E2.3** — paginazione del feed e viewer degli allegati nel dettaglio. La visibilità dei contenuti è **risolta per autore alla lettura**, interrogando il modulo `Profilo`, senza alcun attributo di visibilità sul post e senza cache della decisione: la superficie viene predisposta qui, le regole arrivano in E6 e trovano il punto di innesto già in piedi.
- **E2.4–E2.5** — commenti piatti, moderazione da parte dell'autore del post. Il commento **non garantisce l'esistenza del post**: è una scelta di modello già presa, e l'interfaccia deve reggere il caso in cui il post non c'è più.

---

### E3 — L'aula di studio esiste e ci si entra

**Outcome:** uno studente crea un'aula, invita un compagno via email, il compagno si iscrive ed entra comparendo tra i partecipanti; entrambi condividono materiali con i permessi del proprio ruolo.

**Demo:** *«Creo l'aula "Analisi 1 – giovedì", mando l'invito, il compagno riceve la mail, si registra, entra e lo vedo nella lista; carico un PDF e lui lo scarica, ma non può cancellarlo perché non è moderatore.»*

**Componenti toccati:** `AulaStudio` (core), `ArchivioDiFile`, `AvvisiInUscita`, `RecapitoDeiFattiDiDominio`, `CadenzaDeiMeccanismiRicorrenti`, `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E3.1 Entità aula: CRUD, pubblica/privata, stati | BE | 2.0 | operations (CRUD) |
| E3.2 Ruoli d'aula: moderatore/partecipante, ingresso/uscita, permessi per azione | BE | 2.5 | business-rule variations |
| E3.3 Invito via link email con obbligo di iscrizione e ritorno all'aula dopo la registrazione | BE | 1.5 | workflow steps |
| E3.4 Schermate aula: lista, creazione, dettaglio con pannello partecipanti | FE | 2.5 | workflow steps |
| E3.5 API materiali d'aula con permessi per ruolo | BE | 1.0 | data variations |
| E3.6 Interfaccia materiali d'aula | FE | 1.0 | workflow steps |

**Contenuto operativo dei work package**

- **E3.1** — aggregato aula con i suoi argomenti e materiali; **nessuno stato di ciclo di vita** sull'aula: la distinzione fra programmata ed estemporanea è derivata dalla presenza della data di inizio, non da un campo di stato. Blocco ottimistico per versione, perché gli invarianti sono affermazioni sull'insieme dei partecipanti.
- **E3.2** — è il work package a maggior densità di regole dell'epica (*business-rule variations*): i tre permessi si concedono e si revocano **uno per uno**, mai come insieme, e la sola lettura è l'insieme vuoto raggiunto per revoche successive — non un ruolo con endpoint proprio. Ogni verifica di permesso avviene **nell'istante del gesto**, su dato fresco, dentro il modulo proprietario. L'invariante che impone almeno un moderatore per aula è respinto dal confronto di versione in caso di retrocessione concorrente. È il work package su cui vanno scritti i **test prima del codice**, perché un permesso concesso per errore non è percepibile da chi ne subisce l'effetto.
- **E3.3** — invito con scadenza a 7 giorni, innescata dal componente di cadenza dei meccanismi ricorrenti che **lavora per interrogazione dello stato** e non per coda di promemoria: dopo un'interruzione non ha arretrati da recuperare, ha una query che trova più righe. L'accettazione dell'invito **non crea il partecipante nella stessa transazione**: la risposta al client è un'accettazione presa in carico, seguita dalla comparsa del partecipante entro pochi secondi. Il ritorno all'aula dopo la registrazione chiude il giro.
- **E3.4** — schermata composita: lista, creazione, dettaglio con pannello partecipanti e relativi permessi. È la schermata più densa del lato web e viene aperta con una **sola risposta composta**, non con una sequenza di chiamate.
- **E3.5–E3.6** — materiali d'aula sull'archivio file, con permesso di caricare verificato al gesto. L'eliminazione di un argomento **non cancella alcun file**: i materiali tornano sciolti. È il comportamento da mostrare in demo, perché è l'opposto di ciò che accade ai post.

---

### E4 — In aula ci scriviamo in tempo reale

**Outcome:** due partecipanti della stessa aula vedono i messaggi comparire istantaneamente e la cronologia sopravvive a refresh e disconnessione.

**Demo:** *«Apro l'aula su laptop e telefono, scrivo da uno e il messaggio compare sull'altro; spengo il wifi, lo riaccendo, la chat si riallinea da sola senza buchi.»*

**Componenti toccati:** `AulaStudio` (proprietario del messaggio), `TrasportoInTempoReale` (consegna soltanto), `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E4.1 Canale realtime e stanze per aula | BE | 2.0 | major effort first |
| E4.2 Persistenza dei messaggi e riconnessione | BE | 1.5 | deferred performance |
| E4.3 Interfaccia chat con stati di connessione | FE | 2.0 | workflow steps |

**Contenuto operativo dei work package**

- **E4.1** — il trasporto **consegna messaggi già accettati** e non conosce partecipanti né permessi: la verifica del permesso di scrivere è avvenuta prima, dentro il modulo proprietario, su dato fresco. Il work package è primo per effort perché è la parte con più incognite tecniche dell'epica.
- **E4.2** — messaggio **persistito prima, pubblicato dopo il commit**: la sopravvivenza della cronologia non dipende dalla disponibilità del fornitore di trasporto. Conseguenza dichiarata e non difetto: una ripubblicazione dopo un fallimento può consegnare due volte lo stesso messaggio, e il client **deduplica per identificativo**. Il messaggio è immutabile dopo l'invio.
- **E4.3** — stati di connessione visibili all'utente e riallineamento automatico alla riconnessione. La degradazione da provare dal vivo è quella dichiarata: con il trasporto spento il messaggio è comunque persistito e leggibile alla riapertura.

**Nota di modello.** Non esiste alcun componente condiviso di messaggistica fra aula e gruppo: il messaggio è modellato due volte perché **ciò che si verifica prima di scrivere è diverso** (permesso di scrivere in aula, titolo ad appartenenza nel gruppo). La duplicazione è il costo già messo a bilancio, non una svista da correggere.

---

### E5 — In aula ci parliamo

**Outcome:** tre partecipanti entrano in audiochat nella stessa aula, si sentono, chi si muta è visibile come muto agli altri e chi non riesce ad attivare l'audio capisce perché.

**Demo:** *«Entriamo in tre da tre reti diverse, attiviamo il microfono e ci sentiamo; uno si muta e gli altri due lo vedono muto; a uno nego il permesso microfono nel browser e vede un messaggio che spiega cosa fare.»*

**Componenti toccati:** `PortaAudiochat`, `AulaStudio` (solo il Permesso di Parlare), `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E5.1 Token e gestione delle stanze audio lato API | BE | 2.5 | major effort first |
| E5.2 Client audio web: ingresso, mute, lista parlanti, permesso microfono | FE | 2.5 | workflow steps |
| E5.3 Degradazione e messaggi d'errore quando l'audio non parte | FE | 1.0 | business-rule variations |

**Contenuto operativo dei work package**

- **E5.1** — l'accesso al canale è rilasciato **se e solo se** il partecipante ha il permesso di parlare, verificato al gesto. La porta si esprime unicamente nei termini di canale audio dell'aula e permesso di parlare: nessun vocabolario di fornitore attraversa il confine, ed è ciò che rende sostituibile la capacità sottostante senza toccare il modello. Nessuna registrazione né conservazione del flusso: **solo transito**. Il consumo va misurato per minuti-partecipante, con soglia di allerta al 70% del tetto mensile dichiarato.
- **E5.2** — ingresso, mute con stato visibile agli altri, lista dei parlanti, richiesta esplicita del permesso microfono con **motivazione d'uso dichiarata** — mai attivazione implicita.
- **E5.3** — è il work package che rende l'epica accettabile: permesso negato dal browser, rete che non consente il collegamento, fornitore indisponibile. In tutti e tre i casi **l'aula resta operativa al 100% nelle funzioni non-audio** — chat, materiali, argomenti, elenco partecipanti, moderazione dei permessi — e l'apertura della sala riesce comunque. Un permesso concesso che non produce effetto non è un'aula rotta.

**Dipendenza dichiarata.** L'intera epica è condizionata all'esito della porta a timebox sull'audio: se l'esito non è nettamente positivo secondo i criteri scritti prima di iniziare, l'audio esce dal perimetro e l'aula resta testuale — che è già consegnabile e utile da sola.

---

### E6 — Decido chi mi vede e chi mi contatta

**Outcome:** uno studente imposta le proprie regole di visibilità e contatto e, da un altro account, i suoi contenuti spariscono e il contatto è bloccato.

**Demo:** *«Imposto "solo i miei gruppi vedono i miei post"; dall'account di prova quel post sparisce dal feed, non compare nel dettaglio nemmeno col link diretto, e il pulsante di contatto non c'è più.»*

**Componenti toccati:** `Profilo` (unico proprietario della decisione), `Bacheca`, `Gruppo`, `AulaStudio` (consumatori), `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E6.1 Modello delle regole di privacy | BE | 2.5 | business-rule variations |
| E6.2 Applicazione delle regole su post e commenti | BE | 1.5 | data variations |
| E6.3 Applicazione delle regole su aule e gruppi | BE | 1.5 | data variations |
| E6.4 Schermata impostazioni privacy e profilo | FE | 2.0 | workflow steps |

**Contenuto operativo dei work package**

- **E6.1** — insieme **finito e chiuso** di regole: chi può contattare, chi può vedere i contenuti. Nessun motore di permessi generico, nessuna visibilità per singolo contenuto. La decisione è **interrogata sincrona al momento della lettura**, mai propagata e mai messa in cache: una decisione replicata sarebbe una decisione presa su un dato vecchio, e il numero richiesto di finestre di visibilità indebita è zero. Le impostazioni **non emettono alcun evento**.
- **E6.2–E6.3** — due work package separati per **variazione di dato**, non per layer: la superficie di applicazione è diversa (contenuti pubblicati da un lato, spazi sociali dall'altro) e l'esito è verificabile separatamente. È l'area a maggior rischio di regressione dell'intero piano, perché attraversa ogni query di lettura.
- **E6.4** — schermata unica per impostazioni privacy e profilo, con effetto immediato: la regola cambiata è applicata **alla lettura successiva**, senza finestra.

**Test prima del codice.** Su tutta l'epica il difetto è invisibile a chi ne subisce l'effetto — nessuno si accorge di essere visto da chi non dovrebbe vederlo. I test di visibilità e ammissione sono scritti **prima** dell'implementazione, e la copertura automatica è obbligatoria.

**Nota sulla visibilità per ateneo.** L'ammissione basata sull'ateneo si valuta **su dato fresco del profilo**, mai sulle copie locali del riferimento utente, la cui tolleranza è di minuti. Il dato anagrafico si propaga, la decisione di autorizzazione si interroga: la linea non si attraversa mai.

---

### E7 — Mi organizzo in gruppi

**Outcome:** uno studente crea un gruppo, invita compagni e i contenuti riservati al gruppo diventano visibili solo ai membri.

**Demo:** *«Creo "Ingegneria Informatica – 2° anno", invito due compagni, entrano e vedono i post riservati al gruppo; un quarto utente non li vede.»*

**Componenti toccati:** `Gruppo`, contratto di appartenenza verso `AulaStudio`, `AvvisiInUscita`, `CadenzaDeiMeccanismiRicorrenti`, `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E7.1 Entità gruppo: CRUD, appartenenza, inviti | BE | 2.5 | operations (CRUD) |
| E7.2 Schermate gruppi: lista, dettaglio, gestione membri | FE | 2.0 | workflow steps |

**Contenuto operativo dei work package**

- **E7.1** — gruppo come **contenitore di utenti con appartenenza e visibilità**, secondo l'ipotesi in vigore: non un secondo spazio sociale con feed, moderazione e notifiche proprie. Aggregato con l'insieme dei membri nella stessa transazione, invariante di almeno un moderatore, un utente al massimo una volta — proprietà che rende priva di effetto una seconda aggiunta e che regala l'idempotenza al consumo dei fatti. Inviti con scadenza a 7 giorni sullo stesso meccanismo per interrogazione già usato dalle aule.
- **E7.2** — lista, dettaglio, gestione dei membri. L'appartenenza pubblicata verso l'aula è un **fatto booleano**: la parola membro non entra nel core dell'aula, e l'ammissione è tradotta in titolo dall'anti-corruption layer sul lato consumatore.

**Dipendenza dichiarata.** L'epica è condizionata all'esito della porta a timebox sui gruppi. La reazione a un esito negativo è **riduzione di perimetro, mai aumento di sforzo**.

**Effetto di decadenza dell'appartenenza.** La rimozione di un membro produce, dentro E7.1, il fatto che chiude l'accesso alla chat e all'audio per chi è già dentro un'aula riservata al gruppo. È l'unico percorso del piano in cui una decisione presa in uno spazio deve raggiungere una persona in un altro entro pochi secondi: chi è già dentro non farà alcuna nuova richiesta, quindi **l'informazione deve andargli incontro**. Il verso opposto — l'ingresso — non richiede alcuna propagazione, perché la domanda è posta adesso e la risposta è immediata.

---

### E8 — Prome mi richiama quando succede qualcosa

**Outcome:** uno studente riceve una notifica quando viene invitato a un'aula o commentato, toccandola arriva sul contenuto e può disattivare ciò che non gli interessa.

**Demo:** *«Chiudo il browser, un compagno commenta il mio post, arriva la notifica e cliccandola atterro sul commento; poi disattivo le notifiche dei commenti e non ne ricevo più.»*

**Componenti toccati:** `AvvisiInUscita`, `Bacheca` e `AulaStudio` come produttori degli avvisi, `Profilo` per le preferenze, `FacciataDellApp`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E8.1 Registrazione dei token e invio delle notifiche sugli eventi chiave | BE | 2.5 | business-rule variations |
| E8.2 Notifiche sul web e preferenze di notifica | FE | 1.5 | workflow steps |

**Contenuto operativo dei work package**

- **E8.1** — registrazione dei token e regole di invio per **evento chiave**: invito ricevuto, commento sotto un proprio contenuto. L'invio è **asincrono, fuori dal percorso della richiesta del client**, con consegna almeno una volta e deduplica per identificativo dell'evento. Nessun meccanismo di trasporto push proprio su iOS: il trasporto è quello imposto dalla piattaforma. Gli avvisi verso l'esterno **non trasportano dati personali** oltre gli identificativi tecnici necessari.
- **E8.2** — superficie web delle notifiche e pannello delle preferenze, con la disattivazione per tipo che ha effetto verificabile in demo.

**Nota.** Questo è anche il canale con cui, in esercizio non presidiato, il titolare viene raggiunto dalle condizioni di allerta operative. Le regole di anti-flood e le soglie appartengono alla sezione dei rischi e non sono un work package a sé.

---

### E9 — Entro in Prome dal telefono

**Outcome:** uno studente installa la build interna, si registra con Apple, Google o email e completa il profilo su schermate native, restando autenticato tra un avvio e l'altro.

**Demo:** *«Installo la build interna, entro con Apple, compilo università e corso, vedo il feed sul telefono; chiudo e riapro l'app e sono ancora dentro.»*

**Componenti toccati:** `AppMobile`, `FacciataDellApp` (contratto unico versionato, nessun endpoint dedicato al mobile).

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E9.1 Impianto dell'app mobile: navigazione e client API condiviso | Mobile | 2.5 | major effort first |
| E9.2 Autenticazione mobile con email, OTP e password, con storage sicuro del token | Mobile | 2.5 | data-entry methods |
| E9.3 Accesso nativo Google e Apple | Mobile | 2.5 | data-entry methods |
| E9.4 Onboarding profilo su mobile | Mobile | 1.5 | workflow steps |

**Contenuto operativo dei work package**

- **E9.1** — impianto con navigazione e client API generato dai tipi del contratto: **un solo contratto versionato**, consumato dall'app e da nessun altro. Nessun backend dedicato al mobile. Include la gestione della sessione e la disciplina del **lettore tollerante**: dentro una versione si aggiungono campi, non se ne rimuovono e non se ne cambia il significato.
- **E9.2** — schermate native per email, OTP e password, con token in storage sicuro. La durata del titolo di accesso non porta alcun peso di sicurezza: un account cancellato è respinto **immediatamente**, indipendentemente dalla validità residua del titolo.
- **E9.3** — accesso nativo con configurazione e certificati di piattaforma; è l'area a maggior dispersione dell'epica per dipendenza da terzi.
- **E9.4** — onboarding profilo su schermate native, con lo stesso gate post-registrazione del web.

**Regola di ordine.** Ogni flusso realizzato due volte è aperto dal lato web e seguito dal lato mobile: il lato che eredita il contratto non lo realizza mai per primo.

---

### E10 — Pubblico e commento dal telefono

**Outcome:** uno studente allega un file preso da galleria o dai file di sistema, pubblica e commenta dal telefono.

**Demo:** *«Dal telefono scelgo un PDF dai file, lo allego a un post e pubblico mentre vedo la barra di avanzamento; un compagno commenta e vedo il commento comparire.»*

**Componenti toccati:** `AppMobile`, `FacciataDellApp`, `ArchivioDiFile` (caricamento diretto dal dispositivo).

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E10.1 Feed e dettaglio post su mobile | Mobile | 2.0 | workflow steps |
| E10.2 Composer con allegati da galleria e file, con permessi di sistema | Mobile | 2.5 | data-entry methods |
| E10.3 Commenti su mobile | Mobile | 1.5 | operations (CRUD) |

**Contenuto operativo dei work package**

- **E10.1** — feed paginato e dettaglio con viewer degli allegati su schermate native.
- **E10.2** — due sorgenti di immissione, galleria e file di sistema, ciascuna con il proprio permesso di piattaforma richiesto esplicitamente e con messaggio comprensibile in caso di rifiuto. Il caricamento avviene **direttamente dal dispositivo verso l'archivio**, con pre-autorizzazione firmata: i byte non passano dal backend nemmeno su mobile.
- **E10.3** — commenti e moderazione dell'autore su mobile, riusando le API già chiuse in E2.

---

### E11 — Studio in aula dal telefono

**Outcome:** uno studente entra in aula dal telefono, chatta con chi è sul web e partecipa all'audio anche a schermo bloccato, sopravvivendo alle interruzioni.

**Demo:** *«Entro nell'aula dal telefono, scrivo in chat con chi è su web, attivo il microfono e parlo; blocco lo schermo e l'audio continua; mi arriva una chiamata, la rifiuto e l'audio riprende.»*

**Componenti toccati:** `AppMobile`, `AulaStudio`, `TrasportoInTempoReale`, `PortaAudiochat`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E11.1 Aule su mobile: lista, creazione, dettaglio, partecipanti | Mobile | 2.5 | workflow steps |
| E11.2 Chat realtime su mobile con riconnessione e background | Mobile | 2.0 | deferred performance |
| E11.3 Audiochat su mobile: ingresso, mute, parlanti, permesso microfono | Mobile | 3.0 | major effort first |
| E11.4 Audio in background e interruzioni da chiamata | Mobile | 1.5 | business-rule variations |

**Contenuto operativo dei work package**

- **E11.1** — schermate aula su mobile, inclusa la sala aperta con **una sola risposta composta**.
- **E11.2** — riconnessione con app in background e deduplica dei messaggi per identificativo, esattamente come sul web.
- **E11.3** — client audio nativo dentro il flusso di build gestito, con permesso microfono richiesto esplicitamente e **motivazione d'uso scritta**, che è anche materiale obbligatorio per la revisione degli store.
- **E11.4** — variazioni di regola proprie della piattaforma: audio che continua a schermo bloccato, chiamata in arrivo rifiutata con ripresa, chiamata accettata con comportamento dichiarato. Sono i casi che non hanno alcun equivalente sul browser e che giustificano un work package separato.

**Struttura in due tranche.** E11.1 ed E11.2 sono consegnabili e utili **senza la parte audio**: l'aula testuale in tasca vale di per sé. E11.3 ed E11.4 estendono la stessa superficie una volta risolta la porta sull'audio, e cadono con essa se l'esito è negativo.

---

### E12 — Gruppi, privacy e notifiche in tasca

**Outcome:** dal telefono lo studente gestisce gruppi e privacy e riceve notifiche native che aprono direttamente il contenuto giusto.

**Demo:** *«Ricevo la notifica dell'invito all'aula, la tocco e mi si apre l'aula giusta; poi cambio la privacy dal telefono e dall'altro account il post sparisce.»*

**Componenti toccati:** `AppMobile`, `Gruppo`, `Profilo`, `AvvisiInUscita`.

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E12.1 Gruppi su mobile | Mobile | 1.5 | workflow steps |
| E12.2 Impostazioni privacy su mobile | Mobile | 1.5 | workflow steps |
| E12.3 Notifiche native e permessi di notifica | Mobile | 2.0 | data-entry methods |
| E12.4 Apertura diretta dei contenuti dagli inviti su iOS e Android | Mobile | 1.5 | workflow steps |

**Contenuto operativo dei work package**

- **E12.1–E12.2** — superfici native su regole e modelli **già definiti altrove**: nessuna regola nuova viene introdotta qui, e la decisione resta interrogata al modulo proprietario.
- **E12.3** — registrazione del token nativo, richiesta del permesso di notifica con messaggio comprensibile e comportamento dichiarato in caso di rifiuto.
- **E12.4** — apertura diretta del contenuto giusto a partire da un invito, su entrambe le piattaforme: sono due configurazioni distinte, con esito verificabile sullo stesso work package perché il flusso utente è uno solo.

---

### E13 — Prome è installabile da chiunque

**Outcome:** chiunque cerca Prome negli store mobili lo trova, lo installa da zero e lo usa.

**Demo:** *«Cerco "Prome" da un telefono che non ha mai avuto l'app, installo, entro e pubblico un post.»*

**Componenti toccati:** `AppMobile`, materiale di conformità collegato a `PortaAudiochat` (permesso microfono) e a `CancellazioneDellAccount` (eliminazione avviabile dall'app).

| WP | Owner | Taglia (gg) | Asse di split |
|---|---|---|---|
| E13.1 Build di distribuzione, icone, splash, versioning e credenziali di firma | Mobile | 2.0 | major effort first |
| E13.2 Schede store, screenshot e dichiarazioni sui dati e sulla privacy | Mobile | 1.5 | data variations |
| E13.3 Prima submission su iOS e Android e risposta ai rilievi | Mobile | 2.5 | workflow steps |

**Contenuto operativo dei work package**

- **E13.1** — catena di build di distribuzione, icone, splash, politica di versione e credenziali di firma per due piattaforme. La politica di versione onora la regola già fissata: **nessuna funzionalità richiede l'aggiornamento simultaneo di backend e client**, e nessuna versione dell'app è resa inutilizzabile prima di 90 giorni dalla pubblicazione della successiva.
- **E13.2** — schede, screenshot e **dichiarazioni sui dati** allineate a ciò che il prodotto tratta davvero, più la motivazione d'uso scritta del permesso microfono. Questo materiale è predisposto **prima** della prima sottomissione, non dopo un rilievo.
- **E13.3** — prima sottomissione su entrambe le piattaforme con **account di prova funzionante fornito al revisore**, e risposta ai rilievi. È l'unico work package del piano il cui esito dipende interamente da un'autorità esterna, e l'unico su cui più ore non accorciano il tempo.

**Doppio passaggio.** L'epica viene attraversata due volte: un primo passaggio quando i flussi principali sono in piedi, un secondo dopo il completamento dell'ambito mobile. E13.1 ed E13.2 sono lavoro pieno solo al primo passaggio; al secondo si riducono all'aggiornamento delle dichiarazioni e della build.

---

### Quadro di sintesi

| Epica | WP | Owner prevalente | Componenti principali |
|---|---|---|---|
| E0 Il nuovo Prome è online e utilizzabile da capo a fondo | 7 | BE / FE | `Profilo`, `Bacheca`, `ArchivioDiFile`, `PortaIdentitàUtente` |
| E1 Entro in Prome come preferisco | 6 | BE / FE | `PortaIdentitàUtente`, `Profilo`, `FacciataDellApp` |
| E2 Pubblico materiale e ne discuto | 5 | BE / FE | `Bacheca`, `ArchivioDiFile`, `RecapitoDeiFattiDiDominio` |
| E3 L'aula di studio esiste e ci si entra | 6 | BE / FE | `AulaStudio`, `ArchivioDiFile`, `AvvisiInUscita` |
| E4 In aula ci scriviamo in tempo reale | 3 | BE / FE | `AulaStudio`, `TrasportoInTempoReale` |
| E5 In aula ci parliamo | 3 | BE / FE | `PortaAudiochat`, `AulaStudio` |
| E6 Decido chi mi vede e chi mi contatta | 4 | BE / FE | `Profilo`, `Bacheca`, `Gruppo`, `AulaStudio` |
| E7 Mi organizzo in gruppi | 2 | BE / FE | `Gruppo`, contratto di appartenenza |
| E8 Prome mi richiama quando succede qualcosa | 2 | BE / FE | `AvvisiInUscita` |
| E9 Entro in Prome dal telefono | 4 | Mobile | `AppMobile`, `FacciataDellApp` |
| E10 Pubblico e commento dal telefono | 3 | Mobile | `AppMobile`, `ArchivioDiFile` |
| E11 Studio in aula dal telefono | 4 | Mobile | `AppMobile`, `TrasportoInTempoReale`, `PortaAudiochat` |
| E12 Gruppi, privacy e notifiche in tasca | 4 | Mobile | `AppMobile`, `Gruppo`, `Profilo`, `AvvisiInUscita` |
| E13 Prome è installabile da chiunque | 3 | Mobile | `AppMobile` |
| **Totale** | **56** | | |

---

### Ciò che non è un'epica, e perché

| Non è epica | Dove vive | Ragione |
|---|---|---|
| Predisposizione dell'ambiente, schema dati, shell | E0.1, E0.3, E0.7 | Non produce valore osservabile da solo: è assorbito dalla prima epica, che si chiude con un giro completo utilizzabile |
| Provider email | Dentro E0 (OTP) ed E3 (inviti) | Un'integrazione esterna vive nell'epica funzionale che la consuma, mai come epica propria |
| Archiviazione dei file | Dentro E0.5, E2.2, E3.5, E10.2 | Stessa regola: nessuna epica «Integrazioni» |
| Trasporto realtime | Dentro E4 ed E11.2 | Stessa regola |
| Cancellazione dell'account e verifica del residuo | E0.4 ed E0.7 | È condizione di apertura al pubblico, non valore autonomo: senza di essa la prima milestone non è chiudibile |
| Segnalazione, blocco fra utenti, rimozione dichiarata | **fuori perimetro, registrato** | Preteso dalla revisione degli store ma **assente dal modello di dominio approvato**: introdurlo sarebbe una modifica del modello, con due autorità coinvolte. Il piano registra il posto vuoto e non lo riempie |
| Audit trail delle azioni di moderazione | **fuori perimetro, registrato** | Legato allo stesso punto aperto: finché non è deciso che cosa esiste in materia di moderazione, non è determinato che cosa tracciare |
| Acquisizione utenti | **fuori perimetro** | Nessun item del piano può produrla; è un'aspettativa da riformulare fuori dal piano, non lavoro da aggiungere |

## Sequencing & Dependencies

L'ordine di esecuzione non è una lista di preferenze: è la conseguenza di dipendenze reali fra epiche, di contratti che un lato deve pubblicare prima che l'altro li consuma, e di tre porte a timebox collocate **immediatamente a monte di ciò che condizionano**, non tutte in testa. La fila parte da uno scheletro sottile già pubblicato, prosegue in profondità sul dominio centrale (post → aule → realtime) e chiude con le regole trasversali.

Una sola persona esegue tutto: **la fila è strettamente sequenziale**. «Parallelo» qui significa alternanza, non simultaneità, e il tempo si somma. Di conseguenza ogni posizione della fila è anche un ordine di lavoro, non solo un vincolo logico.

---

### 1. Ordine di riferimento

Sedici posizioni. Ogni riga dichiara i predecessori vincolanti e la ragione per cui non può salire più in alto.

| # | Epica o porta | Predecessori vincolanti | Perché non può salire più in alto |
|---|---|---|---|
| 1 | S-mail → **E0** | — | Produce schema dati, identità, ambiente in esercizio e il primo giro completo registrazione → profilo → post con allegato. Nessuna epica può precederla |
| 2 | **E1** | E0.2 | Le modalità di accesso alternative si agganciano a un'identità che deve già esistere |
| 3 | **E2** | E0.5, E0.6 | Il feed completo estende post e allegati già in piedi |
| 4 | **E9** | E0, E1 | Richiede API di autenticazione già stabili |
| 5 | **E10** | E2, E9 | Consuma le API di post e commenti già chiuse |
| 6 | **E3** | E0 | Riusa identità, caricamento file e canale di invito dello scheletro |
| 7 | **E4** | E3.1, E3.2 | Le stanze realtime esistono solo se esistono aule e ruoli |
| 8 | **E11.1 + E11.2** | E3, E4, E9 | Aule e chat su mobile, senza la parte audio |
| 9 | S-audio → **E5** | E3.2 | La porta si attraversa qui: a monte ci sono già otto posizioni di valore rilasciate |
| 10 | **E11.3 + E11.4** | E5, posizione 8 | Estende la posizione 8 con la parte audio, una volta risolta la porta |
| 11 | **E13** (primo passaggio) | posizioni 4, 5, 8, 10 | I flussi principali devono essere in piedi prima di questo passaggio |
| 12 | S-gruppi → **E7** | E0 | La definizione precede il modello |
| 13 | **E6** | E2, E3, **E7** | Il motore di visibilità si scrive una volta sola, a gruppi già definiti |
| 14 | **E8** | E2.4, E3.3 | Senza commenti e inviti non esistono eventi da notificare |
| 15 | **E12** | E6, E7, E8, E9 | Riprende gruppi, privacy e notifiche già definiti altrove |
| 16 | **E13** (secondo passaggio) | E12 | Segue il completamento dell'ambito precedente |

---

### 2. Le tre porte a timebox e la loro collocazione

Le porte non stanno tutte in testa: **ciascuna è collocata immediatamente a monte del lavoro che condiziona**, così che il suo esito ricada su lavoro non ancora iniziato e mai su lavoro già fatto.

| Porta | Posizione | Timebox | Che cosa sblocca o taglia |
|---|---|---|---|
| **S-mail** | 1, in testa a E0 | 1 gg | Senza invio reale non esiste registrazione con OTP né invito d'aula. Si adotta senza ulteriore confronto il provider che ha funzionato per primo nella prova |
| **S-audio** | 9, subito prima di E5 | 2,5 gg | Condiziona E5 (posizione 9) ed E11.3–E11.4 (posizione 10). Esito negativo → l'audio esce dal perimetro, l'aula resta testuale |
| **S-gruppi** | 12, subito prima di E7 | 1 gg | Condiziona E7 (posizione 12), E6.3 (posizione 13) ed E12.1 (posizione 15). La reazione a un esito negativo è **riduzione di perimetro, mai aumento di sforzo** |

#### Perché S-audio è in nona posizione e non in prima

È la collocazione meno intuitiva della fila e va motivata. L'audio è il primo driver di varianza del piano — il solo audio su telefono pesa il 9% della varianza totale — e l'istinto direbbe di risolverlo subito. La ragione per cui non lo si fa è che **a monte della porta ci sono già otto posizioni di valore rilasciabile**: se l'esito è negativo, l'aula resta testuale e le posizioni 1–8 non perdono nulla. Anticipare la porta significherebbe spendere 2,5 giorni di capacità su un'incognita **prima** che esista alcunché di utilizzabile, e con la disponibilità dichiarata quei 2,5 giorni sono l'ordine di grandezza di un intero blocco di lavoro.

Simmetricamente, la porta **non può scendere più in basso** della posizione 9: la posizione 10 estende con l'audio la superficie mobile già consegnata alla posizione 8, e la posizione 11 (prima sottomissione) richiede materiale di revisione che include la motivazione d'uso del permesso microfono — che ha senso solo se l'audio è dentro il perimetro.

#### Perché S-gruppi è in dodicesima posizione

S-gruppi precede E7 di una posizione e nient'altro. Non può salire in testa perché non blocca nulla di ciò che sta sopra: i gruppi non sono predecessori di post, aule, chat o audio. Non può scendere sotto la posizione 12 perché E6 (posizione 13) applica le regole di visibilità **anche ai gruppi**, e scriverle su un modello non ancora definito significherebbe riscriverle.

---

### 3. Regola di ordinamento fra i due lati dello stesso flusso

> **Per ogni flusso realizzato due volte, la posizione web precede sempre la posizione corrispondente sull'altro lato.**

La regola non è una preferenza di piattaforma: discende dal fatto che esiste **un solo contratto verso il client, versionato in un punto**, e che il lato che eredita il contratto non può realizzare il flusso per primo — lo definirebbe di fatto, senza che il modulo proprietario lo abbia pubblicato.

La verifica su tutti i punti di contatto della fila:

| Flusso | Posizione che apre | Posizione che segue |
|---|---|---|
| Autenticazione e profilo | 1–2 (E0, E1) | 4 (E9) |
| Post, allegati, commenti | 3 (E2) | 5 (E10) |
| Aule e chat realtime | 6–7 (E3, E4) | 8 (E11.1–E11.2) |
| Audio in aula | 9 (E5) | 10 (E11.3–E11.4) |
| Gruppi, privacy, notifiche | 12–14 (E7, E6, E8) | 15 (E12) |

**Nessuna posizione può essere anticipata in violazione di questa regola.** Un esempio del perché: se E11.3 (audio su mobile) precedesse E5 (audio su web), il rilascio dei token e la gestione delle stanze audio lato API sarebbero progettati contro le esigenze del solo client nativo, e la porta d'astrazione sull'audio — che deve permettere la sostituzione della capacità sottostante senza toccare gli aggregati dell'aula — nascerebbe modellata su un fornitore anziché sul dominio.

---

### 4. Inversione registrata: E7 prima di E6

È **l'unica inversione non ovvia dell'ordine** e va dichiarata per intero, perché contraddice la lettura naturale del perimetro (prima la privacy, poi i gruppi che ne sono un caso).

**Il fatto.** E6.3 applica le regole di visibilità anche ad aule e gruppi. Collocare E6 prima di E7 imporrebbe di scrivere il modello di regole su un modello di gruppo non ancora definito, e di **riscriverlo una seconda volta** a gruppi definiti — sull'area a maggior rischio di regressione dell'intero piano, quella che attraversa ogni query di lettura.

**La decisione.** Accettare i gruppi in posizione anticipata (12) costa meno del rework sul motore di visibilità (13). Il costo accettato è che E7 viene realizzata su un'ipotesi non ancora confermata dalla porta — motivo per cui **S-gruppi la precede immediatamente** e non sta altrove.

**Il vincolo che ne discende.** E6.1 (modello delle regole) non può iniziare finché E7.1 non è chiusa. Non è una preferenza di ordinamento: è la condizione perché il motore di visibilità si scriva una volta sola.

---

### 5. Attese verso terzi

Le attese verso terzi **non sono lavoro e non occupano posizione nella fila**. Si innescano al giorno 1 e maturano durante E0, in modo che nessuna di esse blocchi la posizione a cui è agganciata quando questa viene raggiunta.

| Attesa | Si innesca | Matura entro | Posizione che sbloccherebbe se dimenticata |
|---|---|---|---|
| Verifica del dominio mittente e uscita dalla sandbox presso il provider email | giorno 1 | durante E0 | 1 (OTP di E0.2) e 6 (inviti di E3.3) |
| Propagazione DNS e rilascio del certificato sul dominio pubblico | giorno 1 | durante E0 | 1 (E0.7, pubblicazione) |
| Credenziali OAuth e certificati di piattaforma per accesso Google e Apple | giorno 1 | durante E0 | 2 (E1.1–E1.2) e 4 (E9.3) |
| Attivazione del progetto di notifica e credenziali di trasporto push | giorno 1 | entro la posizione 14 | 14 (E8.1) e 15 (E12.3) |
| Credenziali di firma e canali di test interni per le due piattaforme | entro la posizione 4 | entro la posizione 4 | 4 (installazione della build interna) e 11 (E13.1) |
| Revisione degli store sulla prima sottomissione | posizione 11 | **non comprimibile** | 11 e 16 |

**L'unica attesa che occupa davvero calendario è l'ultima**, e va trattata diversamente dalle altre: la revisione degli store è l'unico punto del piano in cui più ore di lavoro non accorciano il tempo. È la ragione per cui la prima sottomissione è collocata alla posizione 11 — appena i flussi principali sono in piedi — e non in coda: attendere il completamento dell'intero perimetro mobile prima di affrontare il primo giudizio esterno significherebbe scoprire un rilievo bloccante nel momento in cui non resta margine.

---

### 6. Ritorni sulle stesse aree, accettati

L'ordine accetta esplicitamente il **ritorno multiplo su alcune aree**:

| Area | Posizioni in cui viene ripresa | Che cosa si aggiunge ogni volta |
|---|---|---|
| Post e allegati | 1 (E0.5–E0.6), 3 (E2), 5 (E10) | creazione → operazioni complete e feed → superficie nativa |
| Aule | 6 (E3), 7 (E4), 8 (E11.1–E11.2), 10 (E11.3–E11.4) | spazio e ruoli → chat → superficie nativa testuale → audio |
| Prima sottomissione agli store | 11 e 16 | primo giudizio esterno → aggiornamento di dichiarazioni e build |

È la contropartita dichiarata del fatto che **ogni parte del prodotto raggiunge presto una forma utilizzabile** invece di concentrarsi in coda. L'alternativa — chiudere ogni area una volta sola e definitivamente — produrrebbe una fila in cui nulla è utilizzabile finché non è finito tutto, che con la capacità disponibile equivale a nulla di utilizzabile.

Il costo del ritorno è reale ed è già a bilancio nella riserva di rework della stima: ogni ripresa richiede di rientrare in un'area già chiusa, e ogni comportamento scoperto su un lato va riportato sull'altro.

---

### 7. Vincoli tecnici che l'ordine onora

Alcune dipendenze non sono fra epiche ma fra artefatti dell'architettura, e vincolano l'ordine dentro le posizioni:

| Vincolo | Dove agisce | Conseguenza sull'ordine |
|---|---|---|
| Il profilo e le impostazioni di privacy **nascono nella stessa scrittura**, con default restrittivo | E0.4 | Nessuna posizione può creare un utente prima che esistano le sue regole di privacy, nemmeno vuote. E0.4 non è rinviabile a E6 |
| L'informativa e la base giuridica devono precedere la raccolta dei dati di profilo | E0.3 prima di E0.4 | Vincolo **dentro** la posizione 1, non fra posizioni |
| Gli schemi disgiunti e il grafo delle dipendenze fra moduli sono posti in E0.1 | E0.1 | Ogni modulo successivo si innesta su confini già imposti dal motore: non esiste una posizione in cui i confini si «sistemano dopo» |
| Il permesso d'aula si verifica **nell'istante del gesto**, su dato fresco | E3.2 prima di E3.5, E4, E5 | Materiali, chat e audio non possono precedere i ruoli: leggerebbero un permesso che non esiste |
| La decisione di visibilità è **interrogata e mai propagata** | E6 | E6 non introduce alcun canale di eventi nuovo: si innesta sui punti di lettura predisposti in E2.3 e E3.4 |
| L'appartenenza al gruppo attraversa il confine come **fatto booleano** | E7.1 → E3.2 | Il verso dell'ingresso è risolto senza propagazione; il verso dell'uscita (decadenza dell'appartenenza) è l'unico effetto di E7 che ricade su un'area già chiusa |
| Un solo contratto versionato verso il client, con lettore tollerante | E9.1 | Il lato mobile non può introdurre endpoint propri: ogni posizione mobile consuma ciò che la posizione web corrispondente ha già pubblicato |

**La riga sulla decadenza dell'appartenenza merita attenzione**, perché è l'unico caso in cui una posizione tarda modifica il comportamento di una posizione precoce: E7.1 introduce l'effetto per cui chi perde l'appartenenza al gruppo viene rimosso da un'aula in cui è già dentro, con chiusura di chat e audio. L'aula (posizione 6) e la chat (posizione 7) sono già chiuse quando questo accade. È un ritorno previsto e non una regressione: il punto di consumo è l'anti-corruption layer sul lato aula, già in piedi, e il fatto arriva sulla corsia rapida.

---

### 8. Che cosa cambia nella fila se una porta chiude negativa

| Porta | Esito negativo | Posizioni che cadono | Posizioni che restano invariate |
|---|---|---|---|
| **S-mail** | 1 gg, nessun provider ha funzionato | L'OTP esce dal perimetro della prima posizione; E0.2 si riduce e E3.3 va rivisto | 3, 4, 5, 6, 7, 8: nessuna dipende dall'invio email |
| **S-audio** | 2,5 gg, criteri non tutti verificati | **9 e 10 cadono per intero** (E5, E11.3, E11.4). Il materiale sul permesso microfono esce da E13.2 | 1–8, 11–16. L'aula resta testuale ed è già consegnabile |
| **S-gruppi** | 1 gg, i gruppi non sono un contenitore di utenti | E7 si riduce a perimetro minimo; E6.3 si restringe di conseguenza; E12.1 si riduce | 1–11, 14: nessuna dipende dai gruppi |

Due letture obbligate. **La fila è progettata perché un esito negativo tolga posizioni, non ne aggiunga**: nessuna delle tre porte, chiudendo male, produce lavoro nuovo da inserire. E **nessuna posizione a monte di una porta dipende da essa**: è questa proprietà che rende la collocazione delle porte a valle di otto, undici e undici posizioni di valore una scelta e non un azzardo.

---

### 9. Verifica dell'ordine

Quattro controlli, rieseguibili a ogni modifica della fila:

1. **Ogni posizione ha almeno un predecessore dichiarato o è la prima.** Nessuna epica compare senza aggancio: un'epica senza predecessori dichiarati diversa dalla posizione 1 è un'epica di cui non si è verificata la dipendenza.
2. **Nessun flusso a due lati viola la regola di §3.** Il controllo si fa sulla tabella dei cinque flussi: la posizione che segue è sempre numericamente maggiore di quella che apre.
3. **Ogni porta a timebox precede immediatamente la prima posizione che condiziona**, e nessuna posizione a monte di essa vi dipende. Una porta separata da ciò che condiziona è una porta il cui esito ricade su lavoro già fatto.
4. **Ogni attesa verso terzi è innescata almeno una posizione prima di quella che sbloccherebbe.** L'unica eccezione ammessa e dichiarata è la revisione degli store, che non è comprimibile e per cui la mitigazione non è l'anticipo ma la completezza del materiale alla prima sottomissione.

## Release Milestones

Il lavoro è consegnato in **nove milestone**. Ogni milestone è un **incremento rilasciabile e coerente**: alla sua chiusura una persona reale può usare ciò che è stato consegnato. Nessuna milestone è un checkpoint interno — non esiste un «backend pronto», non esiste un «API completate», non esiste un «pronto per il collaudo». Una milestone è fatta quando è **in mano a chi la deve usare**, non quando il codice è pronto.

Le milestone sono ricavate dalla fila delle sedici posizioni già bloccata: ciascuna raggruppa posizioni consecutive che, insieme, producono qualcosa di consegnabile. Nessuna milestone spezza un'epica a metà.

---

### 1. Le nove milestone

| # | Milestone | Cosa consegna | Destinatario del rilascio |
|---|---|---|---|
| **M1** | Prome nuovo è online e ci si pubblica | Registrazione, onboarding del profilo, pubblicazione di post con PDF allegato | Pubblico su prome.app |
| **M2** | Si entra come si vuole e il feed è vivo | Modalità di accesso aggiuntive con recupero credenziali, homepage completa e pagine informative, feed paginato, allegati multipli, commenti con moderazione | Pubblico (web) |
| **M3** | Prome sul telefono, per pochi | App: accesso, profilo, feed, composizione di post con allegati da galleria e file, commenti | Pubblico ristretto (app) |
| **M4** | L'aula di studio funziona | Creazione dell'aula, ruoli moderatore e partecipante, invito via email, materiali condivisi, chat testuale in tempo reale con riconnessione | Pubblico (web) |
| **M5** | L'aula in tasca, per iscritto | Aule su app con chat in tempo reale, riconnessione e comportamento corretto in background | Pubblico ristretto (app) |
| **M6** | In aula ci si parla | Audiochat su web e su app, mute, lista dei parlanti, permessi microfono, audio a schermo bloccato | Pubblico (web) + pubblico ristretto (app) |
| **M7** | Prome è installabile da chiunque | L'app diventa ottenibile e installabile da chiunque, con schede di presentazione e dichiarazioni su privacy e trattamento dei dati | Pubblico generale (app) |
| **M8** | Decido chi mi vede | Gruppi con appartenenza e inviti, regole di visibilità e di contatto applicate su tutte le superfici, notifiche sugli eventi chiave | Pubblico (web) |
| **M9** | Il mobile raggiunge il web | Gruppi e regole di privacy su app, notifiche native, apertura diretta dei contenuti a partire dagli inviti | Pubblico generale (app) |

---

### 2. Composizione: dalle posizioni della fila alle milestone

Ogni milestone è la chiusura di un tratto contiguo della fila. Nessuna posizione appartiene a due milestone, e nessuna milestone contiene una posizione fuori ordine.

| Milestone | Posizioni della fila | Epiche e work package inclusi |
|---|---|---|
| **M1** | 1 | S-mail, **E0** (E0.1 → E0.7) |
| **M2** | 2, 3 | **E1** (E1.1 → E1.6), **E2** (E2.1 → E2.5) |
| **M3** | 4, 5 | **E9** (E9.1 → E9.4), **E10** (E10.1 → E10.3) |
| **M4** | 6, 7 | **E3** (E3.1 → E3.6), **E4** (E4.1 → E4.3) |
| **M5** | 8 | **E11.1**, **E11.2** |
| **M6** | 9, 10 | S-audio, **E5** (E5.1 → E5.3), **E11.3**, **E11.4** |
| **M7** | 11 | **E13** primo passaggio (E13.1, E13.2, E13.3) |
| **M8** | 12, 13, 14 | S-gruppi, **E7** (E7.1, E7.2), **E6** (E6.1 → E6.4), **E8** (E8.1, E8.2) |
| **M9** | 15, 16 | **E12** (E12.1 → E12.4), **E13** secondo passaggio |

**Le tre porte a timebox cadono dentro la milestone che condizionano**, non prima: S-mail apre M1, S-audio apre M6, S-gruppi apre M8. È la conseguenza diretta della regola di collocazione già bloccata — una porta sta immediatamente a monte di ciò che condiziona — e ha un effetto sulle milestone che va dichiarato: **un esito negativo restringe il contenuto della milestone in cui la porta vive, non il contenuto di quelle già chiuse** (§6).

---

### 3. Scelte di partizione registrate

#### Il primo rilascio realmente pubblico è M1

Non esiste una milestone anteriore riservata a un gruppo ristretto. **Dalla chiusura di M1 il prodotto è esposto su prome.app**, e ogni milestone successiva è un aggiornamento visibile a chi lo usa.

La conseguenza operativa è che M1 non è un rilascio «tecnico»: è il momento in cui una persona estranea al progetto esegue il giro completo — registrazione, ricezione del codice, compilazione di università e corso, pubblicazione di un post con PDF — **sul proprio dispositivo e senza istruzioni verbali**. Ne discendono tre condizioni che appartengono a M1 e a nessuna milestone precedente, perché nessuna esiste:

- **l'informativa e la base giuridica sono raggiungibili prima della raccolta dei dati di profilo**, con indirizzo stabile: è la condizione che rende lecito chiedere nome, cognome, università e corso in E0.4;
- **la cancellazione dell'account è avviabile dall'applicazione** e verificata con esito «nessun record e nessun file residuo». Non è una funzione da aggiungere quando arriverà l'app: è la contropartita dell'apertura al pubblico, e sta in E0.4 (superficie di richiesta) ed E0.7 (esecuzione e verifica del residuo);
- **il backup del database è stato preso e il ripristino eseguito almeno una volta**, prima di M1 e ripetuto a ogni milestone successiva che modifichi lo schema.

#### La base utenti da cui si contano i risultati parte da M1

Qualunque misura di adozione si riferisce alle persone che entrano **dopo l'apertura pubblica di M1**. I ~15 account del vecchio sistema non transitano: non esiste migrazione, e la loro perdita è già registrata come conseguenza accettata del cutover.

#### Nove milestone, senza ulteriore frammentazione

M2, M4 e M8 restano **rilasci unici e sostanziosi** anziché essere spezzati in rilasci più piccoli. La tentazione opposta è comprensibile — spezzare M4 in «aula senza chat» e «aula con chat» produrrebbe due rilasci al posto di uno — e viene rifiutata per una ragione di capacità: **ogni ciclo di messa in esercizio va preparato, eseguito e verificato da una sola persona**, e il costo fisso di un rilascio (verifica del giro completo da estraneo, ripristino provato dove lo schema cambia, controllo dei segreti e dell'avvio fail-fast) non si comprime frammentando il contenuto. La cadenza pubblica è più rada; il numero di cicli da preparare resta compatibile con la capacità disponibile.

#### M5 e M6 restano milestone distinte

È la scelta opposta alla precedente, e per questo va motivata separatamente. **L'aula su app in forma testuale è consegnabile e utile di per sé**, indipendentemente dall'audio: chi entra dal telefono, scrive in chat con chi è sul web e sopravvive a una disconnessione ha già in mano qualcosa che funziona.

Tenerla in un rilascio separato fa sì che il suo valore raggiunga chi lo usa **senza essere legato all'esito della parte audio** — che è, per costruzione, la parte con la varianza più alta dell'intero piano e l'unica il cui perimetro può cambiare di segno per effetto di una porta. Se M5 e M6 fossero un solo rilascio, un esito negativo su S-audio bloccherebbe anche la consegna dell'aula testuale in tasca, che con quell'esito non c'entra nulla.

#### M7 è collocata a metà del piano, non in coda

L'installabilità da parte di chiunque arriva **prima** che gruppi, privacy e notifiche siano su app. È deliberato e discende da un fatto che non dipende dal team: **la revisione degli store è l'unico punto del piano in cui più ore non accorciano il tempo**. Collocarla in coda significherebbe affrontare il primo giudizio esterno quando non resta margine per rispondere a un rilievo.

Di conseguenza M7 rilascia un'app **funzionalmente incompleta rispetto al web** — non ha ancora gruppi né impostazioni di privacy native — ma completa sui flussi principali: accesso, profilo, post, commenti, aule, chat e, se la porta è passata, audio. È una scelta di esposizione anticipata al rischio esterno, coerente con la stessa logica che ha portato ad aprire al pubblico già a M1.

---

### 4. Ciò che ogni milestone rende osservabile

Ogni milestone ha un **percorso principale** che una persona estranea deve poter eseguire per intero. È la formulazione operativa della chiusura: se il percorso non è eseguibile da chi non ha mai visto il prodotto, la milestone non è fatta.

| Milestone | Percorso principale eseguito da un estraneo |
|---|---|
| **M1** | Apre prome.app, si registra con la propria email, riceve davvero il codice, compila università e corso, allega un PDF a un post e pubblica; ricarica e ritrova tutto |
| **M2** | Legge cos'è Prome dalla homepage, entra con Google o con Apple, scorre il feed caricando altre pagine, apre un PDF nel dettaglio e lascia un commento |
| **M3** | Installa la build interna, entra con Apple, compila il profilo, sceglie un PDF dai file del telefono, pubblica e commenta |
| **M4** | Crea un'aula, invita un compagno via email, il compagno si registra ed entra comparendo fra i partecipanti; caricano materiali e si scrivono in chat mentre entrambi guardano lo schermo |
| **M5** | Entra nell'aula dal telefono, scrive in chat con chi è sul web, spegne e riaccende la rete e ritrova la conversazione allineata |
| **M6** | Entra in audiochat con altri due da reti diverse, si mutano a vicenda, uno blocca lo schermo del telefono e continua a essere sentito |
| **M7** | Cerca Prome nello store da un telefono che non ha mai avuto l'app, installa, entra e pubblica un post |
| **M8** | Crea un gruppo, invita due compagni, restringe la visibilità dei propri post al gruppo e verifica da un altro account che il post sia sparito anche col link diretto; riceve la notifica di un commento e ci atterra sopra |
| **M9** | Riceve sul telefono la notifica di un invito all'aula, la tocca e si apre l'aula giusta; cambia le impostazioni di privacy dall'app e verifica l'effetto dall'altro account |

Due percorsi meritano una nota, perché sono quelli in cui una chiusura apparente può nascondere un difetto invisibile.

**M6 non è chiusa se l'audio funziona ma non degrada.** Il percorso include il caso in cui il permesso microfono viene negato dal browser o dal sistema, e il caso in cui la capacità audio è indisponibile: in entrambi **l'aula deve restare operativa al 100% nelle funzioni non-audio** — chat, materiali, argomenti, elenco dei partecipanti, moderazione dei permessi — e l'apertura della sala deve riuscire comunque. Un'aula senza canale audio è un'aula in cui un permesso non produce effetto, non un'aula rotta, e questo va **osservato dal vivo** spegnendo il fornitore, non assunto.

**M8 non è chiusa se il post sparisce dal feed ma non dal link diretto.** È il difetto tipico di quest'area: la regola viene applicata sulla query di lista e dimenticata sul dettaglio. Il percorso lo verifica esplicitamente, e i test di visibilità sono scritti **prima** dell'implementazione, perché nessuno si accorge di essere visto da chi non dovrebbe vederlo.

---

### 5. Il cutover, e perché non è una milestone

La dismissione del vecchio sistema — archiviazione del progetto esistente e cancellazione del vecchio database — **non è una milestone**: non consegna nulla a nessuno, e trattarla come tale confonderebbe un atto di smantellamento con un incremento di valore.

È invece una **sequenza obbligata agganciata a M1**, con un ordine che non ammette scorciatoie:

1. il nuovo ambiente è pubblicamente raggiungibile e **verificato con un giro completo registrazione → pubblicazione di un contenuto**;
2. M1 è chiusa secondo tutte le sue condizioni, inclusi ripristino provato e cancellazione dell'account funzionante;
3. la dismissione del vecchio sistema avviene **almeno una settimana dopo** la chiusura di M1, **mai contestualmente**.

La ragione della settimana di distanza è che il cutover è **irreversibile e senza rollback**: il vecchio database viene cancellato e i ~15 account sono persi. Smantellare nello stesso momento in cui si pubblica significherebbe scoprire un ambiente rotto quando non esiste più alcun punto di ritorno — non perché il ritorno sarebbe desiderabile, ma perché la finestra di verifica sarebbe zero.

---

### 6. Effetto delle porte sul contenuto delle milestone

Le porte non spostano milestone: **ne restringono il contenuto**, e sempre quello della milestone in cui vivono.

| Porta | Milestone che apre | Esito negativo: che cosa cambia |
|---|---|---|
| **S-mail** | M1 | L'OTP esce dal perimetro di M1. La milestone resta consegnabile con l'accesso via password, e la registrazione con codice rientra in M2 insieme alle altre modalità di ingresso |
| **S-audio** | M6 | **M6 non viene consegnata**: l'audio esce dal perimetro su entrambi i lati. M5 resta l'aula in tasca in forma testuale, già consegnata e non toccata; M7 perde dalle schede store la motivazione d'uso del permesso microfono e la milestone resta invariata nel resto |
| **S-gruppi** | M8 | M8 viene consegnata con perimetro ridotto sui gruppi; le regole di visibilità e le notifiche restano. M9 si riduce di conseguenza sulla sola parte gruppi |

Due proprietà del piano si leggono in questa tabella e vanno dichiarate.

**Nessun esito negativo aggiunge lavoro.** Le tre porte, chiudendo male, tolgono contenuto: nessuna produce una milestone nuova o un work package da inserire. È la ragione per cui la reazione è sempre riduzione di perimetro e mai aumento di sforzo.

**Nessuna milestone già chiusa viene invalidata da una porta successiva.** M1–M5 non dipendono da S-audio; M1–M7 non dipendono da S-gruppi. È questa proprietà che rende difendibile la collocazione di S-audio dopo cinque milestone consegnate e di S-gruppi dopo sette.

---

### 7. Ciò che il pubblico ha e ciò che non ha, milestone per milestone

È la conseguenza più scomoda dell'apertura anticipata a M1, e va dichiarata invece che scoperta.

| Alla chiusura di | Il prodotto pubblico ha | Il prodotto pubblico **non** ha ancora |
|---|---|---|
| M1 | registrazione, profilo, post con allegato | modalità di accesso alternative, commenti, aule, gruppi, privacy, app |
| M2 | il web completo su post, commenti e accesso | aule, chat, audio, gruppi, privacy, app pubblica |
| M3 | l'app, ma solo per un pubblico ristretto | aule su nessuno dei due lati, gruppi, privacy |
| M4 | aule con ruoli, materiali e chat sul web | aule su app, audio, gruppi, privacy |
| M5 | aule e chat anche in tasca | audio, gruppi, privacy, app installabile da chiunque |
| M6 | l'aula completa, parlata, su entrambi i lati | app installabile da chiunque, gruppi, privacy |
| M7 | l'app ottenibile da chiunque | gruppi e privacy su entrambi i lati, notifiche |
| M8 | gruppi, privacy e notifiche sul web | gruppi, privacy e notifiche nativi su app |
| M9 | parità fra i due lati sul perimetro dichiarato | — |

**Fino a M6 il prodotto pubblico è funzionalmente più povero rispetto a quanto era disponibile in precedenza**: aule, chat e audio arrivano rispettivamente con M4 e M6. È una **conseguenza accettata** dell'apertura pubblica anticipata a M1, non un difetto di pianificazione, e la contropartita è che dalla prima milestone in poi esiste qualcosa di reale che qualcuno può usare, invece di un lavoro invisibile fino alla fine.

La colonna di destra è anche la lista di ciò che va detto a chi arriva, se qualcuno lo chiede. Non esiste in perimetro alcun lavoro di comunicazione o di acquisizione: la trasparenza su cosa manca è un atto di prodotto, non un item del piano.

---

### 8. Condizioni di chiusura comuni a ogni milestone

Valgono per tutte e nove, e nessuna è derogabile per una milestone «piccola»:

1. **tutte le epiche assegnate sono chiuse per intero** — nessuna chiusura parziale, nessun work package lasciato aperto «da sistemare nella prossima»;
2. **il percorso principale di §4 è eseguito da una persona che non ha mai visto il prodotto**, sul proprio dispositivo e senza istruzioni verbali;
3. **il ripristino del database è stato provato** — prima di M1 e ripetuto a ogni milestone che modifichi lo schema;
4. **la cancellazione dell'account è avviabile dall'applicazione e verificata** con esito «nessun record e nessun file residuo» — già in M1 e comunque prima di qualunque apertura al pubblico;
5. **nessun segreto è versionato e l'avvio fallisce se ne manca uno**, verificato rimuovendone uno e osservando il fallimento;
6. **i testi di contorno sono allineati nello stesso rilascio**: se la milestone cambia quali dati si trattano o quali permessi si chiedono, informativa e pagine informative sono aggiornate contestualmente, e dichiarazioni sui dati e motivazione d'uso dei permessi sono aggiornate **prima** di qualunque sottomissione agli store.

La sesta condizione ha un innesto preciso in tre milestone: **M1** (raccolta dei dati di profilo), **M6** (permesso microfono) e **M7** (dichiarazioni sui dati alla prima sottomissione). In M1 rientra anche la dichiarazione, nell'informativa, che **un materiale caricato in aula resta accessibile anche dopo la cancellazione dell'account**, con il solo caricatore anonimizzato: se non è detto prima della raccolta, la promessa di cancellazione e la sopravvivenza del contributo si contraddicono nei fatti.

## Delivery Risks & Mitigations

Un rischio entra in questo registro solo se ha un **trigger osservabile** e un'**azione già decisa**. «Lo teniamo monitorato» non è una mitigazione: è un modo di scrivere che non si è deciso nulla. Ogni voce dichiara che cosa si vede quando il rischio si materializza, quanto costa, e quale azione scatta — senza ulteriore negoziazione al momento in cui scatta.

Il contesto che governa l'intero registro è dichiarato una volta: **una sola persona che decide, paga e sviluppa**, con disponibilità misurata di ~2 ore in 4 settimane, contro un totale atteso di **~226 giorni-persona ideali**. Nessuna mitigazione di questo registro può prevedere l'aggiunta di risorse, perché non esistono risorse da aggiungere. L'unica leva ammessa è la **riduzione di perimetro**.

---

### 1. Regola generale delle porte a timebox

Le tre incognite che dominano la varianza del piano sono contenute da **porte a timebox con esito binario**, e la regola di scadenza è **unica per tutte e tre**:

> **Fallback automatico allo scadere.** Alla fine del timebox, un esito che non sia **nettamente positivo secondo i criteri scritti prima di iniziare** vale come negativo, e il piano B si applica immediatamente. Nessuna estensione, nemmeno parziale. Nessun rinvio del verdetto a valle.

La motivazione è la capacità disponibile e non la disciplina in astratto: **mezza giornata di proroga su una porta costa più in ripresa di contesto che in ore lavorate**. Con due ore a settimana, prolungare uno spike significa spalmarlo su settimane di calendario, durante le quali il lavoro a valle resta fermo e il contesto va ricostruito ogni volta.

Due clausole completano la regola:

- **I criteri di uscita si scrivono prima di iniziare la porta, non durante.** Un criterio formulato mentre lo spike è in corso è un criterio adattato all'esito che si sta osservando;
- **La reazione a un esito negativo è sempre riduzione di perimetro, mai aumento di sforzo.** Nessuna delle tre porte, chiudendo male, produce lavoro nuovo da inserire nella fila. È la proprietà che rende difendibile la loro collocazione a valle di otto, undici e undici posizioni di valore già rilasciate.

---

### 2. Registro dei rischi

| ID | Rischio | Impatto se si materializza | Mitigazione bloccata |
|---|---|---|---|
| **T1** | Audio in tempo reale self-hosted mai gestito prima: primo driver di varianza del piano (l'audio su telefono da solo pesa il **9% della varianza totale**) | **~10 gg**, e cambia di segno l'intera voce audio su entrambi i client | Porta **S-audio, 2,5 gg**, con quattro criteri di uscita numerici e **fallback automatico allo scadere** |
| **T2** | I gruppi non sono mai stati descritti: oggi sono modellati su un'ipotesi (contenitore di utenti con visibilità sui contenuti) | **~12 gg** se si rivelano un secondo spazio sociale con dinamiche proprie | Porta **S-gruppi, 1 gg**, con esito binario e fallback automatico allo scadere: la reazione è **riduzione di perimetro, mai aumento di sforzo** |
| **T3** | Provider email non scelto: senza invio reale non esiste nemmeno la registrazione | **Blocca la prima milestone per intero** | Porta **S-mail, 1 gg**: si adotta **senza ulteriore confronto** il provider che ha funzionato per primo nella prova; se allo scadere nessuno dei due ha funzionato, **l'OTP esce dal perimetro della prima milestone** |
| **X1** | Prima revisione dello store respinta (dichiarazioni sui dati, permesso microfono, account di test) | Slittamento di **1–3 settimane di calendario**, non recuperabile con più ore | **Materiale di revisione predisposto e completo già alla prima sottomissione**: dichiarazioni sui dati, motivazione d'uso scritta del permesso microfono, account di prova funzionante fornito al revisore |
| **X2** | Il nodo audio sfonda il budget infrastrutturale dichiarato | Costo ricorrente non sostenibile dopo il rilascio | È **già un criterio di uscita di S-audio**: il superamento del budget rende lo spike **negativo**, non «da valutare» |
| **C1** | Una sola persona che decide, paga e sviluppa, con disponibilità misurata di ~2 ore in 4 settimane contro un totale atteso di ~226 giorni-persona ideali | Il piano completo **non è consegnabile nel calendario dichiarato**: rischio dominante, **due ordini di grandezza** sopra ogni altro | Nessuna aggiunta di risorse è possibile: l'unica leva ammessa è la **riduzione di perimetro tramite le porte a timebox**, applicata subito e senza negoziazione |
| **C2** | Bus factor 1: qualunque indisponibilità ferma tutto | Sospensione integrale del lavoro | **Non mitigabile con risorse**; registrato come **rischio accettato e dichiarato** |
| **C3** | Cutover irreversibile: archiviazione del vecchio progetto e cancellazione del database, ~15 account persi, **nessun rollback** | Danno non recuperabile se il nuovo ambiente si rivela rotto dopo la pubblicazione | Sequenza obbligata: nuovo ambiente pubblicamente raggiungibile e verificato con un **giro completo registrazione → pubblicazione di un contenuto** prima di qualunque smantellamento; dismissione del vecchio sistema **almeno una settimana dopo** la prima milestone, **mai contestualmente** |
| **C4** | Il target dichiarato di ~100 utenti non è raggiungibile da nessun item del piano: non esiste lavoro di acquisizione in perimetro e «utente» non è definito | Obiettivo mancato **per costruzione, non per esecuzione** | Registrato come **rischio di aspettativa, non di consegna**: va risolto fuori dal piano o riformulato. **Nessun item viene aggiunto per inseguirlo** |

---

### 3. Criteri di uscita di S-audio

Lo spike si chiude **positivo** solo se, entro **2,5 giorni**, sono veri **tutti e quattro** i criteri:

1. **tre o quattro partecipanti si sentono da reti diverse**;
2. **funziona da telefono**;
3. **il costo mensile del nodo resta dentro il budget infrastrutturale dichiarato**;
4. **il riavvio del nodo non richiede intervento manuale ricorrente**.

Se anche uno solo non è verificato allo scadere, l'esito è **negativo** e **l'audio esce dal perimetro**: l'aula resta testuale, che è già consegnabile e utile da sola.

#### Perché questi quattro e non altri

Ogni criterio corrisponde a una condizione che, se non verificata, renderebbe la voce audio insostenibile per una ragione diversa e non compensabile con lavoro aggiuntivo:

- **il primo e il secondo** sono la prova che la capacità funziona nelle condizioni reali d'uso — reti diverse e dispositivo mobile — e non solo su una macchina di sviluppo. Un audio che funziona in laboratorio e non fra tre reti è un audio che non esiste;
- **il terzo** è la traduzione operativa di X2: il superamento del budget rende lo spike **negativo**, non «da valutare». La formulazione è deliberata, perché «da valutare» è precisamente lo stato in cui una decisione si rimanda a valle e il perimetro non si riduce mai;
- **il quarto** discende dall'assenza di presidio dopo il rilascio: un nodo che richiede una mano dopo ogni riavvio è un nodo che resterà fermo, perché nessuno è di guardia. Un guasto silenzioso resta tale finché qualcuno non se ne lamenta.

#### Nessun secondo tentativo dentro lo stesso ciclo

**Non si tenta un secondo fornitore dentro lo stesso ciclo.** Sarebbe un secondo spike non stimato e non protetto da alcun timebox — cioè esattamente la deriva che la regola del fallback automatico esiste per impedire. La ricerca di un'alternativa, se mai avverrà, sarà una decisione nuova con un timebox proprio, presa fuori dalla fila.

#### Che cosa cade con un esito negativo

| Ambito | Effetto |
|---|---|
| Audio su web e su app | **Fuori perimetro**: cadono per intero le due posizioni corrispondenti della fila |
| Aula testuale su web e su app | **Invariata**: già consegnata e non toccata, resta consegnabile e utile |
| Materiale di revisione degli store | Perde la motivazione d'uso del permesso microfono; il resto resta invariato |
| Milestone già chiuse a monte | **Nessuna invalidata**: nessuna di esse dipende dall'esito della porta |

---

### 4. Lettura di C1 — il rischio dominante

C1 non è un rischio come gli altri e va letto separatamente, perché la sua magnitudine è **due ordini di grandezza sopra ogni altra voce** del registro. Tutte le altre voci misurano giorni; C1 misura il rapporto fra un totale atteso di ~226 giorni-persona ideali e una disponibilità storica misurata di ~0,25 giorni-persona in quattro settimane.

Tre conseguenze operative discendono da questa lettura e sono già incorporate nel piano:

- **il perimetro completo non è consegnabile nel calendario dichiarato**, e nessuna riorganizzazione del lavoro lo rende tale. Non è un problema di sequenza né di metodo;
- **la fetta minima è consegnabile**, se trattata come primo rilascio pubblico reale e non come tappa interna. È esattamente la ragione per cui la prima milestone è il primo rilascio realmente pubblico e non una milestone anteriore riservata;
- **le tre porte a timebox sono l'unica leva ammessa**, e vanno applicate **subito e senza negoziazione** quando il loro esito lo impone. Rinviare la riduzione di perimetro alla prossima occasione è il modo in cui C1 si materializza per intero.

Una nota sulla lettura del totale: **i giorni-persona ideali non sono un calendario**. La conversione in date richiede di dividerli per la capacità effettivamente disponibile, e con due client portati avanti da una persona sola «parallelo» significa alternanza, non simultaneità — **il tempo si somma**.

---

### 5. Rischi accettati e dichiarati

Due voci del registro non hanno mitigazione perché **non ne esiste una compatibile con il contesto**. Registrarle senza mitigazione è più onesto che assegnarne una fittizia.

**C2 — Bus factor 1.** Qualunque indisponibilità della singola persona sospende integralmente il lavoro. Non esistono risorse con cui mitigarlo, non esiste ridondanza da costruire, e nessun item del piano può ridurne l'effetto. È accettato e dichiarato.

**C4 — Il target dei ~100 utenti.** Non è raggiungibile da nessun item del piano: non esiste lavoro di acquisizione in perimetro, e la definizione stessa di «utente» — registrato, attivo, ricorrente — non è fissata. È un **rischio di aspettativa, non di consegna**: si risolve riformulando l'obiettivo o portandolo fuori dal piano, e **nessun item viene aggiunto per inseguirlo**. Aggiungere lavoro di acquisizione in un piano già due ordini di grandezza sopra la capacità disponibile peggiorerebbe C1 senza risolvere C4.

---

### 6. Come si sorvegliano i rischi in esercizio

Dopo il primo rilascio pubblico non esiste presidio umano programmato. Le condizioni di allerta che seguono sono la contropartita dovuta: recapitate al titolare sul canale degli avvisi in uscita, con **al massimo un avviso per tipo ogni 6 ore**, perché un canale che sveglia dieci volte per lo stesso guasto è un canale che all'undicesimo guasto viene ignorato.

| Condizione osservabile | Rischio che sorveglia | Azione già decisa |
|---|---|---|
| Minuti-partecipante di audio oltre il **70% del tetto mensile** dichiarato | X2 | Si rinegozia la banda di budget, **mai** gli obblighi di protezione dei dati personali |
| Richiesta di cancellazione oltre il **25° giorno** senza esito totale, oppure verifica del residuo con esito diverso da zero | C3 e obblighi di cancellazione | Intervento immediato: cinque giorni di margine esistono perché un avviso al trentesimo giorno informa di una violazione anziché prevenirla |
| Meccanismo ricorrente senza completamento per **due cicli consecutivi** | Guasto silenzioso in esercizio non presidiato | Verifica del ciclo; i meccanismi lavorano per interrogazione dello stato e non hanno arretrati da recuperare, quindi due cicli mancati indicano un guasto e non un ritardo |
| Fatto divenuto **non consegnabile** dopo i tentativi previsti entro 24 h | Perdita di propagazione | È l'unico caso in cui una mano umana è prevista: non è il percorso normale, è il residuo oltre di esso |

Due precisazioni che delimitano questa tabella. **Le condizioni di allerta non sono un work package**: sono predisposte dentro le epiche che introducono i percorsi corrispondenti, e ogni segnale ha un'asserzione dentro il test di scenario che lo riguarda — se il test passa ma il segnale non è stato emesso, il test fallisce. E **il canale di allerta va provato**: si forza il fallimento di un fornitore in ambiente di prova e si verifica che l'avviso arrivi davvero, perché un canale mai esercitato è un canale che si scopre rotto nel momento in cui serviva.

---

### 7. Punti aperti registrati, non risolti dal piano

Due questioni non sono rischi di consegna e non hanno una mitigazione dentro il piano, ma vanno tenute visibili perché la loro risoluzione appartiene a un'autorità esterna e può modificare il perimetro.

**Segnalazione, blocco fra utenti e rimozione dichiarata.** Sono pretesi dalla revisione degli store per i contenuti generati dagli utenti, e **non esistono nel modello di dominio approvato**: introdurli sarebbe una modifica del modello, non un completamento. Il piano registra il posto vuoto e non lo riempie di propria iniziativa. Se la revisione li richiedesse esplicitamente, l'effetto sul piano è un rilievo bloccante alla prima sottomissione — cioè X1 — con la differenza che in questo caso il rimedio non è materiale mancante ma una decisione che il piano non può prendere.

**Audit trail delle azioni di moderazione.** È legato allo stesso punto aperto: finché non è deciso che cosa esiste in materia di moderazione, non è determinato che cosa andrebbe tracciato. Progettarlo adesso significherebbe registrare i verbi locali del moderatore d'aula e mancare esattamente gli atti per cui un'autorità esterna potrebbe chiederne conto.

---

### 8. Quadro di sintesi

| Rischio | Trigger osservabile | Azione già decisa | Momento in cui si esercita |
|---|---|---|---|
| **T1** audio self-hosted | Uno dei quattro criteri non verificato a 2,5 gg | Audio fuori perimetro, aula testuale | Porta S-audio, nona posizione della fila |
| **T2** gruppi non definiti | Esito non nettamente positivo a 1 gg | Riduzione di perimetro sui gruppi | Porta S-gruppi, dodicesima posizione |
| **T3** provider email | Nessuno dei due ha funzionato a 1 gg | OTP fuori dal perimetro della prima milestone | Porta S-mail, in testa alla fila |
| **X1** revisione respinta | Rilievo del revisore alla prima sottomissione | Materiale completo già predisposto: risposta senza rifare il lavoro | Prima sottomissione, undicesima posizione |
| **X2** budget del nodo audio | Costo mensile fuori banda in prova, oppure oltre il 70% del tetto in esercizio | Criterio di uscita negativo di S-audio; in esercizio, rinegoziazione della banda di budget | Porta S-audio, poi in esercizio |
| **C1** capacità | Permanente e già osservato | Riduzione di perimetro tramite le porte, subito e senza negoziazione | Ogni porta, ogni milestone |
| **C2** bus factor 1 | Indisponibilità della persona | Nessuna: accettato e dichiarato | — |
| **C3** cutover irreversibile | Ambiente nuovo non verificato | Giro completo verificato prima; dismissione almeno una settimana dopo la prima milestone | Chiusura della prima milestone |
| **C4** target ~100 utenti | Permanente e già noto | Nessun item aggiunto: si riformula fuori dal piano | — |

Nessuna voce di questo registro è priva di trigger osservabile, e nessuna è priva di un'azione decisa in anticipo. Le due voci senza mitigazione — C2 e C4 — sono dichiarate tali, e l'assenza di mitigazione è essa stessa la decisione registrata.

## Definition of Done

«Fatto» è **binario e verificabile senza giudizio soggettivo**, su tre livelli: **work package**, **epica**, **milestone**. Ogni livello ha una **lista chiusa** di voci; se anche una sola voce manca, l'elemento **non è fatto** e resta aperto. **Non esiste lo stato «quasi finito»**, e non esiste la formula «chiudo e sistemo dopo» sulle voci dichiarate non derogabili.

I tre livelli sono cumulativi: un'epica è fatta solo se tutti i suoi work package lo sono, una milestone solo se tutte le sue epiche lo sono. Nessun livello può essere saltato perché l'elemento è «piccolo»: con una sola persona che scrive il codice e lo collauda, la lista chiusa è l'unico sostituto della revisione tra pari che qui non esiste.

---

### Livello 1 — Work package

Sei voci. Valgono per ognuno dei 56 work package, qualunque sia il ruolo owner.

| # | Voce | Criterio verificabile |
|---|---|---|
| 1 | **Codice integrato** | Tutto sul ramo principale, nessun ramo residuo aperto sul work package; migrazioni incluse e applicabili **senza finestra sorvegliata** |
| 2 | **Verde automatico** | Build e controllo dei tipi verdi |
| 3 | **Copertura di test obbligatoria** | Test automatici **obbligatori** su autenticazione, caricamento file, permessi e visibilità, cancellazione account. Altrove facoltativi |
| 4 | **Test prima del codice dove il difetto è invisibile** | Quando un difetto non è percepibile da chi ne subisce l'effetto (privacy, permessi, ammissioni), il test è scritto **prima** dell'implementazione |
| 5 | **Nessun simulacro nella prova di chiusura** | Ogni work package che tocca un fornitore esterno (email, file, realtime, audio, notifiche) si chiude **su fornitore reale**, con credenziali e configurazione equivalenti a quelle di esercizio; una prova basata su un finto fornitore **non chiude nulla** |
| 6 | **Segnale osservabile asserito** | Se il work package introduce o modifica un percorso osservato, il segnale corrispondente è emesso e la sua emissione è **asserita dentro un test**, non verificata a occhio |

#### Lettura delle voci che si prestano a interpretazione

**Voce 1 — «senza finestra sorvegliata» è un criterio, non un auspicio.** Una migrazione che richiede presidio umano durante l'applicazione è una migrazione che, in esercizio non presidiato, verrà eseguita male o non verrà eseguita. Il work package che la introduce non è chiuso finché la migrazione non è applicabile all'avvio, in avanti, senza intervento.

**Voce 3 — le quattro aree obbligatorie non sono negoziabili per taglia.** Sono le quattro aree in cui un difetto non produce alcun sintomo per chi lo subisce: chi entra dove non dovrebbe non se ne lamenta, chi è visto da chi non dovrebbe vederlo non lo sa, un file caricato con tipo o dimensione fuori limite non protesta, un residuo dopo la cancellazione non si manifesta. Altrove il collaudo manuale dello sviluppatore è ammesso.

**Voce 4 — l'ordine è la sostanza.** Scrivere il test dopo l'implementazione su un percorso di permesso o di visibilità produce un test che descrive ciò che il codice fa, non ciò che dovrebbe fare. La voce si applica in particolare a E3.2 (permessi d'aula, uno per uno), E6.1–E6.3 (regole di visibilità e contatto), E7.1 (appartenenza e decadenza) e a ogni punto in cui si decide un'ammissione.

**Voce 5 — è la voce che più facilmente si aggira, e per questo è formulata in negativo.** Un OTP che «funziona» contro un finto invio non dimostra che la registrazione funzioni; un caricamento che «funziona» contro un archivio locale non dimostra che la pre-autorizzazione firmata e la regione dichiarata siano configurate; un audio che «funziona» in locale non dimostra nulla dei quattro criteri della porta. La chiusura avviene con il fornitore vero, e questo vale anche quando il work package è piccolo.

**Voce 6 — un segnale non asserito è un segnale che scomparirà.** Rimuovere per errore l'emissione di un segnale non produce alcun sintomo: produce soltanto l'assenza di ciò che serviva ad accorgersi del prossimo guasto. La formulazione operativa è severa e va tenuta ferma: **se il test del percorso passa ma il segnale non è stato emesso, il test fallisce.**

#### Voci che non compaiono, e perché

| Non è voce di chiusura | Ragione |
|---|---|
| Revisione di un secondo sviluppatore | Non esiste un secondo sviluppatore. Il suo posto è preso dalle voci 3, 4 e 6, che sono meccaniche |
| Soglia numerica di copertura | Una percentuale di copertura non distingue le quattro aree obbligatorie dal resto: sposterebbe lo sforzo dove è facile misurare, non dove il difetto è invisibile |
| Documentazione del work package | Il documento di riferimento è l'architettura approvata; una nota per work package sarebbe scritta una volta e non riletta mai |

---

### Livello 2 — Epica

Tutte le voci del Livello 1 su **tutti** i suoi work package, **più** cinque voci proprie.

| # | Voce | Criterio verificabile |
|---|---|---|
| 1 | **Condizioni di esecuzione dell'accettazione** | L'accettazione dell'epica si esegue **per intero**, **con dati reali**, **da un dispositivo diverso dalla macchina di sviluppo**; per le epiche mobile **su hardware fisico**, mai su simulatore o emulatore |
| 2 | **Percorsi infelici** | Almeno **tre** percorsi verificati: **input rifiutato**, **permesso negato**, **dipendenza esterna non disponibile**. Nessuno dei tre produce una schermata bianca o un errore non spiegato |
| 3 | **Degradazione verificata dal vivo** | Se l'epica consuma un fornitore esterno, il fornitore **viene spento** e il comportamento di degradazione previsto **viene osservato realmente**; un comportamento assunto e non provato **non chiude l'epica** |
| 4 | **Una misura di soglia registrata** | Una **singola** misura, **registrata e conservata**, sul percorso che l'epica introduce (apertura dell'aula, decisione di visibilità, comparsa del messaggio agli altri, ingresso dopo l'invito). **Non un piano di carico** |
| 5 | **Testi di contorno allineati** | Se l'epica cambia quali dati si trattano o quali permessi si chiedono: privacy policy e pagine informative aggiornate **nello stesso rilascio**; dichiarazioni sui dati e motivazione d'uso del permesso aggiornate **prima** della sottomissione mobile |

#### Voce 1 — perché il dispositivo diverso è una condizione e non un dettaglio

L'accettazione eseguita sulla macchina di sviluppo verifica un ambiente che nessun utente incontrerà: sessioni già aperte, cache calde, permessi già concessi, rete locale, fornitori già configurati nel terminale. Il difetto che si nasconde lì è sempre lo stesso — qualcosa che funziona perché **quella** macchina ne conserva lo stato.

Per le epiche mobile la condizione si irrigidisce: **hardware fisico**, mai simulatore. Le variazioni che l'epica E11 introduce — audio a schermo bloccato, chiamata in arrivo rifiutata, riconnessione con app in background — e i permessi di sistema di E10.2 e E12.3 non hanno alcuna riproduzione fedele fuori da un telefono vero.

#### Voce 2 — i tre percorsi infelici, uno per famiglia

I tre non sono un minimo generico: sono **una famiglia ciascuno**, e vanno scelti dentro l'epica in esame.

| Famiglia | Che cosa si prova | Esempi dentro le epiche |
|---|---|---|
| **Input rifiutato** | Il dominio dice no a un dato | File oltre il limite di dimensione o di tipo (E0.5, E2.2, E10.2); codice OTP errato o scaduto (E0.2); invito già scaduto (E3.3, E7.1) |
| **Permesso negato** | Il modulo proprietario nega l'azione | Cancellazione di un materiale d'aula da parte di chi non è moderatore (E3.2, E3.5); permesso microfono negato dal browser o dal sistema (E5.3, E11.3); contenuto non visibile per regola di privacy anche col link diretto (E6.2) |
| **Dipendenza esterna non disponibile** | Il fornitore non risponde | Trasporto realtime spento (E4.3); capacità audio indisponibile (E5.3); archivio file irraggiungibile in caricamento (E0.5, E3.5) |

Il criterio di superamento è enunciato in negativo perché è così che si verifica: **nessuno dei tre produce una schermata bianca o un errore non spiegato**. Un messaggio tecnico non tradotto è un errore non spiegato.

#### Voce 3 — la differenza fra degradazione prevista e degradazione provata

È la voce che distingue una promessa da un fatto. Il comportamento di degradazione è già dichiarato per ogni fornitore, ed è questo che va **osservato spegnendo davvero il fornitore**:

| Fornitore spento | Comportamento da osservare |
|---|---|
| Capacità audio | L'apertura dell'aula **riesce**; chat, materiali, argomenti, elenco partecipanti e moderazione dei permessi restano operativi al **100%** |
| Trasporto realtime | Il messaggio è **persistito** e resta leggibile alla riapertura; non compare in tempo reale agli altri |
| Archivio file | Il caricamento fallisce **con errore esplicito**; l'aula e il resto del prodotto restano operativi |
| Canale email | La registrazione o l'invito falliscono con messaggio comprensibile; nessun profilo resta in stato intermedio inutilizzabile |
| Misurazioni d'uso | **Nessun effetto osservabile** sul percorso dell'utente |

La prova ha un valore secondario altrettanto importante: è l'unico modo per accorgersi che una dipendenza **non bloccante è diventata bloccante**, cosa che accade per aggiunta di una singola attesa e non produce alcun sintomo fino al giorno in cui il fornitore è indisponibile.

#### Voce 4 — una misura, non un piano di carico

Si registra **un solo numero per epica**, sul percorso che l'epica introduce, e lo si conserva. Non si costruisce alcuno strumento di carico: con la capacità disponibile, un piano di prestazione sarebbe uno strumento che nessuno rieseguirà, e un numero mai riconfrontato è peggio di nessun numero.

| Epica | Percorso misurato |
|---|---|
| E3 | Apertura dell'aula con partecipanti, argomenti e materiali in una sola risposta composta |
| E4 | Comparsa del messaggio agli altri partecipanti |
| E6 | Risoluzione della decisione di visibilità alla lettura |
| E3 / E7 | Ingresso effettivo dopo l'accettazione dell'invito |
| E2 | Caricamento di una pagina del feed |

La misura è **registrata e conservata** perché serve al confronto alla ripresa successiva sulla stessa area — e le riprese sono previste dalla fila: i post tornano in due posizioni, le aule in quattro.

#### Voce 5 — l'allineamento dei testi è parte dell'epica, non un adempimento successivo

Ha tre innesti precisi:

- **E0** — informativa e base giuridica raggiungibili **prima** della raccolta di nome, cognome, università e corso, e con la dichiarazione che **un materiale caricato in aula resta accessibile anche dopo la cancellazione dell'account**, con il solo caricatore anonimizzato. Se non è detto prima della raccolta, la promessa di cancellazione e la sopravvivenza del contributo si contraddicono nei fatti;
- **E5 ed E11.3** — motivazione d'uso scritta del permesso microfono, che è anche materiale obbligatorio per la revisione degli store;
- **E13.2** — dichiarazioni sui dati allineate a ciò che il prodotto tratta davvero, **predisposte prima della prima sottomissione**, non dopo un rilievo.

#### Difetti residui — la regola che li ammette e il perimetro che li esclude

Un'epica può chiudere **con difetti noti** soltanto se **nessuno di essi rende falsa** l'accettazione (voce 1), i percorsi infelici (voce 2) o la degradazione verificata (voce 3). I difetti residui **vengono registrati**.

**Su queste tre voci non esiste «chiudo e sistemo dopo».** La ragione è che sono precisamente le tre voci il cui fallimento non produce un sintomo immediato: un percorso infelice non provato si manifesta il giorno in cui un utente lo incontra, una degradazione assunta il giorno in cui il fornitore cade. Un difetto cosmetico su una schermata, invece, si vede subito e può attendere.

---

### Livello 3 — Milestone

> **Una milestone è fatta quando è in mano a chi la deve usare, non quando il codice è pronto.**

Cinque voci, tutte non derogabili, e tutte da verificare per ognuna delle nove milestone.

| # | Voce | Criterio verificabile |
|---|---|---|
| 1 | **Epiche complete** | Tutte le epiche assegnate alla milestone sono fatte secondo il Livello 2. **Nessuna chiusura parziale** |
| 2 | **Giro completo da estraneo** | Una persona che **non ha mai visto il prodotto** esegue il percorso principale della milestone **sul proprio dispositivo**, **senza istruzioni verbali** |
| 3 | **Ripristino provato** | Backup del database esistente e ripristino **eseguito almeno una volta**, **prima di M1** e ripetuto **a ogni milestone che modifichi lo schema** |
| 4 | **Uscita dal prodotto funzionante** | La cancellazione dell'account è **avviabile dall'applicazione** e verificata con esito **«nessun record e nessun file residuo»**, già in **M1** e comunque **prima di qualunque apertura al pubblico** |
| 5 | **Segreti fuori dal repository e avvio fail-fast** | Nessun segreto versionato; **l'avvio del servizio fallisce se manca un segreto atteso**, verificato **rimuovendone uno e osservando il fallimento** |

#### Voce 2 — «senza istruzioni verbali» è il criterio, non l'accompagnamento

Il percorso principale di ciascuna milestone è già fissato. La condizione da rispettare è che chi lo esegue **non riceva alcun aiuto a voce**: se serve dire «ora premi lì», il percorso non è chiuso. Chi osserva prende nota e non interviene.

È anche la voce che rende reale l'apertura pubblica a M1: la prima persona che esegue il giro completo di registrazione, onboarding e pubblicazione di un post con PDF non deve essere la stessa che ha scritto il codice.

#### Voce 3 — il ripristino si esegue, non si configura

Un backup configurato e mai ripristinato è un backup di cui non si conosce lo stato. La voce chiede l'**esecuzione** del ripristino, almeno una volta prima della prima milestone, e la ripetizione a ogni milestone che tocchi lo schema — cioè, nella fila bloccata, ogni volta che un'epica introduce nuovi aggregati o nuove colonne.

Rientra nella verifica anche la conseguenza dichiarata dall'architettura: **dopo un ripristino il registro delle cancellazioni è ri-applicato prima del rientro in servizio**, e la ri-applicazione è automatica e parte della procedura. Un ripristino che riporta in vita dati già eliminati, seguito da una ri-applicazione dimenticata, è una violazione prodotta dalla procedura di ripristino stessa.

La voce ha inoltre un rapporto diretto con il cutover irreversibile: il vecchio database viene cancellato senza rollback, e la sola rete di protezione che resta è quella del nuovo ambiente.

#### Voce 4 — perché l'uscita è condizione della prima milestone e non di una successiva

La cancellazione dell'account non è una funzione da aggiungere quando arriverà l'app: è **la contropartita dell'apertura al pubblico**. Dal momento in cui una persona reale può registrarsi su prome.app, deve poter uscire, e l'uscita deve essere **avviabile dall'applicazione** — non per email, non chiedendo a qualcuno.

L'esito richiesto è formulato in modo da non ammettere verifiche parziali: **nessun record e nessun file residuo**. La scansione di verifica deve coprire l'elenco censito al completo — i quattro schemi di dominio, le copie locali del riferimento utente, le tabelle dei fatti in uscita, il registro stesso e l'archivio dei file — e il suo esito va **registrato**. Una verifica parziale che riporta zero è indistinguibile da una totale, se nessuno confronta l'elenco.

Due conseguenze già dichiarate vanno onorate dalla verifica e non trattate come anomalie: **post, commenti e messaggi restano anonimizzati** anziché eliminati, e **il file di un materiale d'aula resta conservato** con il solo caricatore anonimizzato. L'esito «zero» si riferisce a ciò che è **riconducibile all'utente**, non ai contributi che sopravvivono per scelta dichiarata.

#### Voce 5 — il fallimento all'avvio si prova togliendo un segreto

Non basta che i segreti siano fuori dal repository: va verificato che **l'assenza di un segreto atteso fermi l'avvio**, rimuovendone uno e osservando il fallimento. Un'applicazione che parte con una credenziale mancante e degrada in silenzio produce, in esercizio non presidiato, un comportamento anomalo che si manifesta settimane dopo e che nessuno correla alla causa.

---

### Applicazione della lista alle nove milestone

Le cinque voci del Livello 3 valgono per tutte. La tabella indica dove ciascuna richiede lavoro reale e non una semplice conferma.

| Milestone | Voce 3 — ripristino | Voce 4 — uscita | Voce 5 — segreti | Voce 2 — nota sul giro da estraneo |
|---|---|---|---|---|
| **M1** | **Prima esecuzione obbligatoria** | **Prima verifica obbligatoria** | Prima verifica con rimozione | Registrazione, profilo, post con PDF su dispositivo altrui |
| **M2** | Ripetuto (schema modificato) | Riverificata | Confermata | Ingresso con provider esterno da un secondo telefono |
| **M3** | Non modificato | Riverificata **dall'app** | Confermata | Installazione della build interna da zero |
| **M4** | Ripetuto (schema modificato) | Riverificata sui nuovi aggregati | Confermata | Due persone reali, invito via email vero |
| **M5** | Non modificato | Riverificata | Confermata | Chat fra telefono e web, rete spenta e riaccesa |
| **M6** | Non modificato | Riverificata | Confermata | Tre reti diverse, hardware fisico |
| **M7** | Non modificato | Riverificata **prima della sottomissione** | Confermata | Ricerca e installazione dallo store da un telefono vergine |
| **M8** | Ripetuto (schema modificato) | Riverificata sui gruppi | Confermata | Verifica della visibilità **anche col link diretto** |
| **M9** | Non modificato | Riverificata | Confermata | Notifica toccata che apre il contenuto giusto |

Due righe meritano attenzione. **In M3 la voce 4 cambia superficie**: l'uscita dal prodotto deve essere avviabile **dall'app**, non solo dal web, ed è una condizione che precede qualunque sottomissione. **In M8 il giro da estraneo include il link diretto**, perché è lì che vive il difetto tipico dell'area: la regola applicata alla lista e dimenticata sul dettaglio.

---

### Rapporto fra la lista e le porte a timebox

Le porte hanno **criteri di uscita propri**, e questa lista **non li sostituisce né li allenta**.

- **Una porta non è un work package** e non si chiude secondo il Livello 1: si chiude secondo i propri criteri, scritti prima di iniziare, con fallback automatico allo scadere;
- **L'epica che una porta condiziona resta soggetta al Livello 2 per intero.** Un esito positivo della porta sull'audio non esime E5 dalla degradazione verificata dal vivo: anzi, è precisamente l'epica in cui spegnere il fornitore e osservare che l'aula resta operativa al 100% nelle funzioni non-audio;
- **Un esito negativo riduce il perimetro, non la lista.** Se l'audio esce, cadono le epiche corrispondenti; le epiche che restano si chiudono con le stesse cinque voci di prima. Nessuna voce viene derogata perché il perimetro si è ristretto.

---

### Quadro di sintesi

| Livello | Numero di voci | Chi verifica | Che cosa impedisce |
|---|---|---|---|
| **Work package** | 6 | Chi ha scritto il codice, con verifiche meccaniche | Che un'unità di assegnazione si dica chiusa mentre resta un ramo aperto, un fornitore simulato o un segnale non asserito |
| **Epica** | 6 del Livello 1 su ogni WP + 5 proprie | Chi ha scritto il codice, su un dispositivo che non è il suo ambiente | Che un valore osservabile si dica consegnato senza essere stato provato con dati reali, nei percorsi infelici e con il fornitore spento |
| **Milestone** | Tutte le voci del Livello 2 su ogni epica + 5 proprie | Una persona estranea al prodotto, per la voce 2 | Che un incremento si dica rilasciato quando è pronto il codice anziché quando è in mano a chi lo deve usare |

Nessuna voce di questa sezione è priva di un criterio verificabile, e nessuna richiede un giudizio su quanto qualcosa sia «sufficientemente» finito. È la stessa disciplina applicata ai confini dei moduli e agli schemi dei dati, dovuta per la stessa ragione: **in un prodotto costruito e collaudato da una sola persona ed esercitato senza presidio, ciò che non è verificato meccanicamente si erode senza produrre alcun sintomo** — fino al giorno in cui il sintomo è una persona che si lamenta.

## Appendice — trace link

| Da | Relazione | A |
|---|---|---|
| documento | derives_from | architecture_doc v1 |
| documento | derives_from | estimate v1 |
