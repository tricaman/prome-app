---
artifact: "architecture_doc"
title: "Architecture Doc"
project: "Prome"
client: "Myself"
version: 1
status: "approved"
created_at: "2026-08-09T17:15:01.663Z"
approved_at: "2026-08-09T17:17:05.079Z"
stage: "architecture"
attempt: 1
run_id: "7375a928-1c04-4bac-9692-05d5f8c7decd"
version_id: "66d276b4-bb90-4927-86e5-71f2c5b1515f"
generated_by: "documento generato da donumAI — le modifiche si fanno nella pipeline, non in questo file"
---

# Architecture Doc

## Constraints

Un vincolo, in questo documento, è una regola posta da **qualcuno esterno al team che costruisce**, che può dire *no* a una scelta architetturale. Tutto ciò che il team decide da sé — per quanto stringente — non è un vincolo: è una condizione auto-imposta, e come tale è rinegoziabile senza chiedere il permesso a nessuno. Le soglie misurabili (percentili di latenza, finestre di coerenza, disponibilità) non compaiono qui: sono scenari di qualità, trattati nella sezione dedicata.

Ogni voce dichiara **owner** (un ruolo identificabile), **forza vincolante** (hard / soft / assumed) e **ciò che esclude concretamente** dallo spazio delle soluzioni. Un vincolo che non esclude nulla non è un vincolo: è un auspicio.

### 1. Autorità esterne riconosciute

Solo due autorità fuori dal perimetro di chi costruisce hanno potere di veto su questo progetto:

| Autorità | Ruolo | Vincoli di cui è owner |
|---|---|---|
| **Autorità di controllo** (Garante per la protezione dei dati personali) | Vigila sul trattamento dei dati personali degli Utenti | V1, V2, V3, V5 |
| **Team di revisione degli store mobili** (App Review Team, team policy di Google Play) | Autorizza la pubblicazione di ogni release dell'app mobile | V4 |

Nessun ente finanziatore, nessuna commissione accademica, nessun ateneo, nessun partner commerciale ha potere di veto. **Committente, costruttore ed esercente coincidono nella stessa persona**: di conseguenza tutto ciò che non ha per owner una delle due autorità sopra è registrato come condizione **auto-imposta** o **assunta**, e mai come vincolo hard. Questa disciplina è deliberata: confondere una preferenza propria con un obbligo esterno produce un'architettura difesa contro un avversario che non esiste.

### 2. Vincoli hard

#### V1 — Trattamento conforme al GDPR di tutti i dati personali del prodotto

**Owner:** Autorità di controllo · **Forza:** hard

Rientrano nel perimetro: nome, cognome, `Università`, `CorsoUniversitario` del `Profilo`; `Post`, `Commento` e i loro `Allegato`; i messaggi di Chat testuale di Gruppo e di Aula studio; l'`AllegatoDiAulaStudio`; il flusso di Audiochat in transito.

**Esclude concretamente:**

- ogni **archivio append-only immutabile** per i contenuti dell'Utente — è la ragione formale per cui l'event sourcing non è disponibile come opzione di persistenza, indipendentemente dai suoi meriti;
- ogni **replica di dati personali priva di un percorso di cancellazione che la raggiunga**: copie locali del `RiferimentoUtente`, payload dei fatti E1–E6 che trasportano nome e affiliazione, righe di log, backup;
- il **consumo di un fornitore che tocca dati personali senza accordo sul trattamento**;
- l'**invio ad analytics di identificatori riconducibili all'Utente senza base giuridica**. La relazione con analytics è dichiarata **conformist** dalla Context Map — non esiste porta di traduzione che possa filtrare ciò che esce — quindi **l'unico punto di controllo residuo è la selezione del fornitore**. È il motivo per cui nessun prodotto di analisi d'uso entra nello stack con questa decisione.

#### V2 — Informativa e base giuridica presenti prima della raccolta dei dati di Onboarding

**Owner:** Autorità di controllo · **Forza:** hard

L'informativa e la base giuridica devono essere disponibili **prima** che nome, cognome, `Università` e `CorsoUniversitario` vengano raccolti.

**Esclude concretamente:** qualunque flusso in cui la raccolta dei dati di Onboarding non possa essere rifiutata senza rompere il modello. Ne discende un requisito strutturale già coerente con P1 e IP1: **il `Profilo` deve poter esistere con `StatoOnboarding` non completato**, e le `ImpostazioniDiPrivacy` devono esistere con default restrittivo fin dal primo istante. Un modello che esigesse i quattro dati per costruire il `Profilo` sarebbe in violazione diretta.

#### V3 — `data_residency = eu-only`

**Owner:** Autorità di controllo · **Forza:** hard

Tutti i dati personali — `Profilo`, `Post`, `Commento`, `Allegato`, `AllegatoDiAulaStudio`, messaggi di Chat testuale, flusso di Audiochat — **risiedono e transitano su infrastrutture con regione UE dichiarata**.

**Esclude concretamente:**

- ogni fornitore di **archiviazione file, trasporto in tempo reale, notifica push, invio email o analytics privo di regione UE selezionabile**;
- l'**instradamento del flusso di Audiochat su nodi non-UE**, anche transitorio;
- i **piani gratuiti o economici che non permettono di scegliere la regione**. Questa esclusione è la più onerosa nei fatti, perché entra in tensione diretta con la banda di budget dichiarata (§4).

#### V4 — Ogni release dell'app mobile passa da revisione degli store

**Owner:** Team di revisione dello store · **Forza:** hard

Ogni pubblicazione dell'app mobile è soggetta a revisione e deve rispettare le policy di entrambe le piattaforme.

**Esclude concretamente:**

- il **deploy continuo lato app** e qualunque architettura che richieda **cambiamenti sincroni e coordinati fra backend e client**: il backend deve reggere versioni di app diverse in contemporanea;
- **contenuti generati dagli Utenti senza segnalazione, blocco fra Utenti e rimozione dichiarata**. I contenuti in questione sono `Post`, `Commento`, messaggi di Chat testuale, `Allegato`, `AllegatoDiAulaStudio` e Audiochat; **la sola moderazione locale del Moderatore dello spazio non basta**, perché i cinque verbi del Moderatore (invitare, rimuovere, promuovere, concedere, revocare) sono per decisione esplicita locali allo spazio;
- l'**eliminazione dell'account avviabile solo fuori dall'app**;
- l'**attivazione implicita del permesso microfono** per l'Audiochat, senza dichiarazione d'uso;
- **meccanismi di notifica push propri su iOS**, dove il trasporto è imposto dalla piattaforma.

#### V5 — Eliminazione dell'account entro 30 giorni, con discriminatore per tipo di contenuto

**Owner:** Autorità di controllo · **Forza:** hard · **`deletion_deadline` = 30 giorni**

Alla richiesta di eliminazione dell'account: i contenuti che non possono essere eliminati senza danneggiare il contributo altrui sono **anonimizzati**, tutti gli altri dati personali sono **eliminati**, entro **30 giorni dalla richiesta**. Il discriminatore è **il tipo di contenuto**, non la presenza effettiva di interazione: si decide guardando l'aggregato, non contando i Commenti ricevuti.

**Sorte per tipo di contenuto:**

| Aggregato | Sorte |
|---|---|
| `Profilo`, `ImpostazioniDiPrivacy` | eliminati |
| `InvitoAlGruppo`, `Invito` (lato destinatario) | eliminati |
| `Membro`, `Partecipante` | rimossi dagli insiemi, onorando G2 e AS2 sull'ultimo Moderatore |
| `Post`, `Commento` | anonimizzati: restano, autore staccato |
| `MessaggioDiChat` di Gruppo e di Aula studio | anonimizzati |
| `AllegatoDiAulaStudio` | `CaricatoDa` anonimizzato, **file conservato** |
| `Allegato` del Post | segue il Post: conservato se il Post è anonimizzato |

**Esclude concretamente:**

- che **qualunque copia o replica dei dati personali, o qualunque file archiviato, sia privo di un percorso che lo raggiunga entro il termine** — anche quando il fatto di dominio che ne trasportava il riferimento è già stato consegnato e consumato;
- **backup di durata indefinita e non purgabili**;
- un'**anonimizzazione reversibile**, cioè la conservazione di una mappa identificatore → pseudonimo: sarebbe pseudonimizzazione, non cancellazione;
- un **percorso di eliminazione dell'account non avviabile dall'app** (esclusione condivisa con V4, per owner diversi).

### 3. Condizioni assunte (`assumed`)

Non sono fatti verificati: sono premesse su cui l'architettura poggia. Ciascuna ha un **owner del rischio** — il ruolo che diventerebbe autorità esterna se la premessa cadesse — e un rischio registrato. Non vanno presentate a nessuno come garanzie.

| ID | Condizione assunta | Owner se cade | Rischio |
|---|---|---|---|
| **A1** | Gli Utenti sono maggiorenni: Registrazione self-service, nessuna verifica dell'età | Autorità di controllo | **R1** — con minori sotto soglia servirebbe consenso genitoriale verificabile e scatterebbero le policy degli store sui contenuti generati dagli utenti accessibili ai minori: cadrebbe la Registrazione self-service e V4 si aggraverebbe |
| **A2** | `Università` **autodichiarata** in Onboarding: nessun accordo con atenei, nessuna verifica, nessun sistema universitario da integrare | Ufficio IT / segreteria d'ateneo | **R2** — la `Visibilità` **Ateneo** (G5, AS7) decide l'ammissione su un dato non verificato: chiunque può dichiararsi di qualunque ateneo. Se un ateneo pretendesse verifica, comparirebbe un owner esterno oggi inesistente |
| **A3** | L'**Audiochat non viene registrata né conservata**: solo transito | Autorità di controllo | **R3** — l'attivazione della registrazione farebbe scattare consenso e conservazione e introdurrebbe nel core l'audio persistito, che AS8 esclude |
| **A4** | Le sei capacità generic sono consumate ai **soli termini standard del fornitore** (`vendor_guarantees = vendor-terms-only`): nessuno SLA contrattuale, quote e limiti modificabili unilateralmente, nessun rimedio in caso di interruzione | Fornitore del servizio | **R4** — un fornitore può cambiare quote o chiudere il piano senza preavviso. *Esclude* che il prodotto assuma verso gli Utenti garanzie di disponibilità o di consegna dei messaggi non offerte dai termini sottoscritti |
| **A6** | Nessun ente finanziatore, bando, relatore o commissione impone una data o una tecnologia | — | **R6** — se esistesse, `deadline` diventerebbe hard e parte delle scelte tecniche sarebbe imposta anziché scelta |

### 4. Valori quantificati e loro forza

| Chiave | Valore | Forza | Owner |
|---|---|---|---|
| `team_size` | 1 | fatto di contesto | — |
| `deadline` | 4 settimane, capacità ~2 ore a settimana | **soft** | nessuno esterno: condizione auto-imposta; uno slittamento non produce nulla di irreversibile |
| `budget_band` | `minimal` — fino a poche decine di euro al mese, spesa ricorrente accettata consapevolmente | **assumed** | titolare del budget |
| `maintenance_mode` | `unattended` — nessun presidio umano programmato dopo il rilascio | **assumed** | responsabile dell'esercizio |
| `data_residency` | `eu-only` | **hard** (V3) | Autorità di controllo |
| `vendor_guarantees` | `vendor-terms-only` | **assumed** (A4) | Fornitore del servizio |
| `deletion_deadline` | 30 giorni | **hard** (V5) | Autorità di controllo |
| `deployment_model` | non valorizzato in questo punto | — | — |

Tre note che qualificano la tabella:

- **`budget_band` esclude** l'adozione di una capacità con costo per minuto di Audiochat non prevedibile e privo di tetto di spesa impostabile. **R7**: superata la soglia, si rinegozia la banda di budget, **mai V3**. L'ordine di precedenza è dichiarato una volta e vale ovunque.
- **`maintenance_mode = unattended`** ha come rischio registrato **R8**: un guasto silenzioso resta tale finché un Utente non se ne lamenta. È la ragione per cui l'osservabilità e le allerte non sono un ornamento ma una contropartita dovuta.
- **`data_residency` ha rischio R9**: la selezione di regione UE è spesso funzione dei piani a pagamento. R9 è il punto esatto in cui V3 (hard, owner esterno) preme su `budget_band` (assumed, owner interno), e la risoluzione è già scritta in R7.

### 5. Unione di tutto ciò che è escluso

Elenco unificato delle esclusioni derivanti dai vincoli, dalle condizioni assunte e dagli scenari di qualità già bloccati. Nessuna decisione successiva di questo documento può contraddirlo.

1. Archivio immutabile / append-only per i contenuti dell'Utente.
2. Repliche di dati personali prive di un percorso di cancellazione o anonimizzazione che le raggiunga entro 30 giorni, file archiviati inclusi.
3. Fornitori che toccano dati personali senza accordo sul trattamento.
4. Fornitori di archiviazione, trasporto in tempo reale, push, email o analytics privi di regione UE dichiarata, e piani che non permettono di scegliere la regione; instradamento dell'Audiochat su nodi non-UE.
5. Invio ad analytics di identificatori riconducibili all'Utente senza base giuridica.
6. Raccolta dei dati di Onboarding prima di informativa e base giuridica; flusso che non ammette il rifiuto della raccolta.
7. Componenti che richiedono riavvio o intervento manuale per riprendersi da un guasto.
8. Meccanismi ricorrenti — scadenza a 7 giorni degli Inviti (`InvitoAlGruppoScaduto`, `InvitoAllAulaStudioScaduto`), riconciliazione degli orfani (`ElementiOrfaniDiAulaStudioRimossi`) — che, saltando un ciclo, non recuperano da soli al ciclo successivo.
9. Dipendenza delle finestre di coerenza differita **E1–E6**, e in particolare di **E2**, da una consegna priva di ritentativo.
10. Migrazioni di dati che richiedano una finestra sorvegliata.
11. Capacità con costo per minuto di Audiochat non prevedibile e privo di tetto di spesa impostabile.
12. Garanzie di disponibilità o di consegna assunte oltre quanto offerto dai termini sottoscritti.
13. Deploy continuo lato app e cambiamenti che richiedano allineamento sincrono fra backend e client.
14. Contenuti generati dagli Utenti senza segnalazione, blocco fra Utenti e rimozione dichiarata.
15. Eliminazione dell'account non avviabile dall'app.
16. Attivazione implicita del permesso microfono per l'Audiochat.
17. Meccanismi di notifica push propri su iOS.
18. Backup di durata indefinita e non purgabili.
19. Anonimizzazione reversibile.

Le esclusioni 7–10 hanno owner interno (responsabile dell'esercizio) e discendono da `maintenance_mode = unattended`: sono auto-imposte, ma vincolano l'architettura esattamente quanto le altre, perché la loro violazione produce un guasto che nessuno vedrà.

### 6. Conflitti aperti, portati al gate

**Nessun conflitto fra vincoli hard.** V1, V2, V3 e V5 hanno lo stesso owner e non si contraddicono fra loro; V4 ha owner diverso e non collide con essi — l'unica sovrapposizione (eliminazione dell'account avviabile dall'app) è una coincidenza di richiesta, non un conflitto.

Restano **due conflitti fra un vincolo hard e il modello di dominio approvato**. Nessuno dei due è risolvibile da chi costruisce, perché in entrambi i casi le autorità in gioco sono due e nessuna delle due è il team.

#### R10 — V4 contro il modello di dominio

V4 pretende **segnalazione, blocco fra Utenti e rimozione dichiarata** per i contenuti generati dagli Utenti. Il modello di dominio approvato **non contiene né segnalazione né blocco**, e i cinque verbi del Moderatore sono locali allo spazio per decisione esplicita (AS6, ruolo di Moderatore non trasferibile e non derivabile). Colmare la lacuna significa introdurre concetti che il linguaggio ubiquo non ha, quindi modificare il modello.

**Autorità:** *team di revisione dello store* e *proprietario del modello di dominio approvato*. Conseguenza già registrata: segnalazione e blocco **restano fuori dal contratto verso il client** finché il gate non decide, e l'audit trail delle azioni di moderazione resta un punto aperto legato a questo conflitto.

#### R12 — V5 contro gli invarianti di immutabilità

L'anonimizzazione richiesta da V5 impone di **sostituire l'identificatore dell'autore in contenuti dichiarati immutabili**: `B2` (autore del Post obbligatorio e immutabile), `C2` (autore del Commento), `AL2` (`CaricatoDa` immutabile), `MG1` e `MA1` (messaggi immutabili dopo l'invio). Vi rientra una conseguenza che va dichiarata e non nascosta: un `AllegatoDiAulaStudio` caricato da chi ha cancellato l'account **resta accessibile**, con il solo `CaricatoDa` anonimizzato. Se questo non è dichiarato nell'informativa, **V5 e V2 si contraddicono nei fatti**: l'Utente avrebbe chiesto l'eliminazione senza sapere che parte del suo contributo sopravvive.

**Autorità:** *Autorità di controllo* e *proprietario del modello di dominio approvato*.

#### R11 — tensione registrata, non conflitto

L'esclusione 13 (nessun deploy continuo lato app) è in tensione con `maintenance_mode = unattended`: una correzione urgente lato app richiede **giorni di revisione**, durante i quali nessun presidio umano può accorciare il tempo di ripristino. **Owner:** team di revisione dello store. Non è portata al gate come conflitto perché non richiede una decisione: richiede che l'architettura mantenga la capacità di correggere **lato backend** ciò che non si può correggere lato client in tempo utile.

## Quality Characteristics

Le caratteristiche di qualità di questo documento non sono un elenco di virtù desiderabili: sono **cinque caratteristiche selezionate su nove** della ISO/IEC 25010:2023, ciascuna agganciata a un rischio identificato, e tradotte in **scenari misurabili** con una misura di risposta numerica. Ciò che non è misurabile non compare qui; ciò che è già garantito da un invariante di dominio non viene ripetuto come scenario.

La distinzione con la sezione precedente è netta e va tenuta ferma: un **vincolo** è una regola posta da un'autorità esterna e non ha soglia numerica; uno **scenario di qualità** ha una soglia numerica e nessun potere di veto esterno. La catena di eliminazione dei dati compare in entrambe le sezioni perché ha due facce distinte — il termine di 30 giorni è imposto dall'Autorità di controllo (V5, hard), mentre *come si verifica che il residuo sia zero* è uno scenario (**SE3**), con una misura di risposta che il team sceglie e deve poter dimostrare.

### 1. Caratteristiche selezionate e rischio di origine

| Caratteristica | Ruolo | Rischio di origine |
|---|---|---|
| **security** | **driving** | Obblighi esterni di protezione dei dati personali con potere di veto (V1–V3, V5); l'espulsione dal Gruppo e le decisioni di autorizzazione sono invarianti già bloccati del dominio (E2, IA4, IP1–IP4) |
| **reliability** | — | Nessun presidio umano (`maintenance_mode = unattended`) sui meccanismi ricorrenti — scadenza degli Inviti a 7 giorni, riconciliazione degli elementi orfani — e sulla propagazione dei fatti E1–E6 |
| **performance_efficiency** | — | Le due classi di finestre di coerenza differita dichiarate dagli invarianti ("pochi secondi", "pochi minuti") vanno rese numeriche e verificabili con percentile, altrimenti non sono verificabili affatto |
| **compatibility** | — | Backend e client mobile evolvono con tempi strutturalmente disallineati (V4, revisione degli store): le versioni devono convivere |
| **maintainability** | — | Cambiamento atteso a 12 mesi già dichiarato dalla Context Map: sostituire la capacità generic di Audiochat senza toccare il modello del core Aula studio |

#### Perché **security** è l'unica caratteristica driving — test di rimozione

Il criterio applicato è il **test di rimozione**: si immagina che la forza che origina la caratteristica sparisca domani, e si misura quanta parte dell'architettura andrebbe ridisegnata.

Se gli obblighi di protezione dei dati personali sparissero, cambierebbero **quattro cose contemporaneamente**:

1. il **trattamento dei contenuti nel tempo** — cadrebbe l'esclusione dell'archivio append-only, e con essa la ragione formale per cui l'event sourcing non è disponibile come opzione di persistenza;
2. il **modo in cui le decisioni di privacy sono risolte** — le interrogazioni sincrone a Profilo (IP1–IP4) potrebbero diventare copie propagate, con tutto ciò che ne consegue sulla forma delle dipendenze;
3. i **criteri di selezione delle dipendenze esterne** — cadrebbe il filtro della regione UE dichiarata, che oggi restringe l'insieme dei fornitori disponibili più di qualunque altro criterio;
4. l'**intera catena di eliminazione dei dati** — un componente trasversale che oggi esiste solo per questa ragione.

Nessuna delle altre quattro caratteristiche supera il test con la stessa ampiezza. Se cadesse `unattended`, cambierebbero le allerte e non la struttura; se cadesse la revisione degli store, cambierebbe la politica di versione e non il grafo delle dipendenze; se sparisse il cambiamento atteso sull'Audiochat, resterebbe comunque sensato tenerla dietro una porta. Perciò **security è driving e le altre quattro no**, e la conseguenza operativa è dichiarata: quando due caratteristiche entrano in tensione, si sacrifica l'altra, mai security.

#### Caratteristiche escluse deliberatamente

| Esclusa | Motivo dell'esclusione |
|---|---|
| `functional_suitability` | È già coperta dagli invarianti di dominio bloccati (P1–P3, B1–B6, G1–G5, AS1–AS9, …). Uno scenario di qualità qui non aggiungerebbe nulla di misurabile: ripeterebbe in forma più debole ciò che l'aggregato garantisce al commit |
| `flexibility` | La banda di capacità di riferimento (§2) è fissa e **non è stato raccolto alcuno scenario di crescita oltre di essa**. Scrivere uno scenario di scalabilità significherebbe inventare un carico che nessuna evidenza suggerisce |
| `interaction_capability` | Nessuna evidenza raccolta sull'interazione: l'unica evidenza del progetto riguarda il comportamento di studio osservato negli strumenti generalisti, non l'uso dell'interfaccia |
| `safety` | Nessun rischio di danno fisico: il prodotto ospita Post, Commenti, materiale di studio e conversazioni |

L'esclusione non è una svalutazione: è la conseguenza di `team_size = 1` e di ~2 ore a settimana. Uno scenario che nessuno misurerà è peggio di uno scenario assente, perché dà l'illusione che qualcosa sia sotto controllo.

### 2. Banda di capacità di riferimento

Tutti i percentili e tutte le soglie degli scenari che seguono **si intendono misurati entro questa banda**. Fuori dalla banda, gli scenari non sono violati: sono semplicemente fuori dal loro dominio di validità, e si applica la regola di rinegoziazione di PE4.

| Grandezza | Valore |
|---|---|
| Utenti registrati | **≤ 500** |
| Aule studio simultanee | **≤ 10** |
| Partecipanti per Aula studio | **≤ 15** |
| Audiochat | **≤ 3.000 minuti-partecipante/mese** |
| Soglia di allerta sull'Audiochat | **2.100 minuti-partecipante/mese** (70% del tetto) |
| Headroom tollerato prima della rinegoziazione | **+30%** sui valori sopra |
| Picco | **non annunciato** |

**Origine dei numeri: obiettivo di progetto dichiarato, non misura di traffico atteso.** La distinzione è vincolante per la lettura dell'intero documento. Nessuna di queste cifre deriva da un'osservazione: sono la dimensione entro cui il prodotto vuole funzionare, non la dimensione che si prevede di raggiungere. Dedurne che il sistema *avrà* 500 Utenti sarebbe un errore di lettura; dedurne che il sistema **non è progettato oltre 500 Utenti** è invece esattamente ciò che la banda dice.

La voce «picco non annunciato» ha una conseguenza precisa: non esiste un evento noto (una sessione d'esame, un lancio) verso cui dimensionare in anticipo, quindi il carico si affronta per soglie osservate e non per preparazione mirata.

### 3. Scenari — security (driving)

| ID | Scenario | Misura di risposta | Importanza | Difficoltà |
|---|---|---|---|---|
| **SE1** | Un Utente perde l'appartenenza a un Gruppo mentre è dentro un'Aula studio collocata, con Audiochat attiva | Rimozione dai Partecipanti e chiusura dell'accesso ad Audiochat e Chat testuale entro **p95 ≤ 5 s** e **p99 ≤ 15 s** dall'accadimento del fatto; **0 ammissioni indebite** ai tentativi di ingresso successivi | **H** | **H** |
| **SE2** | Un Utente restringe chi può vedere i suoi contenuti; subito dopo un altro Utente apre la Bacheca | La nuova regola è applicata alla lettura successiva; risoluzione della decisione di visibilità **p95 ≤ 300 ms**; **0 finestre di visibilità indebita** | **H** | **M** |
| **SE3** | Un Utente chiede l'eliminazione dell'account | Completamento entro **≤ 30 giorni**; residuo verificato **= 0 record** e **= 0 file** riconducibili all'Utente; **≥ 1** esecuzione di verifica con esito totale prima della scadenza | **H** | **H** |

#### SE1 — l'asimmetria fra ingresso e uscita

SE1 è la traduzione numerica di **E2**, che gli invarianti dichiarano nella classe «pochi secondi». Lo scenario ha **due misure di risposta di natura diversa**, e la differenza non è un dettaglio di enunciato:

- **0 ammissioni indebite** è una misura *senza finestra temporale*, e lo è perché IA4 valuta il titolo di ammissione **su dato fresco all'ingresso**: chi chiede di entrare chiede adesso, la risposta è immediata, e non c'è alcuna propagazione da attendere. Il numero è zero perché la finestra è zero;
- **p95 ≤ 5 s / p99 ≤ 15 s** riguarda il solo **verso dell'uscita**: chi è già dentro l'incontro non farà alcuna nuova richiesta, sta ascoltando l'Audiochat e leggendo la Chat testuale, e l'unico modo per raggiungerlo è che l'informazione gli venga incontro.

I 5 secondi non sono un numero arbitrario: sono il tempo entro cui l'allontanamento è ancora percepito come **conseguenza della rimozione dal Gruppo**, e non come un evento inspiegabile. Oltre quella soglia lo stesso comportamento corretto diventa indistinguibile da un guasto.

Difficoltà **H** perché è l'unico scenario in cui una decisione presa in un contesto deve produrre un effetto in un altro entro pochi secondi, attraversando un anti-corruption layer che traduce `MembroRimossoDalGruppo` in un Partecipante rimosso per causa «decaduta l'appartenenza al Gruppo» — senza che la parola Membro entri nel core.

#### SE2 — perché la decisione di privacy non si propaga

SE2 misura ciò che IP1–IP4 e B5 hanno già deciso: il `Post` non porta alcun attributo di visibilità, e chi lo vede discende dalle `ImpostazioniDiPrivacy` dell'autore **lette al momento della lettura**. La misura **0 finestre di visibilità indebita** è la formulazione verificabile di quella scelta: se la decisione fosse propagata invece che interrogata, esisterebbe per costruzione una finestra in cui un contenuto è visibile a chi l'autore ha appena escluso, e il numero non potrebbe essere zero.

I **300 ms** al p95 sono la contropartita: una decisione risolta sincrona a ogni lettura è pagata a ogni lettura, e la soglia esiste per rendere quel costo un fatto misurato anziché una speranza. Difficoltà **M**: la decisione è risolvibile su dato locale al contesto Profilo, senza attraversare la rete.

#### SE3 — la verifica, non il termine

Il termine dei 30 giorni appartiene a V5 e non è negoziabile. Ciò che SE3 aggiunge è la **verifica**, ed è la parte che rende lo scenario tale: il residuo dev'essere **0 record e 0 file**, accertato da **almeno un'esecuzione di verifica con esito totale prima della scadenza**.

«Esito totale» significa che la verifica ha coperto **tutti** i detentori di dati personali, non un campione: i quattro contesti modellati e l'archiviazione dei file. Il discriminatore resta quello di V5 — **per tipo di contenuto, non per presenza di interazione** — quindi la verifica non deve stabilire se un `Post` ha ricevuto Commenti: deve stabilire che un `Post` è stato anonimizzato perché è un `Post`.

Difficoltà **H** per una ragione precisa: la catena tocca **sette aggregati in quattro contesti**, più i file archiviati, più i payload dei fatti già consegnati che trasportavano nome, cognome e `Università` (E1). L'esclusione 2 della sezione Constraints — nessuna replica priva di un percorso che la raggiunga — vale anche per ciò che è già passato, ed è questa retroattività a rendere lo scenario costoso. Con esercizio non presidiato, una verifica che non produce un esito registrato equivale a nessuna verifica.

**Le due celle (H,H) sono SE1 e SE3.** Sono i due scenari contro cui lo stile architetturale e la scelta dei componenti dovranno essere giustificati esplicitamente: ogni alternativa scartata più avanti in questo documento è scartata, in primo luogo, perché peggiorerebbe uno di questi due.

### 4. Scenari — reliability

| ID | Scenario | Misura di risposta | Importanza | Difficoltà |
|---|---|---|---|---|
| **RE1** | Un meccanismo ricorrente (scadenza degli Inviti a 7 giorni, riconciliazione degli elementi orfani) salta uno o più cicli per un'interruzione | Dopo un'interruzione **≤ 24 h**, **100%** degli elementi arretrati elaborati entro il **ciclo successivo**, con **0 interventi manuali** | **H** | **M** |
| **RE2** | La propagazione di un fatto di dominio (E1–E6) fallisce | **0 perdite** entro la finestra di coerenza dichiarata dallo scenario corrispondente; ripresa autonoma **≤ 5 min**, **0 riavvii manuali** richiesti | **H** | **M** |
| **RE3** | Si dichiara la disponibilità del prodotto | Disponibilità mensile promessa **≤ min** delle disponibilità delle dipendenze esterne da cui il sistema dipende; obiettivo interno sulle funzioni asincrone **≥ 99,0%/mese** (**≤ 7,2 h** di indisponibilità); **0 promesse** sull'Audiochat oltre quanto garantito a monte | **M** | **M** |
| **RE4** | La capacità di Audiochat è indisponibile | **100%** delle funzioni non-audio dell'Aula studio operative: Chat testuale, Allegati, Argomenti, elenco dei Partecipanti, moderazione dei Permessi | **H** | **M** |

#### RE1 — il recupero è una proprietà, non un intervento

RE1 traduce in numeri l'esclusione 8 della sezione Constraints: un meccanismo che, saltando un ciclo, non recupera da solo al ciclo successivo è inammissibile. I due meccanismi in questione hanno un nome di dominio ciascuno — `InvitoAlGruppoScaduto` e `InvitoAllAulaStudioScaduto` da un lato, `ElementiOrfaniDiAulaStudioRimossi` dall'altro — e producono fatti, non pulizie anonime.

La misura **0 interventi manuali** è l'unica compatibile con `maintenance_mode = unattended`: un meccanismo che richiede una mano dopo un'interruzione è un meccanismo che resterà fermo, perché nessuno è di guardia. Le **24 h** sono la durata di interruzione oltre la quale non si promette più il recupero al ciclo successivo; sotto quella soglia il recupero è dovuto.

#### RE2 — 0 perdite, e la finestra la detta lo scenario

RE2 non introduce una propria finestra temporale: dichiara **0 perdite entro la finestra dello scenario corrispondente**, che per E2 significa i 5 secondi di SE1 e per E1, E3, E4, E6 significa i 5 minuti di PE2. È deliberato — duplicare le finestre qui avrebbe creato due fonti di verità per lo stesso numero.

La **ripresa autonoma ≤ 5 min con 0 riavvii manuali** è la traduzione dell'esclusione 7 (nessun componente che richieda riavvio o intervento manuale per riprendersi) e dell'esclusione 9 (nessuna dipendenza di E1–E6 da una consegna priva di ritentativo). Vale la pena notare che il modello di dominio **regala** una parte della soluzione: G3 e AS3 rendono priva di effetto una seconda aggiunta dello stesso Utente, IG2 e IA1 rendono priva di effetto una seconda accettazione dello stesso Invito. La difesa contro la doppia consegna è una proprietà del modello, non un meccanismo da costruire — ed è la ragione per cui la difficoltà è **M** e non **H**.

#### RE3 — non promettere ciò che non si possiede

RE3 è lo scenario più insolito della sezione, perché la sua misura di risposta principale è un **tetto e non un obiettivo**: la disponibilità promessa non può superare il minimo delle disponibilità delle dipendenze da cui il sistema dipende. Discende direttamente da A4 e dall'esclusione 12: con `vendor_guarantees = vendor-terms-only` non esiste alcuno SLA contrattuale a monte, quindi qualunque promessa più alta sarebbe una garanzia inventata.

La clausola **0 promesse sull'Audiochat oltre quanto garantito a monte** è la più stringente: l'Audiochat è la capacità con il fornitore meno prevedibile e con il costo per minuto che PE4 sorveglia. L'obiettivo interno di **≥ 99,0%/mese sulle funzioni asincrone** — pari a **≤ 7,2 h** di indisponibilità mensile — riguarda ciò che il sistema controlla davvero, ed è deliberatamente modesto: con un solo esercente non presidiato, un obiettivo più ambizioso sarebbe una dichiarazione senza copertura.

Un valore numerico resta **`null`** ed è dichiarato tale in §8.

#### RE4 — la degradazione è dichiarata, non subita

RE4 fissa che l'indisponibilità dell'Audiochat **non è l'indisponibilità dell'Aula studio**. Il **100%** delle funzioni non-audio deve restare operativo: Chat testuale, Allegati, Argomenti, elenco dei Partecipanti, moderazione dei Permessi.

È possibile enunciarlo come scenario perché il modello di dominio lo ha già reso possibile: **l'Audiochat non introduce alcuna entità né alcun value object** (AS8), non esiste un aggregato «Audiochat», non esiste uno stato del canale, e ciò che il dominio possiede è **il solo Permesso di Parlare** dentro i `Permessi` del Partecipante. Un'Aula studio senza canale audio è un'Aula studio in cui un Permesso non produce effetto — non un'Aula studio rotta. Importanza **H** perché è la difesa concreta del core rispetto alla componente tecnica più incerta del progetto.

### 5. Scenari — performance_efficiency

| ID | Scenario | Misura di risposta | Importanza | Difficoltà |
|---|---|---|---|---|
| **PE1** | Un Utente accetta un Invito e attende di entrare (E5) | `Membro` o `Partecipante` esistente entro **p95 ≤ 5 s**, **p99 ≤ 15 s** dall'accettazione | **H** | **M** |
| **PE2** | Coerenza differita senza nessuno in attesa (E1, E3, E4, E6) | Riconciliazione completata entro **p95 ≤ 5 min** | **M** | **L** |
| **PE3** | Un Partecipante apre un'Aula studio e scrive in Chat testuale | Apertura con Partecipanti, Argomenti e Allegati **p95 ≤ 800 ms**; messaggio visibile agli altri Partecipanti **p95 ≤ 1 s** | **H** | **M** |
| **PE4** | Il carico cresce senza picco annunciato e il consumo di Audiochat si avvicina al limite della banda | Notifica al superamento della **soglia di allerta di 2.100 minuti-partecipante/mese**; superato il tetto di **3.000 minuti-partecipante/mese** o l'headroom **+30%** sulla banda, si rinegozia la banda di budget e **mai** gli obblighi di protezione dei dati personali | **M** | **M** |

#### Le due classi di finestre, rese numeriche

Gli invarianti dichiarano due sole classi di tolleranza, e PE1/PE2 le trasformano in numeri verificabili:

| Classe dichiarata dagli invarianti | Fatti | Scenario | Numero |
|---|---|---|---|
| «pochi secondi» — **c'è qualcuno che aspetta** | E5 (accettazione → `Membro`/`Partecipante`), E2 (espulsione) | PE1, SE1 | p95 ≤ 5 s, p99 ≤ 15 s |
| «pochi minuti» — **nessuno sta aspettando** | E1, E3, E4, E6 | PE2 | p95 ≤ 5 min |

La classe non dipende dalla difficoltà tecnica: dipende da **chi subisce l'attesa**. PE1 è stretto perché l'Utente ha appena accettato un Invito e sta guardando lo schermo, e IG3/IA3 dichiarano come invarianti che il `Membro` e il `Partecipante` **non** nascono nella stessa transazione dell'accettazione: quello scarto è tutto ciò che separa la persona dallo spazio in cui vuole entrare. PE2 è largo perché un nome vecchio in un elenco, un `Commento` sotto un `Post` già eliminato, un `AllegatoDiAulaStudio` ancora associato a un `Argomento` scomparso o una `Collocazione` che punta a un'Aula studio eliminata **non danneggiano nessuno nel frattempo**.

Difficoltà **L** per PE2 è una dichiarazione onesta: cinque minuti sono un'eternità per un meccanismo che nessuno guarda.

#### PE3 — il percorso più frequente del core

PE3 misura i due gesti che compongono l'incontro: **entrare** e **scrivere**. Gli **800 ms** al p95 riguardano una risposta composta — Partecipanti con i loro `Permessi`, Argomenti, Allegati — cioè esattamente ciò che il modello ha distribuito su più aggregati autonomi del core. Il secondo **1 s** riguarda la visibilità del messaggio agli altri Partecipanti, dove il dominio non ha nulla da ricostruire: MA2 verifica il Permesso di Scrivere sull'`AulaStudio` su dato fresco all'invio, e il messaggio è immutabile da lì in poi (MA1).

Importanza **H**: è il percorso che l'Utente attraversa ogni volta che studia, ed è il comportamento reale che il prodotto esiste per servire.

#### PE4 — la soglia che protegge il budget, non il vincolo

PE4 è l'unico scenario la cui misura di risposta contiene una **regola di precedenza** invece di un solo numero, e la regola è già scritta in R7: superata la soglia, **si rinegozia la banda di budget, mai V3**. La residenza UE dei dati ha un owner esterno con potere di veto; la banda di budget ha un owner interno. Quando le due premono l'una sull'altra — ed è precisamente ciò che descrive R9 — cede quella con owner interno.

I **2.100 minuti-partecipante/mese** sono il 70% del tetto di 3.000, e la scelta del 70% ha una motivazione operativa: con esercizio non presidiato, una notifica al 100% arriverebbe quando il danno economico è già fatto. L'**headroom +30%** è la fascia entro cui il superamento della banda non richiede ancora una decisione, e oltre la quale la richiede. Difficoltà **M** perché richiede di misurare un consumo che vive interamente presso il fornitore.

### 6. Scenari — compatibility

| ID | Scenario | Misura di risposta | Importanza | Difficoltà |
|---|---|---|---|---|
| **CO1** | Il backend evolve mentre sui dispositivi degli Utenti sono ancora in uso versioni precedenti dell'app | **0** funzionalità che richiedano l'aggiornamento simultaneo di backend e client; nessuna versione dell'app resa inutilizzabile prima di **90 giorni** dalla pubblicazione della successiva | **H** | **M** |

CO1 è la traduzione misurabile di V4 e dell'esclusione 13. Il **numero zero** è la parte più vincolante: non «poche» funzionalità che richiedono aggiornamento simultaneo, **nessuna**. La ragione è che il team non controlla il momento in cui una release diventa disponibile — lo controlla il team di revisione dello store — né il momento in cui un Utente aggiorna, che non controlla nessuno.

I **90 giorni** sono la finestra minima di sopravvivenza di una versione dopo la pubblicazione della successiva. È una scelta interna, non imposta dallo store, e serve a coprire l'Utente che non aggiorna per mesi. La combinazione delle due misure ha una conseguenza strutturale che le sezioni successive dovranno onorare: **un solo contratto verso il client, versionato in un punto**, con evoluzione additiva dentro una versione.

È anche il punto in cui R11 resta a registro: se una correzione urgente non può passare dal client perché la revisione richiede giorni, deve poter passare dal backend. CO1 è ciò che rende quella possibilità strutturale invece che fortunata.

### 7. Scenari — maintainability

| ID | Scenario | Misura di risposta | Importanza | Difficoltà |
|---|---|---|---|---|
| **MA1** | La capacità sottostante all'Audiochat va sostituita | **0** modifiche agli aggregati del contesto Aula studio; intervento completato in **≤ 8 ore** di lavoro | **M** | **M** |
| **MA2** | Si aggiunge una regola o un fatto di dominio dentro il core | **0** modifiche ai contesti Profilo, Bacheca e Gruppo; **0** nuove dipendenze di dominio introdotte dal core | **M** | **L** |

#### MA1 — il cambiamento atteso a 12 mesi

MA1 è l'unico scenario che nasce da un **cambiamento previsto e dichiarato**, non da un rischio: la Context Map ha istituito la porta dell'Audiochat esplicitamente per «poter sostituire la capacità sottostante senza toccare il modello dell'Aula studio». MA1 lo rende verificabile con due numeri.

Lo **0 modifiche agli aggregati** è la misura sostanziale, ed è già plausibile per costruzione: il dominio possiede il solo Permesso di Parlare, non conosce stato del canale né elenco di chi parla. Le **≤ 8 ore** sono la misura di costo, e vanno lette insieme a `deadline` — 4 settimane a ~2 ore a settimana: otto ore sono **un mese intero di capacità di lavoro**. Un intervento più costoso di così non verrebbe fatto, e la porta avrebbe fallito il suo scopo.

#### MA2 — la misura che protegge i confini

MA2 misura la proprietà che la Context Map ha dichiarato da preservare: **il core ha due sole dipendenze di dominio**, il contratto pubblicato da Profilo e il fatto di appartenenza pubblicato dal Gruppo. Lo **0 nuove dipendenze di dominio introdotte dal core** è la forma verificabile di quella proprietà, e lo **0 modifiche agli altri tre contesti** verifica che i confini interni non siano decorativi.

Difficoltà **L** e importanza **M**: è lo scenario più economico da soddisfare — perché il modello approvato lo ha già preparato — e il più facile da violare per distrazione, dato che una dipendenza in più non produce alcun sintomo immediato.

### 8. Assi di prioritizzazione e lettura della matrice

I due assi sono **indipendenti** e hanno due dichiaranti diversi:

- **Importanza** — rilevanza per il business, **dichiarata dal committente**. Risponde a: se questo scenario fallisce, quanto ne risente il prodotto?
- **Difficoltà** — costo e rischio architetturale, **dichiarata dall'architetto**. Risponde a: quanto costa garantirlo e quanto è incerto che ci si riesca?

Tenerli separati è ciò che rende la matrice utile. Un valore unico di «priorità» confonderebbe uno scenario importante e facile (RE4) con uno importante e rischioso (SE1), e farebbe sparire proprio l'informazione che serve.

| | Difficoltà **L** | Difficoltà **M** | Difficoltà **H** |
|---|---|---|---|
| **Importanza H** | — | SE2, RE1, RE2, RE4, PE1, PE3, CO1 | **SE1, SE3** |
| **Importanza M** | PE2, MA2 | RE3, PE4, MA1 | — |

La cella **(H,H)** contiene **SE1** e **SE3**, entrambi scenari di **security**, cioè della caratteristica driving. È una coincidenza confortante e va detta: significa che il rischio maggiore e la caratteristica dominante indicano lo stesso punto, e che giustificare l'architettura contro questi due scenari copre anche la ragione per cui security è driving.

Nessuno scenario cade in (L,H) o (M,H): non esistono qui scenari costosi ma poco rilevanti, che sarebbero i primi candidati alla rinuncia.

### 9. Lasciato esplicitamente `null`

Due valori non sono determinati, e la loro assenza è una dichiarazione, non una dimenticanza. Riempirli con una stima produrrebbe numeri che nessuno potrebbe difendere.

| Valore | Stato | Motivo | Quando si determina |
|---|---|---|---|
| **Traffico reale** — Utenti attivi, Aule studio simultanee osservate, minuti di Audiochat consumati | `null` | Nessuna evidenza raccolta. La banda di §2 è un **obiettivo dichiarato**, non una previsione, e non può essere usata come se fosse una misura | Alla prima misurazione in esercizio; i segnali di osservabilità sono già predisposti per PE4 |
| **Valore numerico di disponibilità delle dipendenze esterne**, input di **RE3** | `null` | Le dipendenze non sono ancora determinate, e con `vendor-terms-only` il valore non è comunque un impegno contrattuale ma una stima osservata | Alla selezione dei fornitori, e comunque **prima** di qualunque dichiarazione di disponibilità verso gli Utenti |

Finché il secondo resta `null`, la misura di risposta di RE3 è **applicabile ma non calcolabile**: il tetto esiste come regola («non promettere più del minimo a monte»), e non come cifra. Dichiarare un numero di disponibilità prima di aver determinato quel minimo violerebbe l'esclusione 12.

## Architecture Style

Lo stile è **un monolite modulare con due unità di esecuzione ricavate dalla stessa immagine**. Nessun bounded context è esercitato come servizio indipendente; la separazione che conta — quella fra i quattro modelli di dominio — è ottenuta con confini di modulo imposti dal codice, non con confini di rete. La sola divisione fisica introdotta è **per ruolo di esecuzione**, cioè fra ciò che risponde a una persona che aspetta e ciò che lavora quando nessuno guarda.

Questa sezione motiva la scelta punto per punto contro i due scenari (H,H) — **SE1** e **SE3** — contro i vincoli con owner esterno e contro le condizioni di contesto (`team_size = 1`, ~2 ore a settimana, `maintenance_mode = unattended`), e dichiara le alternative scartate con la ragione per cui ciascuna peggiorerebbe qualcosa di già bloccato.

### 1. I campi dello stile

| Campo | Valore bloccato |
|---|---|
| **Stile** | Monolite modulare: nessun bounded context è esercitato come servizio indipendente |
| **Unità di esecuzione** | **Due**, dalla stessa immagine. **Unità applicativa**: comandi, letture e verifiche su dato fresco — titolo di ammissione, `Permessi`, decisioni di privacy. **Unità lavoratrice**: meccanismi ricorrenti (scadenza degli Inviti a 7 giorni, rimozione degli elementi orfani di Aula studio), propagazione dei fatti E1–E6, catena di eliminazione e anonimizzazione di V5 |
| **Moduli** | Un modulo per bounded context di dominio: **Profilo, Bacheca, Gruppo, Aula studio**. **Accesso non è un modulo di dominio**: è la sola porta di traduzione, posseduta da Profilo |
| **Confini interni** | Imposti dal codice, non affidati a convenzioni: nessun modulo raggiunge il modello di un altro, si vedono unicamente le interfacce pubblicate |
| **Grafo delle dipendenze in-processo** | Identico alla Context Map e verificato meccanicamente: `Accesso → Profilo → { Bacheca, Gruppo, Aula studio }`, più i due contratti distinti Gruppo ↔ Aula studio; Bacheca in separate ways rispetto a Gruppo e Aula studio; **nessuna dipendenza risale verso Profilo** |
| **Stato** | Stato corrente mutabile. **Event sourcing escluso**: i fatti di dominio sono pubblicati e consumati, **mai** fonte di verità |

#### La divisione è per ruolo di esecuzione, non per contesto

È il punto che qualifica lo stile e va enunciato senza ambiguità: le due unità **non corrispondono a due gruppi di bounded context**. Entrambe contengono tutti e quattro i moduli di dominio, ricavati dalla stessa immagine; ciò che cambia è **che cosa viene attivato in ciascuna**.

- L'**unità applicativa** serve il contratto verso il client: apertura dell'Aula studio, ingresso, concessione e revoca di un Permesso, pubblicazione di un Post, lettura della Bacheca. Tutte operazioni con qualcuno in attesa di una risposta, tutte soggette a una soglia di latenza (PE3, SE2, PE1).
- L'**unità lavoratrice** esegue ciò che non ha nessuno davanti: i due meccanismi ricorrenti nominati dal dominio, la consegna dei fatti E1–E6 ai loro consumatori, la sequenza di eliminazione e anonimizzazione a 30 giorni.

La ragione della separazione è una sola e si legge nei numeri già bloccati: la riconciliazione degli elementi orfani e la scansione di verifica del residuo di SE3 sono lavori **lunghi e a lotti**, e se insistessero sullo stesso processo che deve rispettare **PE3 (p95 ≤ 800 ms)** produrrebbero un degrado che nessuno correla alla causa. Con `maintenance_mode = unattended`, un degrado non correlabile è un guasto che resta invisibile fino al reclamo di un Utente (R8).

Corollario altrettanto importante: **la separazione non introduce un confine di dominio nuovo**. Un fatto pubblicato dall'unità applicativa e consumato dall'unità lavoratrice attraversa un confine di processo, non un confine di modello: il consumatore invoca la stessa interfaccia pubblicata che invocherebbe in-processo, e nessun modulo scopre di essere diviso.

#### Accesso non ha modulo, e la ragione è di dominio

Accesso è l'unico contesto interamente generic dei cinque: la Context Map lo dichiara e la sezione Bounded Contexts stabilisce che non lo si progetta affatto. Nello stile questo significa che **non esiste un modulo `Accesso`**, ma un'unica porta di traduzione **posseduta da Profilo**, che converte l'account autenticato nell'Utente di dominio. Il vocabolario dell'autenticazione — account, sessione, provider — non compare in Bacheca, Gruppo e Aula studio, perché quei moduli non conoscono Accesso: conoscono l'Utente pubblicato da Profilo.

Da qui la regola applicativa che ne discende: **la porta autentica, i moduli autorizzano**. Ogni decisione su chi può fare cosa vive in uno dei quattro moduli modellati, mai nella traduzione dell'identità, coerentemente con la terza conseguenza vincolante della sezione Bounded Contexts.

### 2. Severità dei confini interni

Un monolite modulare vale quanto valgono i suoi confini. Se sono convenzioni, il modello si erode senza produrre alcun sintomo: nessun errore, nessuna latenza, solo un giorno in cui MA2 non è più soddisfacibile. Perciò i confini sono **imposti dal codice e verificati meccanicamente**, con tre regole:

1. **Nessun modulo raggiunge il modello interno di un altro.** Un modulo vede solo le interfacce pubblicate dai propri fornitori: `RiferimentoUtente`, `DecisioneDiContattabilità`, `DecisioneDiVisibilitàDeiContenuti` da Profilo; `AppartenenzaAlGruppo` da Gruppo; `EtichettaDellAulaStudio` da Aula studio. Gli aggregati restano invisibili oltre il proprio confine.
2. **Il grafo delle dipendenze in-processo coincide con la Context Map**, e la coincidenza è verificata, non auspicata. In particolare: **nessuna dipendenza risale verso Profilo**, Bacheca non dipende né da Gruppo né da Aula studio, e il core conserva **due sole dipendenze di dominio**.
3. **I due versi della partnership Gruppo ↔ Aula studio insistono su contratti disgiunti**, con anti-corruption layer sul lato consumatore. Nel verso dell'appartenenza passa un fatto booleano, tradotto in titolo di ammissione: **la parola Membro non entra nel core**. Nel verso dell'indice passa un'etichetta minima — titolo e `DataOraDiInizio` — e **mai un campo di stato**, perché AS8 stabilisce che l'`AulaStudio` non ne possiede alcuno.

La severità è richiesta da due scenari, e non da un principio estetico: **MA2** misura 0 modifiche agli altri tre contesti quando cambia il core, e **AS6** vieta ogni derivazione automatica dai ruoli del Gruppo. Entrambe sono violabili silenziosamente da una singola dipendenza di comodo.

### 3. Paradigma di interazione ai confini

Lo stile non è né «sincrono» né «event-driven»: è **sincrono dove il dominio ha scelto l'interrogazione, asincrono dove il dominio ha enumerato una finestra di coerenza differita**. La distinzione è già decisa dal modello approvato e viene qui soltanto onorata.

| Interazione | Modo | Fondamento |
|---|---|---|
| Decisioni di autorizzazione di Profilo — chi contatta l'Utente, chi vede i suoi contenuti | **Sincrono, in-processo** | Interrogazione e mai replica; **SE2**: p95 ≤ 300 ms, 0 finestre di visibilità indebita |
| Titolo di ammissione all'Aula studio per appartenenza al Gruppo | **Sincrono, su dato fresco** | **IA4**: l'ingresso è una domanda posta adesso; nessuna copia locale dell'insieme dei Membri |
| Traduzione dell'account autenticato in Utente di dominio | **Sincrono** | Nessuna riconciliazione differita ammessa sulla linea Accesso → Profilo |
| Verifica di un Permesso al momento del gesto | **Sincrono, su dato fresco** | **AL4**, **MA2**: il Permesso si legge sull'`AulaStudio` nell'istante dell'azione |
| Fatti **E1–E6** — nome propagato, decadenza dell'appartenenza (E2), eliminazioni a cascata, indice delle Collocazioni | **Asincrono, consegna durevole con ritentativo** | **RE2**: 0 perdite entro la finestra dello scenario, ripresa autonoma ≤ 5 min |
| Meccanismi ricorrenti — scadenza degli Inviti, riconciliazione degli orfani | **Asincrono, con recupero degli arretrati** | **RE1**: dopo interruzione ≤ 24 h, 100% degli arretrati al ciclo successivo, 0 interventi manuali |

#### Il vincolo qualificante

> **L'event-driven è il meccanismo delle sole sei finestre di coerenza differita già enumerate dal dominio, non lo stile del sistema.**

Non si introducono eventi dove il dominio ha scelto l'interrogazione. La formulazione è deliberatamente restrittiva perché la deriva opposta è la più facile: una volta esistente un canale di fatti durevoli, propagare *anche* le decisioni di privacy o *anche* l'insieme dei Membri sembra un'ottimizzazione. Sarebbe invece una violazione diretta di IP1–IP4 e di SE2, perché **una decisione di privacy replicata è una decisione presa su un dato vecchio**, e la misura richiesta è 0 finestre di visibilità indebita.

La stessa disciplina spiega perché `MessaggioDiChatInviato` non è un fatto di dominio e perché non esiste alcun evento al raggiungimento della `DataOraDiInizio`: il catalogo eventi è chiuso, e lo stile non lo allarga.

### 4. Perché stato corrente mutabile, e non event sourcing

La persistenza è a **stato corrente mutabile**. I fatti di dominio esistono, sono pubblicati e consumati, ma **non sono la fonte di verità**: lo stato è nelle tabelle degli aggregati.

L'esclusione dell'event sourcing non è una preferenza di gusto e non poggia su un argomento di complessità. Poggia su due esclusioni con owner esterno, già registrate:

- **V1 esclude l'archivio append-only immutabile per i contenuti dell'Utente.** Un registro di fatti immutabile è per definizione ciò che V1 nega quando quei fatti trasportano `Post`, `Commento`, messaggi di Chat testuale, nome e `Università`.
- **V5 impone anonimizzazione irreversibile entro 30 giorni su ogni replica**, file archiviati inclusi, anche quando l'evento che trasportava il riferimento è già passato. Uno store di eventi riscrivibile per soddisfare V5 non è più uno store di eventi; uno non riscrivibile viola V5. Non esiste una terza posizione.

È per questo che l'esclusione compare qui come conseguenza di un vincolo hard e non come alternativa scartata per costo: **non era disponibile**.

### 5. Giustificazione contro gli scenari (H,H)

#### SE1 — espulsione: p95 ≤ 5 s, p99 ≤ 15 s, 0 ammissioni indebite

SE1 ha due misure di natura diversa, e lo stile le soddisfa con due meccanismi diversi:

- **0 ammissioni indebite** è ottenuto **senza alcuna propagazione**. Il verso dell'ingresso è risolto sincrono e in-processo: quando qualcuno chiede di entrare, l'anti-corruption layer del core interroga il contratto di appartenenza e traduce la risposta in titolo di ammissione (IA4). Non esistendo copia locale dell'insieme dei Membri, non esiste finestra in cui una copia possa essere vecchia — **il numero è zero perché la finestra è zero**;
- **p95 ≤ 5 s / p99 ≤ 15 s** riguarda il solo verso dell'uscita, cioè chi è già dentro l'incontro e non farà alcuna nuova richiesta. Qui il fatto `MembroRimossoDalGruppo` viaggia sul canale durevole verso l'unità lavoratrice, che invoca l'interfaccia di consumo del core; il core registra un Partecipante rimosso con causa «decaduta l'appartenenza al Gruppo», senza che la parola Membro entri nel proprio vocabolario.

Un solo verso da propagare, in-processo dopo la ripresa del fatto, senza attraversare la rete verso un altro servizio: cinque secondi al p95 sono ampiamente alla portata. La difficoltà **H** di SE1 resta, ma è concentrata nella durabilità della consegna (RE2) e non nella topologia.

#### SE3 — eliminazione: 0 record e 0 file residui entro 30 giorni

La catena di V5 tocca **sette aggregati in quattro contesti**, più i file archiviati, più i payload dei fatti già consegnati che trasportavano nome, cognome e `Università`. Il discriminatore è **per tipo di contenuto**, quindi la sorte di ciascun aggregato è decisa dal modulo che lo possiede — `Post` e `Commento` anonimizzati, `Membro` e `Partecipante` rimossi onorando G2 e AS2, `AllegatoDiAulaStudio` con `CaricatoDa` anonimizzato e file conservato.

In un monolite modulare questa catena è **una sequenza orchestrata dall'unità lavoratrice, verificabile end-to-end in un solo punto**. È la proprietà decisiva: SE3 non richiede solo che l'eliminazione avvenga, richiede **almeno un'esecuzione di verifica con esito totale prima della scadenza**, e «totale» significa che ha coperto tutti i detentori. Un'unica scansione che raggiunge tutti gli schemi e le chiavi dell'archiviazione produce un esito registrabile; con esercizio non presidiato è la condizione necessaria perché la verifica esista davvero e non sia una speranza.

Si noti che la catena richiede anche di scrivere le colonne dell'autore dichiarate immutabili dal dominio (B2, C2, AL2, MG1, MA1): è **R12**, conflitto aperto con due autorità esterne, e lo stile non lo risolve — lo rende però eseguibile da **un solo percorso privilegiato**, individuabile e ispezionabile, invece che da tanti percorsi quanti sono i servizi.

### 6. Giustificazione contro gli altri scenari e contro il contesto

- **RE4 e MA1** — la resistenza all'indisponibilità dell'Audiochat e la sua sostituibilità in ≤ 8 ore **non dipendono dalla distribuzione**, ma dalle porte in lingua di dominio. Il dominio possiede il solo Permesso di Parlare (AS8): un'Aula studio senza canale audio è un'Aula studio in cui un Permesso non produce effetto, non un'Aula studio rotta. Distribuire il core non aggiungerebbe nulla a questa proprietà; comprometterla richiederebbe di far entrare lo stato del canale nel modello, cosa che nessuna topologia impone.
- **CO1** — un'unica unità applicativa espone **un solo contratto verso il client, versionato in un punto**. Con più servizi esposti, la misura «0 funzionalità che richiedano aggiornamento simultaneo di backend e client» andrebbe garantita su altrettanti contratti, ciascuno con un proprio ritmo di evoluzione, davanti a un client il cui rilascio è governato da un'autorità esterna (V4). La superficie di versionamento coincide qui con la superficie di rischio, e tenerla a uno è la sola scelta compatibile con R11: ciò che non si può correggere lato client in tempo utile deve poter essere corretto lato backend, in un punto.
- **MA2** — 0 modifiche agli altri tre contesti e 0 nuove dipendenze di dominio introdotte dal core sono misurate **sui confini di modulo**, che il monolite modulare rende ispezionabili in un solo albero di codice. È lo scenario più economico da soddisfare e il più facile da violare per distrazione: la verifica meccanica del grafo è la contropartita.
- **`team_size = 1`, ~2 ore a settimana, `maintenance_mode = unattended`** — ogni unità di esecuzione aggiuntiva è un ciclo di rilascio in più, un canale di guasto in più e una superficie di osservazione in più. Entro la banda di capacità bloccata — ≤ 500 Utenti registrati, ≤ 10 Aule studio simultanee, ≤ 15 Partecipanti per Aula studio — **nessun contesto ha bisogno di rilascio o dimensionamento indipendente**, quindi non esiste alcun beneficio da mettere sull'altro piatto. Le due unità esistono perché due ruoli di esecuzione hanno profili di latenza incompatibili; una terza esisterebbe solo per simmetria.

### 7. Alternative scartate

| Alternativa | Ragione dello scarto |
|---|---|
| **Microservizi, uno per bounded context** | Nessun contesto ha bisogno di rilascio o dimensionamento indipendente entro la banda bloccata. **SE3 diventerebbe una cancellazione distribuita con residui invisibili**, e la verifica «esito totale, 0 record e 0 file» richiederebbe di interrogare quattro archivi separati concordando un istante comune. **RE1 e RE2** richiederebbero un'affidabilità di rete che, con `unattended` e `team_size = 1`, nessuno presidia |
| **Unità separata per il solo core Aula studio** | Le sue due dipendenze di dominio — il contratto di Profilo e il fatto di appartenenza del Gruppo — sono **entrambe sincrone su dato fresco**. Metterle in rete aggiunge latenza e modi di guasto a **SE1** (0 ammissioni indebite) e a **IA4** senza alcun guadagno. La protezione del core si ottiene dai confini di modulo, che **MA2** misura direttamente |
| **Unità di esecuzione singola** | Riconciliazione degli elementi orfani ed eliminazione a 30 giorni insisterebbero sullo stesso processo che deve rispettare **PE3 (p95 ≤ 800 ms)**, producendo un degrado non correlabile alla causa — inaccettabile con esercizio non presidiato |
| **Sistema puramente event-driven fra contesti** | Contraddice la Context Map: le decisioni di autorizzazione sono **interrogazioni, mai propagazioni**. Trasformerebbe una decisione di privacy in una copia vecchia, contro **IP1–IP4** e contro la misura «0 finestre di visibilità indebita» di **SE2** |
| **Event sourcing** | Non disponibile: **V1** esclude l'archivio append-only immutabile per i contenuti dell'Utente e **V5** impone anonimizzazione irreversibile entro 30 giorni su ogni replica. Owner esterno, forza hard |
| **Serverless a funzioni per contesto** | Moltiplicherebbe le superfici di configurazione con regione UE dichiarata da verificare (**V3**), e frammenterebbe la catena di **SE3** su tanti punti quanti sono le funzioni, senza alcun beneficio entro la banda bloccata |

### 8. Ciò che lo stile lascia aperto

Due punti restano fuori da questa decisione e sono registrati altrove, per non farli sparire:

- **R10** — segnalazione, blocco fra Utenti e rimozione dichiarata pretesi da V4 non esistono nel modello approvato. Lo stile non li introduce e non li può introdurre: comparirebbero come concetti nuovi in Bacheca, Gruppo e Aula studio, cioè come modifica del modello di dominio, e la decisione appartiene alle due autorità del gate.
- **`deployment_model`** — non valorizzato in questo punto. Lo stile prescrive **due unità di esecuzione dalla stessa immagine**, non il modo in cui sono ospitate; il vincolo che qualunque scelta di ospitalità dovrà onorare è già scritto ed è **V3**: regione UE dichiarata, per i dati a riposo e in transito.

## Components

I componenti sono la scomposizione interna delle due unità di esecuzione decise dallo stile. Non introducono alcun bounded context nuovo, alcun archivio nuovo, alcuna integrazione nuova: ogni componente qui elencato è o **un modulo di dominio corrispondente a un bounded context modellato**, o **una porta verso una delle sei capacità generic** già enumerate dalla sezione Bounded Contexts, o **una responsabilità trasversale che nessun modulo poteva ospitare senza violare il grafo delle dipendenze**, o **la superficie verso il client** imposta da V4.

Ogni componente dichiara: una **categoria**, la **mappatura a un bounded context** (o l'assenza dichiarata di contesto), una **responsabilità unica** e gli **scenari di qualità che rivendica**. Il criterio di chiusura è duplice e verificato in §4: nessun componente resta senza scenario rivendicato o senza consumatore nominato, e nessuno scenario resta orfano.

### 1. Perimetro deciso

Sono definiti **15 componenti**. Ogni bounded context modellato ha **esattamente un modulo di dominio**; nessun contesto è rappresentato da più di un componente `domain`, e nessun componente `domain` attraversa due contesti.

#### Chat testuale — forma confermata: nessun componente condiviso

È la decisione di scomposizione più esposta a essere rifatta al contrario, quindi va enunciata per intero. **Non esiste alcun componente `shared` di messaggistica.** Il `MessaggioDiChat` resta modellato **due volte** — dentro **Gruppo** e dentro **AulaStudio** — coerentemente con la Context Map, che ha scartato tanto lo shared kernel quanto il conformist sulla linea Gruppo ↔ Aula studio.

La ragione non è la somiglianza dei due modelli, che è reale: hanno gli stessi value object e la stessa immutabilità dopo l'invio (MG1, MA1). La ragione è **che cosa si verifica prima di scrivere**:

- nel Gruppo si verifica **il titolo a scrivere**, cioè l'appartenenza, sul `Gruppo`, su dato fresco (MG2);
- nell'Aula studio si verifica **il Permesso di Scrivere**, sull'`AulaStudio`, su dato fresco (MA2).

Non sono la stessa condizione: un Partecipante ammesso all'incontro può essere in **Sola lettura**, cioè dentro ma senza scrivere. Un componente condiviso di messaggistica dovrebbe ricevere dall'esterno l'esito di una verifica che, per invariante, appartiene all'aggregato dello spazio — e la verifica attraverserebbe un confine di componente ogni volta che qualcuno scrive.

**L'unica parte realmente comune è estratta**, ed è il componente `technical` **TrasportoInTempoReale**: consegna ai presenti messaggi **già accettati** dal modulo che li possiede, e non conosce Membri, Partecipanti né Permessi. È privo di semantica di dominio, quindi condividerlo non condivide modello.

**Forza sacrificata:** due implementazioni quasi identiche di un aggregato minuscolo, da mantenere in parallelo. È il costo già messo a bilancio dalla sezione Bounded Contexts quando ha deciso che Chat testuale e Audiochat sono modellate due volte, una per contesto.

### 2. Componenti

#### 2.1 Componenti `domain` — uno per bounded context modellato

| Componente | Contesto | Responsabilità unica | Scenari rivendicati |
|---|---|---|---|
| **Profilo** | Profilo (supporting) | Possiede i dati identificativi dell'Utente e le due regole di privacy, e risolve le domande su chi può contattare l'Utente e chi può vederne i contenuti | **SE2** |
| **Bacheca** | Bacheca (supporting) | Possiede la pubblicazione asincrona: `Post` con i propri `Allegato` e `Commento`, senza alcun attributo di visibilità proprio | — |
| **Gruppo** | Gruppo (supporting) | Possiede la comunità persistente — appartenenza, moderazione, `Visibilità` dello spazio, `InvitoAlGruppo`, messaggi della propria Chat testuale — e l'organizzazione interna dei riferimenti alle Aule studio | **SE1** (lato emissione) |
| **AulaStudio** | Aula studio (**core**) | Possiede l'incontro: titolo di ammissione, `Partecipante` con i tre `Permessi` concessi uno per uno, `Argomento` e `AllegatoDiAulaStudio`, `Invito`, messaggi della propria Chat testuale | **SE1**, **PE3**, **MA2** |

##### Perché **Profilo** rivendica SE2 e nient'altro

SE2 misura una decisione — «questo lettore può vedere i contenuti di questo autore?» — che per IP1–IP4 e B5 vive interamente dentro questo componente, e che la Context Map ha stabilito essere **un'interrogazione sincrona e mai una propagazione**. Profilo la risolve su dato locale al proprio contesto, senza attraversare alcun confine: è la ragione per cui i **300 ms al p95** sono una soglia raggiungibile e la difficoltà di SE2 è **M** e non **H**.

Profilo **non rivendica SE3** benché sia il detentore del `Profilo` e delle `ImpostazioniDiPrivacy`: lo rivendica CancellazioneDellAccount, per la ragione strutturale esposta in §2.3. Profilo è invece **detentore a monte** in quella catena, che è cosa diversa dal rivendicare lo scenario.

##### Perché **Bacheca** non rivendica alcuno scenario, e va bene così

Bacheca è il contesto con **una sola linea entrante** — il contratto pubblicato da Profilo — e nessuna uscente: separate ways verso Gruppo e verso Aula studio. Nessuno scenario di qualità bloccato la nomina: SE2 è rivendicato da chi *decide* la visibilità, non da chi mostra i contenuti; E3 (eliminazione dei Commenti di un Post eliminato) ricade in PE2, rivendicato dal componente che consegna i fatti.

È un componente **con consumatori nominati e senza scenario proprio**, e il criterio di chiusura di §4 lo ammette esplicitamente: richiede che nessun componente sia privo *sia* di scenario *sia* di consumatore. Bacheca è consumatore di Profilo, di ArchivioDiFile, di RecapitoDeiFattiDiDominio, ed è consumata da FacciataDellApp e da CancellazioneDellAccount.

##### Perché **Gruppo** rivendica SE1 solo sul lato emissione

SE1 è l'unico scenario che attraversa due componenti `domain` in versi diversi, e la ripartizione è netta:

- **Gruppo** rivendica il **lato emissione**: è l'aggregato che, rimuovendo il `Membro`, produce il fatto `MembroRimossoDalGruppo` nella stessa transazione. È anche il fornitore, sull'altro contratto, del fatto booleano `AppartenenzaAlGruppo` su cui si risolvono le **0 ammissioni indebite**;
- **AulaStudio** rivendica il **lato effetto**: rimuove il `Partecipante` con causa «decaduta l'appartenenza al Gruppo» e chiude l'accesso ad Audiochat e Chat testuale;
- **RecapitoDeiFattiDiDominio** rivendica il **lato transito**, cioè la parte in cui si consumano i 5 secondi al p95.

Nessuno dei tre potrebbe rivendicare SE1 da solo, e il fatto che lo scenario (H,H) più delicato sia distribuito su tre componenti è precisamente ciò che ne motiva la difficoltà **H**.

##### Perché **AulaStudio** è un solo componente, e `AlberoOrganizzativo` non è un componente

Il core ha cinque aggregati — `AulaStudio`, `Argomento`, `AllegatoDiAulaStudio`, `Invito`, `MessaggioDiChat` — e resta **un solo componente**. Estrarne uno significherebbe far attraversare un confine di componente alle verifiche che gli invarianti impongono su dato fresco: AL4 legge il Permesso di Caricare sull'`AulaStudio` al momento del caricamento, MA2 legge il Permesso di Scrivere sull'`AulaStudio` all'invio, AL3 verifica al comando che l'`Argomento` appartenga alla stessa Aula studio. Un componente per aggregato trasformerebbe PE3 (**p95 ≤ 800 ms** per una risposta composta da Partecipanti, Argomenti e Allegati) in una composizione fra componenti anziché in letture dentro un confine.

Simmetricamente, **`AlberoOrganizzativo` resta un aggregato interno a Gruppo e non un componente distinto**: nessuna forza nominata su uno scenario bloccato ne giustifica l'estrazione. Le sue invarianti di forma (A2, A3, A4) sono locali all'aggregato, e l'indice delle Collocazioni che alimenta è alimentato dal contratto d'indice, che il componente Gruppo riceve già.

**Forza sacrificata:** la contesa in scrittura fra chi riordina le Cartelle e chi entra o esce dal Gruppo resta risolta a livello di aggregato — con blocco ottimistico per versione — e non a livello di componente. Entro la banda bloccata (≤ 500 Utenti registrati) la contesa non è materiale.

#### 2.2 Componenti `integration` — un contesto, un sistema esterno

| Componente | Contesto | Responsabilità unica | Scenari rivendicati |
|---|---|---|---|
| **PortaIdentitàUtente** | Profilo | Converte l'account autenticato nell'Utente di dominio; nulla del vocabolario dell'autenticazione oltrepassa questo punto | — |
| **PortaAudiochat** | Aula studio | Apre e chiude per un `Partecipante` il canale audio dell'Aula studio, esprimendosi solo nei termini Audiochat e Permesso di Parlare | **MA1**, **RE4** |

Entrambe sono classificate `integration` e **non** `technical` per un criterio unico: hanno **un solo contesto di attacco**. PortaIdentitàUtente è posseduta da Profilo — è il punto di traduzione unico verso Accesso che la Context Map le assegna — e nessun altro componente la invoca. PortaAudiochat è invocata solo da AulaStudio, perché il Permesso di Parlare esiste solo lì.

##### PortaIdentitàUtente — l'unico punto in cui Accesso tocca il dominio

Accesso non è un modulo di dominio: è **interamente rappresentato da questo componente**. La responsabilità è una sola conversione, e le due negazioni che la delimitano sono vincolanti: **non passano account, sessione, provider**, e **non si prende alcuna decisione su chi può fare cosa** — coerentemente con la terza conseguenza vincolante della sezione Bounded Contexts.

Non rivendica scenari perché nessuno scenario bloccato la nomina, ma ha un consumatore nominato (Profilo) e una linea dichiarata nella Context Map. Se un giorno il modo di autenticarsi cambia, questo è **l'unico componente da riscrivere**, e il core non se ne accorge.

##### PortaAudiochat — la difesa concreta di AS8

Rivendica due scenari, entrambi resi possibili dal modello prima che dall'architettura:

- **MA1** (0 modifiche agli aggregati del contesto Aula studio, intervento ≤ 8 ore) è soddisfacibile perché il dominio possiede **il solo Permesso di Parlare**: nessun aggregato «Audiochat», nessuno stato del canale, nessun elenco di chi sta parlando (AS8). Sostituire il fornitore significa riscrivere un adattatore dietro un'interfaccia che parla di `CanaleAudioDellAulaStudio`, non toccare `AulaStudio`;
- **RE4** (100% delle funzioni non-audio operative quando l'Audiochat è indisponibile) è soddisfacibile perché l'indisponibilità di questo componente non lascia il modello in uno stato incoerente: un Permesso concesso che non produce effetto non è un invariante violato.

È inoltre il componente su cui insistono **A3** (l'Audiochat non è registrata né conservata: solo transito), **V3** (nessun instradamento su nodi non-UE) e la clausola di `budget_band` che esclude un costo per minuto privo di tetto impostabile. Tre vincoli con owner diverso convergono su un solo componente: è la ragione per cui è isolato.

#### 2.3 Componenti `technical` — nessun contesto di appartenenza

| Componente | Responsabilità unica | Scenari rivendicati |
|---|---|---|
| **ArchivioDiFile** | Custodisce i byte di un file caricato e ne restituisce la chiave con cui ritrovarlo | — |
| **TrasportoInTempoReale** | Consegna ai presenti in uno spazio i messaggi **già accettati** dal modulo che li possiede | **PE3** |
| **AvvisiInUscita** | Recapita fuori dall'app gli avvisi prodotti dai moduli | — |
| **MisurazioniDiUtilizzo** | Inoltra gli eventi d'uso al destinatario dell'analisi | — |
| **CadenzaDeiMeccanismiRicorrenti** | Innesca i meccanismi ricorrenti dei moduli; le azioni restano nei moduli proprietari | **RE1** |
| **RecapitoDeiFattiDiDominio** | Consegna i fatti pubblicati (E1–E6) ai loro consumatori, senza interpretarne il contenuto | **RE2**, **SE1** (lato transito), **PE1**, **PE2** |
| **CancellazioneDellAccount** | Su richiesta dell'Utente esegue la sequenza presso ogni detentore di dati personali e ne verifica l'esito | **SE3** |

##### ArchivioDiFile — un solo componente per due contesti, senza modello condiviso

Serve **Bacheca** e **AulaStudio** ed è `technical` proprio perché ha due contesti di attacco. Non porta modello: `FileArchiviato` **resta definito una volta per confine**, in Bacheca e in Aula studio separatamente, come già stabilito dagli aggregati approvati. Ciò che è comune è la capacità generic di archiviazione, che è un servizio e non un modello — è esattamente la distinzione con cui la Context Map ha respinto ogni libreria di dominio condivisa fra i due contesti in separate ways.

Non rivendica scenari e ha consumatori nominati (Bacheca, AulaStudio, CancellazioneDellAccount). È però **detentore a monte** nella catena di SE3, ed è il solo detentore di byte: la verifica del residuo non è totale se non raggiunge le sue chiavi.

##### TrasportoInTempoReale — consegna, non decide

Rivendica la seconda misura di **PE3** (messaggio visibile agli altri Partecipanti **p95 ≤ 1 s**). La formulazione della responsabilità contiene la clausola che ne definisce il perimetro: consegna messaggi **già accettati**. La decisione — titolo a scrivere per MG2, Permesso di Scrivere per MA2 — è avvenuta prima, dentro il modulo proprietario, su dato fresco. Questo componente **non conosce Membri, Partecipanti né Permessi**, e se li conoscesse sarebbe il componente `shared` di messaggistica che §1 ha escluso.

##### AvvisiInUscita e MisurazioniDiUtilizzo — due porte, due regimi opposti

**AvvisiInUscita** rappresenta insieme le capacità generic di notifica push e invio email: sono due trasporti diversi per un'unica responsabilità di dominio — recapitare fuori dall'app un avviso prodotto da un modulo. È anche il canale con cui, in esercizio non presidiato, il titolare viene raggiunto. Su di esso insistono l'esclusione 17 di V4 (nessun meccanismo di notifica push proprio su iOS: il trasporto è imposto dalla piattaforma) e V3 (regione UE dichiarata).

**MisurazioniDiUtilizzo** è l'unico componente la cui relazione è dichiarata **conformist**: si adotta il modello del destinatario senza traduzione, perché è un flusso a senso unico che non rientra nel dominio. La conseguenza è già registrata in V1 ed è severa: **non esistendo porta di traduzione, l'unico punto di controllo su ciò che esce è la selezione del fornitore**. È la ragione per cui la sezione Technology Stack non assegna alcun prodotto a questa voce: il componente esiste come posto dichiarato nell'architettura, e resta senza fornitore finché V1 e V3 non sono entrambi soddisfatti.

Nessuno dei due rivendica scenari; entrambi hanno consumatori nominati.

##### CadenzaDeiMeccanismiRicorrenti — innesca, non esegue

Rivendica **RE1** (dopo un'interruzione ≤ 24 h, 100% degli arretrati entro il ciclo successivo, 0 interventi manuali). La responsabilità è deliberatamente sottile: **innesca** i due meccanismi che il dominio nomina — la scadenza a 7 giorni degli Inviti (`InvitoAlGruppoScaduto`, `InvitoAllAulaStudioScaduto`) e la riconciliazione degli elementi orfani (`ElementiOrfaniDiAulaStudioRimossi`) — mentre **le azioni restano nei moduli proprietari**, che sono Gruppo e AulaStudio.

La separazione è ciò che impedisce a un componente tecnico di acquisire semantica di dominio: chi decide che un Invito è scaduto è l'aggregato `InvitoAlGruppo`, che lo porta in uno stato terminale (IG2) e pubblica un fatto con nome di dominio. Questo componente sa **quando chiedere**, non **che cosa succede**.

##### RecapitoDeiFattiDiDominio — il componente con più scenari rivendicati

È `technical` e **senza contesto**: trasporta i fatti E1–E6 **senza interpretarne il contenuto**. Rivendica quattro scenari perché quattro scenari misurano il tempo o l'affidabilità del transito e nient'altro:

| Scenario | Che cosa misura su questo componente |
|---|---|
| **RE2** | 0 perdite entro la finestra dello scenario corrispondente; ripresa autonoma ≤ 5 min, 0 riavvii manuali |
| **SE1** (lato transito) | La parte dei **p95 ≤ 5 s / p99 ≤ 15 s** spesa fra `MembroRimossoDalGruppo` e l'invocazione del consumatore nel core |
| **PE1** | I **p95 ≤ 5 s / p99 ≤ 15 s** fra accettazione dell'Invito ed esistenza di `Membro` o `Partecipante` (E5) |
| **PE2** | I **p95 ≤ 5 min** delle finestre in cui nessuno sta aspettando (E1, E3, E4, E6) |

Due precisazioni che ne delimitano il perimetro. La prima: il componente **non interpreta**, quindi non conosce la differenza fra un fatto della classe «pochi secondi» e uno della classe «pochi minuti» come *significato* — la conosce solo come corsia di consegna. La seconda: il modello di dominio gli regala l'idempotenza. G3 e AS3 rendono priva di effetto una seconda aggiunta dello stesso Utente, IG2 e IA1 rendono priva di effetto una seconda accettazione dello stesso Invito; nessun consumatore deve ricordare che cosa ha già elaborato per ragioni di dominio. È il motivo per cui RE2 ha difficoltà **M**.

Si noti infine ciò che **non** passa da qui: la scadenza degli Inviti e la riconciliazione degli orfani non sono fatti da consegnare ma meccanismi da innescare, e appartengono a CadenzaDeiMeccanismiRicorrenti. I due componenti sono separati perché rispondono a due scenari distinti (RE2 e RE1) con due modi di ripresa diversi.

##### CancellazioneDellAccount — trasversale per necessità, non per comodità

Rivendica **SE3**, scenario (H,H). Su richiesta dell'Utente esegue la sequenza presso **ogni detentore di dati personali** e ne verifica l'esito, con la clausola che ne definisce il limite: **non decide alcuna sorte**. Il discriminatore di V5 è **per tipo di contenuto**, e la sorte di ciascun tipo è decisa dal modulo che possiede il dato — Bacheca sa che un `Post` si anonimizza, Gruppo sa che un `Membro` si rimuove onorando G2, AulaStudio sa che un `AllegatoDiAulaStudio` conserva il file e anonimizza il solo `CaricatoDa`. Questo componente **orchestra e verifica**, non interpreta il modello altrui.

**Perché non poteva stare in Profilo**, che pure è il detentore dell'anagrafica e il punto naturale dove un Utente chiede di sparire: ospitarlo lì renderebbe Profilo **consumatore di Bacheca, Gruppo e Aula studio**, e la Context Map vieta ogni dipendenza che risalga verso Profilo. Sarebbe la violazione di una delle tre proprietà dichiarate da preservare, per giunta introdotta dal componente che deve dimostrare conformità a un vincolo hard.

**Perché non poteva essere distribuito nei moduli**, con ciascuno che elimina i propri dati alla ricezione di un fatto: SE3 non richiede solo che l'eliminazione avvenga, richiede **≥ 1 esecuzione di verifica con esito totale prima della scadenza**, e «totale» significa che ha coperto tutti i detentori. Una verifica totale ha bisogno di un punto che conosca l'elenco dei detentori.

**Forza sacrificata, dichiarata:** una responsabilità trasversale che conosce l'elenco dei detentori è **un punto da aggiornare a ogni nuovo detentore di dati personali**. Chi aggiunge domani un componente che tocca dati personali e dimentica di censirlo qui produce un residuo che nessun test rileva se non quello di SE3. È accettata perché SE3 è (H,H) e resterebbe altrimenti orfano — nessun altro componente può rivendicarlo — e perché con `maintenance_mode = unattended` una verifica end-to-end in un solo punto è la condizione perché la verifica esista davvero.

Si registra qui, senza risolverlo, che questo componente è il luogo in cui **R12** si manifesta: la sequenza deve scrivere colonne dichiarate immutabili dal dominio (B2, C2, AL2, MG1, MA1). Il conflitto ha due autorità esterne e appartiene al gate; l'architettura si limita a concentrarlo in **un solo percorso privilegiato**, ispezionabile.

#### 2.4 Componenti `experience`

| Componente | Contesti attraversati | Responsabilità unica | Scenari rivendicati |
|---|---|---|---|
| **FacciataDellApp** | Profilo, Bacheca, Gruppo, Aula studio | Espone al client **un unico contratto versionato**, componendo le letture e inoltrando i comandi ai moduli proprietari | **CO1** |
| **AppMobile** | — (client) | Presenta all'Utente le funzioni del prodotto e consuma **il solo contratto della facciata** | **CO1** |

**Perché sono due componenti e non uno.** Lo split è imposto da **V4**: i cicli di rilascio dei due sono strutturalmente disallineati, perché la pubblicazione dell'app passa da un'autorità esterna e quella del backend no. Modellarli come un unico componente renderebbe invisibile in architettura proprio la discontinuità che CO1 misura — **0 funzionalità che richiedano l'aggiornamento simultaneo**, nessuna versione dell'app resa inutilizzabile prima di **90 giorni**.

**Perché una sola facciata e non una per contesto.** La misura zero di CO1 andrebbe garantita su tante superfici quanti sono i contratti esposti, ciascuna con un proprio ritmo di evoluzione, davanti a un client il cui rilascio non è governato dal team. Con una sola facciata, la superficie di versionamento coincide con un punto solo — che è anche la condizione perché R11 resti gestibile: ciò che non si può correggere lato client in tempo utile deve poter essere corretto lato backend, in un punto.

**Forza sacrificata:** l'autonomia evolutiva di ciascun modulo verso il client. Un modulo non può esporre una novità senza passare dalla facciata, che diventa un punto unico da versionare con disciplina e un potenziale collo di bottiglia redazionale.

Due negazioni delimitano FacciataDellApp e vanno tenute ferme: **compone letture e inoltra comandi**, quindi non ospita regole di dominio; e non prende decisioni di autorizzazione, che appartengono ai moduli proprietari — Profilo per contattabilità e visibilità dei contenuti, Gruppo e AulaStudio per il proprio spazio.

#### 2.5 Contesti senza componente di dominio

**Accesso non è modellato.** Non esiste alcun modulo di dominio corrispondente: il contesto è interamente generic ed è rappresentato dal solo componente `integration` **PortaIdentitàUtente**. Le sei capacità generic — autenticazione, archiviazione dei file, trasporto in tempo reale, notifiche push, invio email, analytics — sono rappresentate **esclusivamente** dai componenti `integration` e `technical` sopra elencati, e da nessun altro.

### 3. Relazioni fra componenti

Ogni riga dichiara il pattern di relazione, l'interfaccia pubblicata che attraversa il confine e i consumatori nominati. Nessuna relazione compare qui se non è già una linea della Context Map o una conseguenza diretta di uno scenario bloccato.

| Da → A | Pattern | Interfaccia pubblicata | Consumatori |
|---|---|---|---|
| PortaIdentitàUtente → Profilo | anti-corruption layer | `UtenteDiDominio` | Profilo |
| Profilo → Bacheca, Gruppo, AulaStudio | customer/supplier + open-host service con published language **unico, versionato, non specializzato** | `RiferimentoUtente` | Bacheca, Gruppo, AulaStudio, FacciataDellApp |
| Profilo → chi legge contenuti | open-host service | `DecisioneDiContattabilità`, `DecisioneDiVisibilitàDeiContenuti` | Bacheca, FacciataDellApp |
| Gruppo → AulaStudio | partnership, **contratto di appartenenza**; ACL sul lato Aula studio | `AppartenenzaAlGruppo`, `FattoDiDecadenzaDellAppartenenza` | AulaStudio |
| AulaStudio → Gruppo | partnership, **contratto d'indice**; ACL sul lato Gruppo | `EtichettaDellAulaStudio` (titolo, `DataOraDiInizio`, **mai stato**) | Gruppo |
| Bacheca ⟂ Gruppo, Bacheca ⟂ AulaStudio | separate ways | — | — |
| Bacheca, AulaStudio → ArchivioDiFile | anti-corruption layer sottile | `FileCustodito` | Bacheca, AulaStudio |
| Gruppo, AulaStudio → TrasportoInTempoReale | anti-corruption layer sottile | `ConsegnaAiPresenti` | Gruppo, AulaStudio |
| AulaStudio → PortaAudiochat | anti-corruption layer sottile | `CanaleAudioDellAulaStudio` | AulaStudio |
| Profilo, Gruppo, AulaStudio → AvvisiInUscita | anti-corruption layer sottile | `AvvisoDaRecapitare` | AvvisiInUscita |
| moduli → MisurazioniDiUtilizzo | **conformist** | modello del destinatario | — |
| moduli → RecapitoDeiFattiDiDominio → moduli | pubblicazione e consumo dei fatti E1–E6 | `FattoDiDominio` | AulaStudio (E2, E4), Bacheca (E3), Gruppo (E6), tutti (E1) |
| moduli → CadenzaDeiMeccanismiRicorrenti | customer/supplier, moduli a monte | `MeccanismoRicorrente` | CadenzaDeiMeccanismiRicorrenti |
| moduli, ArchivioDiFile → CancellazioneDellAccount | customer/supplier, moduli a monte | `EliminazioneDeiDatiPersonali`, `AnonimizzazioneDeiContributi`, `VerificaDelResiduo` | CancellazioneDellAccount |
| moduli → FacciataDellApp → AppMobile | customer/supplier + published language versionato | `ContrattoVersoIlClient` | AppMobile |

#### Letture obbligate della tabella

**Un solo contratto da Profilo, non tre.** L'open-host è **identico per i tre consumatori e non specializzato per nessuno**: non esiste un contratto «per la Bacheca» e uno «per l'Aula studio». Sul contratto viaggiano però **due cose con due modi di scambio diversi** — `RiferimentoUtente` è distribuito ai consumatori e tollera la finestra di E1 (pochi minuti); `DecisioneDiContattabilità` e `DecisioneDiVisibilitàDeiContenuti` sono **interrogate sincrone** e non si copiano mai, perché SE2 esige 0 finestre di visibilità indebita.

**Due contratti disgiunti fra Gruppo e AulaStudio, con ACL sul lato consumatore.** Nel verso dell'appartenenza passa un **fatto**, non un modello: l'ACL del core lo traduce in titolo di ammissione, e **la parola Membro non entra in AulaStudio**. Nel verso dell'indice passa un'etichetta minima, e la clausola «mai stato» non è pleonastica: AS8 stabilisce che l'`AulaStudio` non possiede alcuno stato di ciclo di vita, quindi non può pubblicarne uno. La distinzione fra Aula studio programmata ed estemporanea è **derivata da chi consuma**, guardando se la `DataOraDiInizio` c'è.

**`FattoDiDecadenzaDellAppartenenza` viaggia sul contratto di appartenenza, non su quello d'indice.** È la clausola che impedisce il ciclo: se un'informazione di appartenenza comparisse sul contratto d'indice, o un'informazione d'indice su quello di appartenenza, i due versi insisterebbero sullo stesso contratto e la proprietà 1 della Context Map cadrebbe.

**MisurazioniDiUtilizzo è l'unica riga senza consumatore nominato**, ed è corretto: è un flusso a senso unico che non rientra nel dominio, nulla di ciò che esprime torna indietro a decidere qualcosa. È anche l'unica riga in cui il pattern è conformist, con la conseguenza già registrata su V1.

**Ciò che non compare nella tabella è altrettanto vincolante.** Non esiste alcuna riga da Bacheca verso Gruppo o AulaStudio, né in senso inverso: un `Post` pubblicato non entra mai negli spazi del Gruppo. Non esiste alcuna riga che risalga verso Profilo. Non esiste alcuna riga fra i due `MessaggioDiChat`. Non esiste alcun consumatore di `MessaggioDiChatInviato`, perché non è un fatto di dominio.

### 4. Proprietà verificate sul grafo

Le verifiche seguenti sono meccaniche e vanno rieseguite a ogni modifica della scomposizione: sono la contropartita del fatto che, in un monolite modulare, la violazione di un confine non produce alcun sintomo immediato.

| Proprietà | Esito | Fondamento |
|---|---|---|
| **Nessun ciclo su uno stesso contratto** | verificata | I due versi Gruppo ↔ AulaStudio insistono su contratti disgiunti: appartenenza in un verso, indice nell'altro |
| **Nessuna dipendenza risale verso Profilo** | verificata | Profilo è supplier e mai consumatore. È la ragione per cui CancellazioneDellAccount è `technical` e non parte di Profilo |
| **Il core conserva esattamente due dipendenze di dominio** | verificata | Profilo (`RiferimentoUtente`, decisioni di privacy) e Gruppo (`AppartenenzaAlGruppo`). Le porte tecniche — ArchivioDiFile, TrasportoInTempoReale, PortaAudiochat, AvvisiInUscita, RecapitoDeiFattiDiDominio — **non contano come dipendenze di dominio**, perché non portano modello |
| **Un solo componente `domain` per bounded context modellato** | verificata | Quattro contesti, quattro moduli; Accesso senza modulo per decisione dichiarata |
| **Entrambi gli scenari (H,H) sono rivendicati** | verificata | **SE1** da AulaStudio, Gruppo e RecapitoDeiFattiDiDominio; **SE3** da CancellazioneDellAccount, con i quattro moduli e ArchivioDiFile come detentori a monte |
| **Nessun componente senza scenario rivendicato o senza consumatore nominato** | verificata | Bacheca, PortaIdentitàUtente, ArchivioDiFile, AvvisiInUscita e MisurazioniDiUtilizzo non rivendicano scenari, e tutti hanno consumatori nominati in §3 |
| **Nessuno scenario resta orfano** | verificata | Vedi copertura sotto |

#### Copertura degli scenari sui componenti

| Scenario | Componenti che lo rivendicano |
|---|---|
| **SE1** (H,H) | Gruppo (emissione), RecapitoDeiFattiDiDominio (transito), AulaStudio (effetto e 0 ammissioni indebite) |
| **SE2** | Profilo |
| **SE3** (H,H) | CancellazioneDellAccount |
| **RE1** | CadenzaDeiMeccanismiRicorrenti |
| **RE2** | RecapitoDeiFattiDiDominio |
| **RE3** | nessun singolo componente: è una **proprietà del sistema** rispetto alle dipendenze esterne, e il suo valore numerico resta `null` finché i fornitori non sono determinati |
| **RE4** | PortaAudiochat, con AulaStudio come componente che resta operativo |
| **PE1** | RecapitoDeiFattiDiDominio (corsia dei fatti con qualcuno in attesa) |
| **PE2** | RecapitoDeiFattiDiDominio (corsia dei fatti senza nessuno in attesa) |
| **PE3** | AulaStudio (apertura composta), TrasportoInTempoReale (messaggio visibile agli altri) |
| **PE4** | PortaAudiochat come punto di misura del consumo; la regola di precedenza (si rinegozia la banda di budget, **mai** V3) non appartiene ad alcun componente |
| **CO1** | FacciataDellApp, AppMobile |
| **MA1** | PortaAudiochat |
| **MA2** | AulaStudio, misurato sui confini verso Profilo, Bacheca e Gruppo |

Due righe meritano una nota, perché sono le uniche in cui la rivendicazione non è piena.

**RE3 non è rivendicato da alcun componente**, ed è deliberato: la sua misura di risposta è un **tetto** — la disponibilità promessa non può superare il minimo delle dipendenze esterne — che nessun componente può garantire da solo. Vincola la selezione dei fornitori dietro PortaAudiochat, ArchivioDiFile, TrasportoInTempoReale e AvvisiInUscita, e vincola ciò che si promette agli Utenti. Finché il valore delle dipendenze resta `null`, la regola esiste e la cifra no.

**PE4 è rivendicato solo per la parte misurabile.** PortaAudiochat è il punto in cui i minuti-partecipante si contano; la soglia di allerta a 2.100 e la regola che al superamento del tetto si rinegozia la banda di budget e mai gli obblighi di protezione dei dati personali sono **decisioni**, non responsabilità di un componente.

### 5. Ciò che non è stato introdotto, e perché

Ogni voce è una proposta plausibile scartata, con la forza sacrificata dichiarata. Riproporne una è una modifica della scomposizione, non un completamento.

| Componente non introdotto | Ragione dello scarto |
|---|---|
| **Componente `shared` di messaggistica** | Le due verifiche che precedono la scrittura sono diverse (MG2 titolo a scrivere, MA2 Permesso di Scrivere) e appartengono agli aggregati degli spazi. La sola parte comune, priva di semantica, è già estratta in TrasportoInTempoReale |
| **Componente per `AlberoOrganizzativo`** | Nessuna forza nominata su uno scenario bloccato. Le sue invarianti di forma sono locali all'aggregato. *Sacrificata*: la contesa in scrittura fra riordino delle Cartelle ed entrata/uscita dal Gruppo resta a livello di aggregato |
| **Componente per contesto Accesso** | Accesso è interamente generic e non si modella: è rappresentato dalla sola PortaIdentitàUtente |
| **Componente per aggregato dentro il core** | Trasformerebbe in composizione fra componenti le letture che PE3 misura a **p95 ≤ 800 ms** e le verifiche su dato fresco di AL4, MA2 e AL3 |
| **Componente di moderazione trasversale** (segnalazione, blocco fra Utenti, rimozione dichiarata) | Preteso da V4 ma **assente dal modello di dominio approvato**: introdurlo sarebbe una modifica del modello. È il conflitto **R10**, con due autorità esterne, portato al gate. L'architettura registra il posto vuoto e non lo riempie |
| **Componente di audit trail delle azioni di moderazione** | Legato allo stesso conflitto R10: senza segnalazione e blocco, non è determinato che cosa andrebbe tracciato |
| **Componente di ricerca o indicizzazione** | Nessuno scenario bloccato lo nomina; l'unico modello di lettura ammesso è l'indice delle Collocazioni, che è di dominio e appartiene a Gruppo |
| **Componente di gestione dei consensi separato** | V2 richiede che informativa e base giuridica precedano la raccolta dei dati di Onboarding, e il modello lo soddisfa già ammettendo un `Profilo` con `StatoOnboarding` non completato (P1, IP1). Un componente dedicato aggiungerebbe un detentore di dati personali alla catena di SE3 senza rispondere a nulla di misurato |

## Data Architecture

L'architettura dei dati traduce in schemi, transazioni e percorsi di cancellazione ciò che il modello di dominio ha già deciso: **un aggregato è un confine di consistenza**, **un contesto possiede i propri dati**, **nessun modello è condiviso fra contesti**. Non introduce alcun archivio che non sia già stato nominato — un solo store relazionale, un solo object store per i byte — e non introduce alcuna copia che non abbia un percorso di cancellazione che la raggiunga entro i 30 giorni di V5.

Due vincoli con owner esterno governano ogni riga di questa sezione: **V3** (`data_residency = eu-only`: regione UE dichiarata per i dati a riposo e in transito) e **V5** (eliminazione o anonimizzazione irreversibile entro 30 giorni su **ogni** replica, file archiviati inclusi). Ogni scelta che segue è verificabile contro l'uno o contro l'altro.

### 1. Persistenza e proprietà dei dati

Un'**unica istanza di store relazionale**, organizzata in **quattro schemi logici disgiunti** — `profilo`, `bacheca`, `gruppo`, `aula_studio` — più uno schema tecnico `cancellazione`. La corrispondenza con i componenti `domain` è biunivoca: un modulo, uno schema.

**Ogni modulo accede esclusivamente al proprio schema, e l'accesso incrociato è negato dal motore**, non affidato a una convenzione di codice. È la stessa disciplina applicata ai confini di modulo dallo stile architetturale, portata al livello dei dati: in un monolite modulare la violazione di un confine non produce alcun sintomo immediato, e una join che attraversa due schemi è precisamente il modo in cui MA2 diventa insoddisfacibile senza che nessuno se ne accorga.

#### Perché una sola istanza e non quattro

Entro la banda di capacità bloccata — ≤ 500 Utenti registrati, ≤ 10 Aule studio simultanee, ≤ 15 Partecipanti per Aula studio — **nessun contesto richiede dimensionamento indipendente**. Quattro istanze moltiplicherebbero per quattro: i backup, i percorsi di ripristino, le configurazioni di regione UE da verificare (V3), e soprattutto **le scansioni di verifica del residuo di SE3**, che deve produrre un esito **totale** su tutti i detentori prima della scadenza. Con `team_size = 1` e `maintenance_mode = unattended`, quattro superfici da verificare sono quattro occasioni per una verifica parziale che si crede totale.

#### Regole vincolanti sugli schemi

- **Nessuna foreign key fra schemi e nessuna query che ne unisca due.** I riferimenti fra contesti sono **identificatori nudi** — `UtenteId`, `GruppoId`, `AulaStudioId` — senza integrità referenziale imposta dal motore. Non è un compromesso: è la traduzione fedele di **C3** (il `Commento` non garantisce l'esistenza del `Post`), **AL3** (l'`ArgomentoId` è verificato al comando, non al commit) e **AS9**, che già dichiarano di non garantire l'esistenza al commit. Una foreign key fra schemi prometterebbe una garanzia che il modello ha esplicitamente rifiutato di dare.
- **Foreign key obbligatorie dentro lo schema**, dove esprimono un contenimento reale e verificabile al commit: `bacheca.allegato → bacheca.post` **con cancellazione a cascata** (B4, l'unica cascata dell'intero modello: non esiste `Allegato` senza `Post` nemmeno per un istante), `gruppo.membro → gruppo.gruppo`, `aula_studio.partecipante → aula_studio.aula_studio`.
- **`Accesso` non ha schema.** Non è un contesto modellato e non possiede dati di dominio: la sua unica presenza nell'architettura è la PortaIdentitàUtente, che traduce e non persiste.

#### Rischio accettato, messo a registro

L'isolamento fra schemi è **revocabile da chi amministra l'istanza** — è una regola del motore, non una barriera fisica — e un consumo anomalo di uno schema si ripercuote sugli altri, non essendoci separazione di risorse. Il primo effetto è mitigato dal fatto che chi amministra e chi costruisce coincidono, quindi la revoca sarebbe deliberata e non accidentale. Il secondo, entro la banda bloccata, non è materiale.

### 2. Confini transazionali — una transazione, un aggregato

La regola generale è quella del modello: **si scrive un aggregato per transazione**. Ogni riga della tabella seguente elenca ciò che sta *dentro* una transazione perché un invariante lo esige, e l'ultima riga elenca ciò che non vi entra mai.

| Scrittura | Confine | Fondamento |
|---|---|---|
| `Post` con i suoi `Allegato` | **una transazione** | B4: nessun Allegato orfano nemmeno per un istante |
| `Gruppo` con l'insieme dei `Membro` | **una transazione** | G2 (esiste sempre almeno un Moderatore), G3 (un `UtenteId` al massimo una volta): affermazioni sull'insieme |
| `AulaStudio` con `Partecipante` e `Permessi` | **una transazione** | AS2–AS5: affermazioni sull'insieme dei Partecipanti e sulla buona formazione dei Permessi |
| `AlberoOrganizzativo` con le `Cartella` | **una transazione** | A2–A4: invarianti di forma sull'intera struttura |
| `Profilo` + `ImpostazioniDiPrivacy` | **una transazione — unica eccezione dichiarata** | IP1: nascono nella stessa scrittura, con default restrittivo |
| Ogni altra coppia di aggregati | **mai nella stessa transazione** | IG3, IA3 (l'accettazione non crea Membro o Partecipante), E5 |

#### L'unica eccezione, e perché è tale

`Profilo` e `ImpostazioniDiPrivacy` sono **due aggregati distinti** con lifecycle indipendenti, e nondimeno nascono nella stessa transazione. È l'unico punto del modello in cui due aggregati condividono una scrittura, ed è deliberato: IP1 stabilisce che **non esiste alcuna finestra in cui un Utente esista privo di regole di privacy**, nemmeno con Onboarding incompleto. Se le Impostazioni nascessero per reazione a un fatto, esisterebbe una finestra — misurata in millisecondi o in minuti, poco importa — in cui una domanda di visibilità non avrebbe risposta, e SE2 esige **0 finestre di visibilità indebita**.

È anche il punto in cui V2 e il modello coincidono: il `Profilo` deve poter esistere con `StatoOnboarding` non completato, quindi la scrittura iniziale non contiene nome, cognome, `Università` né `CorsoUniversitario` — contiene un `UtenteId` e due regole di privacy al default più restrittivo.

#### Isolamento e concorrenza

Livello di isolamento **read committed** come default, con **blocco ottimistico per versione** su `Gruppo`, `AulaStudio` e `AlberoOrganizzativo` — i tre aggregati i cui invarianti sono **affermazioni sull'insieme**.

Il conflitto tipico è nominabile: **due Moderatori che retrocedono contemporaneamente l'ultimo Moderatore**. Ciascuna transazione, letta da sola, vede due Moderatori e conclude che la retrocessione è lecita; insieme produrrebbero uno spazio senza Moderatore, violando G2 e AS2. Il conflitto è **respinto dal confronto di versione** — la seconda scrittura trova la versione cambiata e fallisce — non da una serializzazione globale, che costerebbe su ogni scrittura per un caso che entro la banda bloccata è raro.

Gli aggregati minuscoli — `MessaggioDiChat` di entrambi i contesti, `Commento`, `AllegatoDiAulaStudio`, `Invito`, `InvitoAlGruppo` — **non portano versione**: sono immutabili dopo la creazione (MG1, MA1) oppure hanno stati terminali (IG2, IA1), e in entrambi i casi non esiste una scrittura concorrente da respingere.

### 3. Consistenza differita — la tabella dei fatti in uscita

**Ogni schema possiede la propria tabella dei fatti in uscita.** Il fatto di dominio è scritto **nella stessa transazione dell'aggregato che lo produce**: o esistono entrambi, o nessuno dei due. È la condizione senza la quale RE2 (**0 perdite**) non è dimostrabile — un fatto pubblicato fuori dalla transazione è un fatto che può mancare quando la scrittura riesce, o esistere quando la scrittura fallisce.

| Fatto | Da → A | Finestra | Note di persistenza |
|---|---|---|---|
| **E1** nome / affiliazione accademica | `profilo` → le tre copie locali | p95 ≤ 5 min | tre tabelle `riferimento_utente` distinte, una per schema consumatore |
| **E2** decadenza dell'appartenenza | `gruppo` → `aula_studio` | **p95 ≤ 5 s, p99 ≤ 15 s** | corsia a priorità più alta: è **SE1** |
| **E3** `Post` eliminato → `Commento` | interno a `bacheca` | p95 ≤ 5 min | differito benché nello stesso schema: sono **due aggregati** |
| **E4** `Argomento` eliminato → Allegati sciolti | interno a `aula_studio` | p95 ≤ 5 min | `argomento_id` posto a null, **nessuna cancellazione di file** |
| **E5** Invito accettato → `Membro` / `Partecipante` | interno a ciascuno schema | **p95 ≤ 5 s** | idempotente per G3/AS3 e per terminalità di IG2/IA1: **nessun registro di deduplica** |
| **E6** Aula studio eliminata → `Collocazione` | `aula_studio` → `gruppo` | p95 ≤ 5 min | rimozione del riferimento dall'`AlberoOrganizzativo` |

#### Tre letture obbligate

**E3 è differito benché produttore e consumatore siano nello stesso schema.** Sarebbe stato tecnicamente possibile eliminare `Post` e `Commento` nella stessa transazione, essendo tabelle vicine. Non si fa, perché **sono due aggregati** e C3 dichiara esplicitamente che il `Commento` non garantisce l'esistenza del `Post`. La prossimità fisica non è un motivo per violare un confine di consistenza: se lo fosse, il confine sarebbe determinato dallo schema anziché dal dominio.

**E4 non cancella nulla.** L'eliminazione di un `Argomento` pone a null l'`argomento_id` degli `AllegatoDiAulaStudio` che vi erano raccolti, e **non tocca l'object store**. È l'esatto opposto di B4: là il file segue il `Post` nella cascata, qui il materiale di studio sopravvive alla scomparsa del contenitore. La stessa filosofia di A6, dove l'eliminazione di una `Cartella` fa risalire le `Collocazione` al genitore: **riorganizzare non distrugge mai**.

**E5 non ha registro di deduplica, e non per distrazione.** Una seconda consegna dell'accettazione è priva di effetto per invariante: G3 e AS3 impediscono che un `UtenteId` compaia due volte, IG2 e IA1 rendono priva di effetto una seconda accettazione di un Invito già in stato terminale. La difesa contro la doppia consegna è **una proprietà del modello**, e costruire una tabella di deduplica per E5 significherebbe pagare due volte una garanzia che si ha già.

#### Conservazione dei fatti consegnati

I fatti consegnati sono **conservati 7 giorni e poi purgati**. Non sono mai fonte di verità — lo stato corrente è nelle tabelle degli aggregati, ed **event sourcing è escluso** da V1 (nessun archivio append-only immutabile per i contenuti dell'Utente).

La purga ha una ragione che non è di spazio ma di conformità: **i payload di E1 trasportano nome, cognome e `Università`**, cioè dati personali. Una tabella di fatti conservata indefinitamente sarebbe una replica di dati personali priva di percorso di cancellazione — l'esclusione 2 della sezione Constraints. I 7 giorni sono ampiamente sotto i 30 di V5, e le righe residue restano comunque **raggiungibili dalla catena di cancellazione** (§7), perché la purga è un meccanismo di igiene e non una garanzia di conformità.

#### I meccanismi ricorrenti non usano questo canale

La scadenza degli Inviti a 7 giorni e la riconciliazione degli elementi orfani lavorano **per interrogazione dello stato**, non su una coda di promemoria. La differenza è ciò che rende RE1 soddisfacibile senza alcun meccanismo di recupero: dopo un'interruzione ≤ 24 h **non c'è nulla da recuperare** — c'è una query che al ciclo successivo trova più righe di prima. Un Invito con istante di scadenza passato e stato non terminale è tale indipendentemente da quante volte il ciclo è stato saltato.

È la ragione per cui l'esclusione 8 (meccanismi che, saltando un ciclo, non recuperano da soli) è soddisfatta **per costruzione** e non per aggiunta di un compensatore.

### 4. Copie locali del `RiferimentoUtente`

Tre tabelle — `bacheca.riferimento_utente`, `gruppo.riferimento_utente`, `aula_studio.riferimento_utente` — con `utente_id`, nome, cognome, `Università`, `CorsoUniversitario` e istante dell'ultimo aggiornamento. Sono **create** da `OnboardingCompletato` e **aggiornate** da `NomeUtenteAggiornato` e `AffiliazioneAccademicaAggiornata`.

La distinzione fra creazione e aggiornamento è quella del catalogo eventi: `ProfiloCreato` **non** le crea, perché in quel momento l'Utente ha un'identità ma non un'identificabilità — non ha nome, non ha `Università` — e una copia locale creata lì sarebbe vuota.

#### La regola dura

> Le tre copie locali servono **unicamente a mostrare chi è**. La `Visibilità` **Ateneo** (G5, AS7) e le decisioni di privacy **non le leggono mai**.

È la separazione più importante di questa sezione, e ha una motivazione numerica esatta: la tolleranza delle copie locali è quella di **E1, cioè minuti**, mentre **SE2 esige 0 finestre di visibilità indebita** e AS7 esige che l'appartenenza dell'aspirante Partecipante a un ateneo si valuti **su dato fresco del `Profilo`**. Decidere un'ammissione su una copia vecchia di qualche minuto significa ammettere una finestra che due decisioni bloccate hanno dichiarato inammissibile.

La formula da tenere a mente è quella già fissata dalla Context Map: **dato anagrafico propagato, decisione di autorizzazione interrogata**. Le tre tabelle stanno dalla parte del primo, e non attraversano mai la linea.

#### Conseguenza su V5

Le tre copie sono **repliche di dati personali** a tutti gli effetti — contengono nome, cognome, `Università`, `CorsoUniversitario` — e figurano quindi come **detentori censiti** nella catena di eliminazione (§7). Sono eliminate, non anonimizzate: non portano alcun contributo altrui che vada preservato.

### 5. Modelli di lettura

**Nessun database di lettura separato e nessuna duplicazione dello stato per query.** Entro la banda bloccata, **PE3** (apertura dell'Aula studio con Partecipanti, Argomenti e Allegati, **p95 ≤ 800 ms**) è raggiungibile con indici su `aula_studio_id` e `gruppo_id` e letture dirette dalle tabelle degli aggregati, composte in memoria dalla facciata.

La ragione dell'assenza è la stessa che governa tutta la sezione: ogni proiezione è una replica, ogni replica di dati personali è un detentore in più nella catena di SE3, e ogni detentore in più è un punto in cui la verifica del residuo può risultare parziale. Con `maintenance_mode = unattended`, una proiezione dimenticata è un residuo che nessuno vedrà.

#### L'unica proiezione ammessa è di dominio

Esiste **un solo modello di lettura**, ed è l'**indice delle Collocazioni** in `gruppo`. Non è un'ottimizzazione: è **il contratto d'indice della partnership**, che la Context Map ha istituito e che il componente Gruppo consuma. È alimentato dai sei fatti del core — creazione, rinomina, riprogrammazione, collocazione, scollocazione, eliminazione — e conserva:

- `aula_studio_id`;
- titolo;
- `DataOraDiInizio`, con la convenzione dichiarata: **assente = estemporanea**;
- **nessun campo di stato**.

L'ultima riga è vincolante e discende da **AS8**: l'`AulaStudio` non possiede alcuno stato di ciclo di vita — non esiste «programmata», «in corso», «conclusa» — quindi non può pubblicarne uno, e l'indice non può conservarlo. La distinzione fra Aula studio programmata ed estemporanea è **derivata da chi legge**, guardando se la data c'è. Aggiungere qui una colonna di stato sarebbe la porta d'ingresso del termine «Sessione», già eliminato dal linguaggio ubiquo, e richiederebbe un evento al raggiungimento della `DataOraDiInizio` che il catalogo non contiene.

È **l'unica proiezione cross-contesto ammessa**, e lo è perché il contratto d'indice la impone — non perché una query fosse lenta.

### 6. File binari

I byte risiedono **fuori dal database**, in un **object store con regione UE dichiarata** (V3). Il relazionale conserva soltanto il value object `FileArchiviato` — **chiave opaca, nome, tipo, dimensione** — nelle tabelle `bacheca.allegato` e `aula_studio.allegato_di_aula_studio`.

Si noti che `FileArchiviato` è **definito due volte**, una per contesto, come stabilito dagli aggregati approvati: stessa forma, nessuna definizione condivisa, coerentemente con il separate ways fra Bacheca e Aula studio. Le regole di validità sono anch'esse enunciate due volte — B3 e AL1: chiave non vuota, nome non vuoto, tipo ∈ {PDF, immagine, file testuale}, dimensione > 0 e ≤ 25 MB — e possono divergere in futuro senza rompere nulla.

#### Convenzione delle chiavi

Prefisso **per contesto e proprietario logico**:

```
bacheca/{post_id}/...
aula-studio/{aula_studio_id}/...
```

e **mai per `UtenteId`**. La ragione è direttamente V5: **i file dell'`AllegatoDiAulaStudio` sono conservati** anche quando chi li ha caricati cancella l'account — si anonimizza il solo `CaricatoDa` — e una chiave contenente l'identificatore dell'Utente sarebbe **essa stessa un dato personale non cancellabile**, perché nominata dentro un oggetto che deve sopravvivere. Il prefisso per contesto rende inoltre la scansione di verifica di SE3 percorribile per proprietario logico: si cercano i file di un `Post` eliminato, non i file di un Utente.

#### Simmetria dei cicli di vita, ribadita sulle chiavi

| Caso | Sorte del file |
|---|---|
| `Post` eliminato | i file dei suoi `Allegato` sono **cancellati**; `PostEliminato` porta le chiavi come ultimo atto in cui sono nominabili (B4) |
| `Argomento` eliminato | **nessun file cancellato**: gli Allegati tornano sciolti (E4) |
| Aula studio eliminata | i file degli orfani sono rimossi dalla riconciliazione, che ne pubblica le chiavi (`ElementiOrfaniDiAulaStudioRimossi`) |
| Account eliminato | i file dell'`AllegatoDiAulaStudio` sono **conservati** (V5) |

### 7. Catena di eliminazione a 30 giorni

Lo schema `cancellazione` contiene un **registro** con: `utente_id`, istante della richiesta, **scadenza calcolata** (richiesta + 30 giorni), stato per ciascun detentore, esito della verifica. **Nessun altro dato personale vi risiede** — il registro nomina un identificatore e conta esiti, e non contiene nome, cognome, `Università` né alcun contenuto.

La sequenza è **avviata immediatamente alla richiesta** — non a ridosso della scadenza — e **ritentata fino a esito**. I 30 giorni sono il termine massimo imposto da V5, non il tempo previsto di esecuzione: avviare subito lascia margine per i ritentativi e per almeno una verifica prima della scadenza, come SE3 richiede.

#### Sequenza per detentore

| Detentore | Operazione |
|---|---|
| `profilo` | eliminazione di `Profilo` e `ImpostazioniDiPrivacy`, e delle righe di outbox residue che ne portano il nome |
| `bacheca` | `Post` e `Commento` **anonimizzati** (autore sostituito), `riferimento_utente` **eliminato** |
| `gruppo` | `Membro` **rimosso onorando G2**, `InvitoAlGruppo` lato destinatario eliminato, messaggi **anonimizzati**, `riferimento_utente` eliminato |
| `aula_studio` | `Partecipante` **rimosso onorando AS2**, `Invito` eliminato, messaggi **anonimizzati**, `CaricatoDa` **anonimizzato con file conservato**, `riferimento_utente` eliminato |
| object store | **nessuna cancellazione** dei file dell'Aula studio; cancellazione dei file legati a `Post` eliminati |

Due clausole meritano di essere lette insieme al modello. **«Onorando G2 e AS2»** significa che la rimozione dell'ultimo Moderatore non è eseguita alla cieca: l'invariante che impone almeno un Moderatore per spazio vale anche qui, e la catena deve promuovere o comunque risolvere il caso prima di rimuovere — è il punto in cui V5 incontra un invariante che non può violare senza lasciare uno spazio ingovernabile.

**Le righe di outbox residue che portano il nome** sono la parte più facile da dimenticare: i payload di E1 trasportano nome, cognome e `Università`, e sono repliche a tutti gli effetti. La purga a 7 giorni ne limita la permanenza, ma **non la garantisce**: se una riga esiste ancora al momento della richiesta, la catena la raggiunge. È l'applicazione letterale dell'esclusione 2, che vale «anche quando l'evento che ne trasportava il riferimento è già passato».

#### Anonimizzazione irreversibile

L'`utente_id` è sostituito con un **identificatore casuale nuovo**, e **nessuna mappa è conservata in alcun luogo**. Una mappa identificatore → pseudonimo sarebbe **pseudonimizzazione e non cancellazione**, esplicitamente esclusa da V5 (esclusione 19).

La conseguenza pratica va dichiarata perché è irreversibile in senso letterale: dopo l'anonimizzazione **non è più possibile stabilire che due `Post` anonimizzati appartenessero alla stessa persona**, né rispondere a una richiesta successiva su quei contenuti. È il comportamento voluto.

#### Verifica del residuo — SE3

Una **scansione per `utente_id`** su tutti gli schemi e sulle chiavi dell'object store, eseguita **almeno una volta prima della scadenza**, con esito registrato nel registro di `cancellazione`. L'esito richiesto è **0 record e 0 file**.

«Totale» significa che la scansione ha coperto **tutti** i detentori censiti: i quattro schemi di dominio, le tre tabelle `riferimento_utente`, le tabelle dei fatti in uscita, il registro stesso e l'object store. È qui che si paga la forza sacrificata già dichiarata per il componente CancellazioneDellAccount — **l'elenco dei detentori è un punto da aggiornare a ogni nuovo detentore**: un detentore non censito produce un residuo che solo il test di SE3 può rilevare, e solo se l'elenco è aggiornato.

#### Backup

| Parametro | Valore |
|---|---|
| Ripristino a un punto nel tempo | **3 giorni** |
| Copie giornaliere conservate | **14 giorni** |
| Oltre | **nulla** |

Niente di più, perché **V5 esclude backup di durata indefinita e non purgabili** (esclusione 18). Un backup che sopravvive ai 30 giorni è una replica di dati personali senza percorso di cancellazione.

**Dopo qualunque ripristino, il registro delle cancellazioni è ri-applicato prima del rientro in servizio.** È la clausola che rende i backup compatibili con V5 senza doverli rendere modificabili: un ripristino riporta in vita dati che erano stati eliminati o anonimizzati, e la ri-applicazione li rimuove di nuovo. La finestra da ri-applicare **non supera mai i 3 giorni**, cioè l'orizzonte del ripristino a un punto nel tempo, ed è la ragione per cui il registro conserva `utente_id` e scadenza anche dopo il completamento della sequenza.

Si noti che la ri-applicazione è **automatica e parte della procedura di rientro**, non un passo manuale: l'esclusione 7 vieta componenti che richiedano intervento manuale per riprendersi, e un ripristino seguito da una ri-applicazione dimenticata sarebbe una violazione di V5 prodotta da una procedura di ripristino.

### 8. Adeguamento del modello richiesto da R12

L'anonimizzazione di V5 impone di **scrivere colonne che il dominio dichiara immutabili**:

| Colonna | Invariante che la dichiara immutabile |
|---|---|
| `bacheca.post.autore_id` | **B2** — autore del `Post` obbligatorio e immutabile |
| `bacheca.commento.autore_id` | **C2** — `PostId` e autore obbligatori e immutabili |
| `aula_studio.allegato_di_aula_studio.caricato_da` | **AL2** — `CaricatoDa` immutabile |
| colonne autore dei due `messaggio_di_chat` | **MG1**, **MA1** — messaggi immutabili dopo l'invio |

La risoluzione adottata **non rimuove l'immutabilità dal dominio**: le colonne restano **immutabili per il dominio** — nessun comando applicativo può modificarle, e nessun aggregato espone un'operazione che le tocchi — e sono **scrivibili solo dalla catena di cancellazione**. Un solo percorso privilegiato, individuabile e ispezionabile.

È una mitigazione, non una soluzione: **R12 resta un conflitto aperto con due autorità esterne** — l'Autorità di controllo e il proprietario del modello di dominio approvato — e appartiene al gate. Ciò che l'architettura dei dati fa è renderlo **concentrato invece che diffuso**: se il gate decidesse diversamente, il punto da modificare è uno.

Vi rientra la conseguenza già registrata e che va dichiarata nell'informativa: **un `AllegatoDiAulaStudio` caricato da chi ha cancellato l'account resta accessibile**, con il solo `CaricatoDa` anonimizzato. Se questo non è detto prima della raccolta, **V5 e V2 si contraddicono nei fatti** — l'Utente avrebbe chiesto l'eliminazione senza sapere che parte del suo contributo sopravvive.

### 9. Ciò che non è stato introdotto, e perché

| Elemento non introdotto | Ragione |
|---|---|
| **Event store / archivio append-only** | Escluso da **V1** (nessun archivio immutabile per i contenuti dell'Utente) e da **V5** (anonimizzazione irreversibile su ogni replica). Non era disponibile come opzione |
| **Secondo motore di persistenza** (documentale, cache, motore di ricerca) | Ogni store aggiuntivo è un detentore in più per SE3, una regione UE in più da verificare per V3 e una superficie in più in esercizio non presidiato. Nessuno scenario bloccato lo richiede entro la banda |
| **Database di lettura separato / proiezioni CQRS** | PE3 è raggiungibile con letture dirette e indici. L'unica proiezione ammessa è l'indice delle Collocazioni, ed è di dominio |
| **Mappa identificatore → pseudonimo** | Sarebbe pseudonimizzazione, esclusa da V5 |
| **Foreign key fra schemi** | Prometterebbe una garanzia di esistenza che C3, AL3 e AS9 hanno esplicitamente rifiutato di dare |
| **Registro di deduplica per E5** | G3, AS3, IG2 e IA1 rendono la ripetizione priva di effetto: la difesa è già nel modello |
| **Colonna di stato nell'indice delle Collocazioni** | AS8: l'`AulaStudio` non possiede stato di ciclo di vita, quindi non può pubblicarlo |
| **Persistenza dei messaggi di Chat testuale come fatti di dominio** | `MessaggioDiChatInviato` non è un fatto di dominio: nessun consumatore, volume incompatibile. I messaggi sono aggregati persistiti, non eventi da consegnare |
| **Archiviazione del flusso di Audiochat** | **A3**: l'Audiochat è solo transito, non registrata né conservata. Attivare la registrazione farebbe scattare consenso e conservazione, e introdurrebbe nel core l'audio persistito che AS8 esclude |
| **Chiavi dell'object store per `UtenteId`** | Sarebbero esse stesse un dato personale non cancellabile, dentro file che V5 impone di conservare |

### 10. Verifiche sui dati

Quattro controlli meccanici, da rieseguire a ogni modifica dello schema, perché in un monolite modulare la violazione di un confine di dati non produce alcun sintomo immediato:

1. **Nessuna foreign key e nessuna query fra due schemi di dominio** — verificato staticamente sullo schema e sulle query generate;
2. **Il grafo delle dipendenze fra schemi è vuoto** — coerente con il fatto che i riferimenti fra contesti sono identificatori nudi;
3. **Ogni tabella che contiene nome, cognome, `Università`, `CorsoUniversitario` o un contenuto dell'Utente è censita nell'elenco dei detentori** della catena di cancellazione — è il controllo che difende la forza sacrificata di §7;
4. **La scansione di verifica del residuo copre l'elenco censito al completo**, e il suo esito è registrato: una verifica parziale che riporta 0 record è indistinguibile da una totale, se nessuno confronta l'elenco.

Il quarto controllo è quello che rende SE3 dimostrabile invece che dichiarato, ed è la contropartita dovuta a `maintenance_mode = unattended`.

## Integration

L'integrazione è il punto in cui lo stile — monolite modulare con due unità di esecuzione ricavate dalla stessa immagine — incontra i confini che il modello di dominio ha già tracciato. Qui si dichiara **quali confini vengono attraversati, con quale meccanismo, con quale semantica di consegna e con quale contratto**, senza introdurre alcuna linea che la Context Map non contenga già.

Due criteri governano ogni riga di questa sezione, ed entrambi sono ereditati e non negoziati:

1. **Sincrono dove il dominio ha scelto l'interrogazione, asincrono dove il dominio ha enumerato una finestra di coerenza differita.** L'event-driven è il meccanismo delle sole sei finestre E1–E6, non lo stile del sistema.
2. **Ogni confine verso l'esterno parla la lingua del dominio.** Le capacità generic stanno dietro porte sottili che espongono `Allegato`, Chat testuale, Audiochat, Permesso di Parlare — e mai il vocabolario di un fornitore.

---

### 1. Tassonomia dei confini

| Confine | Attraversamento | Meccanismo |
|---|---|---|
| AppMobile → FacciataDellApp | **rete** | REST/JSON su HTTPS, versione nel percorso |
| FacciataDellApp → moduli `domain` | **in-processo** | chiamata all'interfaccia pubblicata, composizione delle pagine in memoria |
| Modulo → modulo (Profilo→3, Gruppo ↔ AulaStudio) | **in-processo** | chiamata all'interfaccia pubblicata, con ACL sul lato consumatore |
| Unità applicativa → unità lavoratrice | **asincrono** | il fatto di dominio è scritto nella stessa transazione dell'aggregato e ripreso in polling |
| Unità lavoratrice → moduli consumatori | **in-processo** | `RecapitoDeiFattiDiDominio` invoca l'interfaccia di consumo del destinatario |
| Porte → fornitori delle capacità generic | **rete** | mai nel percorso di una richiesta bloccante del client (§5) |
| Fornitori → backend | **nessuno** | **nessun endpoint webhook entrante** nella prima release |

Due letture della tabella meritano di essere esplicitate.

**Il confine di processo non coincide con alcun confine di modello.** Fra unità applicativa e unità lavoratrice passa un fatto di dominio, non un modello: il consumatore riceve `FattoDiDominio` e invoca **la stessa interfaccia pubblicata** che invocherebbe in-processo. Nessun modulo scopre di essere diviso, ed è la ragione per cui la divisione per ruolo di esecuzione non ha aggiunto una dipendenza al grafo verificato in §4 dei Components.

**`RecapitoDeiFattiDiDominio` è `technical` e senza contesto**: trasporta i fatti **senza interpretarne il contenuto**, e il consumatore riceve sempre il fatto per chiamata. Non conosce la differenza fra E2 ed E4 come *significato* — la conosce solo come corsia di consegna (§6). Se conoscesse il significato, sarebbe un componente di dominio non dichiarato.

**L'assenza di webhook entranti è una decisione, non una lacuna.** Un endpoint aperto verso l'esterno è una superficie da autenticare, da rendere idempotente e da sorvegliare in esercizio non presidiato; nessuna delle sei capacità generic la richiede per come sono consumate qui. La condizione che la farebbe comparire è dichiarata in §5.

---

### 2. Contratto verso il client

**Stile: REST orientato ai casi d'uso**, JSON, **lettore tollerante** (campi solo additivi dentro una versione, nessuna rimozione), errori come *problem details* con codici stabili.

La clausola qualificante è che **nessun endpoint espone lo stato intero di un aggregato**: le mutazioni sono **verbi del dominio, uno per gesto**. È la stessa disciplina che il catalogo eventi applica quando vieta l'evento generico — un endpoint che accetta lo stato completo dell'`AulaStudio` sarebbe l'equivalente sincrono di `AulaStudioModificata`, e lascerebbe al client il compito di sapere che cosa sta cambiando.

| Endpoint | Consumatore | Caso d'uso servito |
|---|---|---|
| `GET /v1/aule-studio/{id}/sala` | AppMobile, Partecipante | «entro nell'Aula studio»: Partecipanti con `Permessi`, Argomenti, Allegati, ultimi messaggi **in una sola risposta composta** (PE3, p95 ≤ 800 ms) |
| `POST /v1/aule-studio/{id}/ingresso` | AppMobile | «chiedo di entrare»: titolo di ammissione risolto **su dato fresco** — Invito accettato **oppure** appartenenza al Gruppo (IA4, SE1: 0 ammissioni indebite) |
| `POST` / `DELETE /v1/aule-studio/{id}/partecipanti/{utenteId}/permessi/{parlare\|scrivere\|caricare}` | AppMobile del Moderatore | «concedo / revoco **un** Permesso»: mai un insieme (AS4) |
| `POST /v1/allegati/pre-autorizzazione` | AppMobile | «ottengo il permesso di caricare»: autorizzazione firmata con vincoli di tipo e dimensione (B3 / AL1) |
| `POST /v1/aule-studio/{id}/allegati` | AppMobile | «carico materiale»: verifica del Permesso di Caricare su dato fresco (AL4) e creazione dell'aggregato |
| `POST /v1/aule-studio/{id}/audiochat/accesso` | AppMobile | «entro nell'Audiochat»: rilascio dell'accesso **se e solo se** il Partecipante ha il Permesso di Parlare |
| `GET /v1/bacheca` | AppMobile | «leggo la Bacheca»: visibilità dei contenuti risolta **sincrona per autore** (SE2) |
| `POST /v1/inviti/{id}/accettazione` → `202`, poi `GET /v1/inviti/{id}` | AppMobile dell'invitato | «accetto e attendo di entrare»: IG3 / IA3 vietano di creare `Membro` o `Partecipante` nella stessa transazione (PE1, p95 ≤ 5 s) |
| `POST` / `GET /v1/account/eliminazione` | AppMobile | «cancello l'account **dall'app**» (V4) e ne seguo lo stato (SE3) |

#### Perché questi endpoint e non una risorsa per aggregato

**Un endpoint per Permesso, mai per insieme.** AS4 stabilisce che i tre Permessi si concedono e si revocano **uno per uno**, e il percorso lo rende strutturale: `.../permessi/parlare` è un gesto, `PUT .../permessi` con un insieme sarebbe l'operazione che il dominio ha rifiutato. Ne discende che **la Sola lettura non ha endpoint proprio**: si raggiunge per revoche successive, essendo l'insieme vuoto di Permessi, e un `POST .../sola-lettura` reintrodurrebbe come gesto ciò che il linguaggio ubiquo ha eliminato come ruolo.

**L'ingresso è un `POST` e non una lettura.** «Chiedo di entrare» è un comando che produce un `Partecipante`, e il titolo di ammissione è risolto **nel momento in cui la domanda arriva**. È qui che si ottengono le **0 ammissioni indebite** di SE1: la finestra è zero perché non esiste copia locale dell'insieme dei Membri da consultare, e l'ACL del core interroga il contratto di appartenenza adesso.

**L'accettazione dell'Invito risponde `202` e non `201`.** IG3 e IA3 dichiarano come invarianti che l'accettazione **non** crea il `Membro` o il `Partecipante` nella stessa transazione: rispondere `201` sarebbe mentire al client su un'entità che ancora non esiste. Il `202` seguito da `GET /v1/inviti/{id}` espone al client esattamente la finestra E5 che il dominio ha dichiarato, ed è la finestra più stretta del sistema (PE1: **p95 ≤ 5 s, p99 ≤ 15 s**) perché **c'è una persona che guarda lo schermo**.

**La pre-autorizzazione al caricamento è separata dal caricamento.** I byte non attraversano il backend: il client ottiene un'autorizzazione firmata con vincoli di tipo e dimensione — gli stessi di B3 e AL1, enunciati due volte perché i due contesti sono in separate ways — carica verso l'`ArchivioDiFile`, poi comunica l'esito. La verifica del Permesso di Caricare avviene **al momento del gesto** (AL4) sul secondo endpoint, dove nasce l'aggregato.

**`GET /v1/bacheca` risolve la visibilità per autore, sincrona.** Il `Post` non porta alcun attributo di visibilità (B5): la decisione è interrogata a Profilo alla lettura, ed è per questo che la misura di SE2 è **0 finestre di visibilità indebita** e non «finestra breve».

**L'eliminazione dell'account è avviabile dall'app**, per esclusione 15 di V4 e per V5. Il `GET` sullo stesso percorso espone al richiedente l'avanzamento — è l'unico modo perché un Utente sappia che la sua richiesta è viva durante i 30 giorni, in un prodotto senza presidio umano a cui scrivere.

#### Politica di versione

Sono supportate **le ultime due versioni pubblicate e comunque non meno di 90 giorni** dalla pubblicazione della successiva. Se due release si susseguono in meno di 90 giorni, **prevale il vincolo temporale** e le versioni vive diventano tre.

La regola nasce dall'incrocio di due fatti che il team non controlla: il momento in cui una release diventa disponibile è governato dal team di revisione dello store (V4), e il momento in cui un Utente aggiorna non è governato da nessuno. **CO1** ne misura le due conseguenze — **0 funzionalità che richiedano l'aggiornamento simultaneo** di backend e client, e nessuna versione resa inutilizzabile prima di 90 giorni — e la disciplina del lettore tollerante è ciò che rende il numero zero raggiungibile: dentro una versione si aggiungono campi, non se ne rimuovono e non se ne cambia il significato.

**Il client consuma un solo contratto versionato, quello della facciata.** È anche la condizione perché **R11** resti gestibile: ciò che non si può correggere lato client in tempo utile — perché la revisione richiede giorni — deve poter essere corretto lato backend, **in un punto solo**.

#### Fuori dal contratto, dichiarato

**Segnalazione e blocco fra Utenti, richiesti da V4, restano sospesi.** Non compaiono fra gli endpoint perché non esistono nel modello di dominio approvato: introdurli significherebbe aggiungere concetti che il linguaggio ubiquo non ha, e i cinque verbi del Moderatore sono locali allo spazio per decisione esplicita (AS6). È il conflitto **R10**, con due autorità — il team di revisione dello store e il proprietario del modello di dominio approvato — portato al gate. L'architettura registra il posto vuoto e non lo riempie di propria iniziativa.

---

### 3. Confini sincroni

Sono sincrone, **su dato fresco e senza repliche**, esattamente le decisioni che richiedono una risposta immediata. L'elenco è chiuso e coincide con ciò che la Context Map ha classificato come interrogazione:

| Decisione | Dove si risolve | Fondamento e misura |
|---|---|---|
| Traduzione dell'account autenticato in Utente di dominio | PortaIdentitàUtente → Profilo | Nessuna riconciliazione differita ammessa: l'identità o è disponibile adesso, o l'operazione non procede |
| Chi può contattare l'Utente; chi può vederne i contenuti | Profilo | IP1–IP4, B5; **SE2**: p95 ≤ 300 ms, **0 finestre di visibilità indebita** |
| Titolo di ammissione all'Aula studio | AulaStudio, interrogando `AppartenenzaAlGruppo` | **IA4**; **SE1**: 0 ammissioni indebite |
| Appartenenza all'ateneo per la `Visibilità` Ateneo | Profilo, su dato fresco | **G5**, **AS7**: mai dalle copie locali del `RiferimentoUtente` |
| Permesso di Scrivere, di Caricare, di Parlare al momento del gesto | AulaStudio | **MA2**, **AL4**; il Permesso si legge nell'istante dell'azione |
| Titolo a scrivere nella Chat testuale del Gruppo | Gruppo | **MG2** |

Due negazioni completano l'elenco e sono altrettanto vincolanti.

**Nessuna di queste decisioni viaggia su un fatto.** Una decisione di privacy propagata è una decisione presa su un dato vecchio: il numero richiesto da SE2 è zero, e una finestra positiva per quanto piccola lo violerebbe per costruzione. È la ragione per cui le `ImpostazioniDiPrivacy` non emettono alcun evento.

**Nessuna di queste decisioni legge le tre tabelle `riferimento_utente`.** La loro tolleranza è quella di E1 — minuti — e servono unicamente a mostrare chi è. La formula resta quella fissata dalla Context Map: **dato anagrafico propagato, decisione di autorizzazione interrogata**.

Tutte queste interrogazioni sono **in-processo**: è precisamente il guadagno che lo stile ha rivendicato scartando l'unità separata per il core, dove le due dipendenze di dominio sarebbero finite in rete aggiungendo latenza e modi di guasto a SE1 e IA4 senza alcun beneficio.

---

### 4. ACL e published language

Ogni linea che attraversa un confine di contesto ha **un traduttore nominato** e un elenco chiuso di ciò che passa. Ciò che non è elencato non passa: è la forma operativa dei confini imposti dal codice.

| Linea | Chi traduce | Cosa passa, cosa non passa mai |
|---|---|---|
| PortaIdentitàUtente → Profilo | **ACL posseduto da Profilo** | passa `UtenteDiDominio`; **non passano** account, sessione, provider |
| Profilo → Bacheca / Gruppo / AulaStudio | **open-host unico di Profilo** | `RiferimentoUtente`, `DecisioneDiContattabilità`, `DecisioneDiVisibilitàDeiContenuti`; **nessun tipo del modello interno** di Profilo |
| Gruppo → AulaStudio | **ACL sul lato AulaStudio** | passa `AppartenenzaAlGruppo` come **fatto booleano**, tradotto in titolo di ammissione; **la parola Membro non entra nel core** |
| AulaStudio → Gruppo | **ACL sul lato Gruppo** | passa `EtichettaDellAulaStudio` (titolo, `DataOraDiInizio`); **nessun Partecipante, Permesso, Invito, Audiochat, nessuno stato** |

#### Le tre proprietà che questa tabella difende

**Il contratto di Profilo è unico, versionato e non specializzato.** Non esiste un contratto «per la Bacheca» e uno «per l'Aula studio»: esisterebbero due modelli di Utente da mantenere allineati, che è esattamente ciò che il confine serve a evitare. Che il consumatore sia il core o un supporting non cambia il linguaggio pubblicato; cambia semmai quanto ne usa.

**I due versi della partnership insistono su contratti disgiunti.** È la condizione che impedisce il ciclo: un'informazione di appartenenza sul contratto d'indice, o un'informazione d'indice su quello di appartenenza, farebbe collassare i due versi su un solo contratto e violerebbe la prima proprietà da preservare della Context Map. Il `FattoDiDecadenzaDellAppartenenza` viaggia perciò sul contratto di appartenenza, mai su quello d'indice.

**«Nessuno stato» sul contratto d'indice non è pleonastico.** AS8 stabilisce che l'`AulaStudio` non possiede alcuno stato di ciclo di vita, quindi **non può pubblicarne uno**. La distinzione fra Aula studio programmata ed estemporanea è **derivata da chi consuma**, guardando se la `DataOraDiInizio` c'è: il produttore pubblica un dato, non una classificazione. È anche il motivo per cui non esiste alcun fatto al raggiungimento della data.

#### Porte verso le capacità generic

Ogni capacità generic sta dietro **una porta sottile in lingua di dominio, con un adattatore sostituibile**. Le interfacce pubblicate sono quelle già nominate: `FileCustodito`, `ConsegnaAiPresenti`, `CanaleAudioDellAulaStudio`, `AvvisoDaRecapitare`.

Le porte sono sottili perché **non c'è modello da tradurre**: c'è un'operazione tecnica da nominare in lingua di dominio. La misura che le giustifica è **MA1** — sostituzione della capacità di Audiochat con **0 modifiche agli aggregati** del contesto Aula studio e intervento in **≤ 8 ore**, cioè un mese intero di capacità di lavoro alla `deadline` dichiarata. Un intervento più costoso non verrebbe fatto, e la porta avrebbe fallito il suo scopo.

**Unica eccezione: MisurazioniDiUtilizzo è conformist.** Si adotta il modello del destinatario senza traduzione, perché è un flusso a senso unico che non rientra nel dominio. La conseguenza è già registrata in V1 e va ripetuta qui perché è una proprietà dell'integrazione: **non esistendo porta di traduzione, l'unico punto di controllo su ciò che esce è la selezione del fornitore**. È la ragione per cui questa porta resta senza fornitore assegnato finché V1 e V3 non sono entrambi soddisfatti.

---

### 5. Chiamate ai fornitori

> **Regola vincolante: nessuna chiamata bloccante a un fornitore mentre si serve una richiesta bloccante del client.**

La regola discende da **A4** (`vendor-terms-only`: nessuno SLA, nessun rimedio in caso di interruzione) incrociato con le soglie di PE3. Un fornitore lento dentro il percorso di `GET /v1/aule-studio/{id}/sala` trasferirebbe all'Utente una latenza che il team non controlla e non può promettere, violando insieme PE3 e la clausola di RE3 che vieta di promettere oltre quanto garantito a monte.

| Porta | Applicazione della regola |
|---|---|
| **TrasportoInTempoReale** | pubblicazione **dopo il commit**, fuori dal percorso di risposta: il messaggio è persistito e il mittente non attende il fornitore; il client **deduplica per identificativo del messaggio**, perché può riceverlo due volte (PE3: visibile agli altri **p95 ≤ 1 s**) |
| **AvvisiInUscita** | consumo **asincrono at-least-once**, deduplica per identificativo dell'evento |
| **ArchivioDiFile** | i byte non attraversano il backend: pre-autorizzazione firmata, caricamento diretto dal client, comunicazione dell'esito |
| **PortaAudiochat** | l'accesso al canale è rilasciato dopo la verifica del Permesso di Parlare; l'apertura della sala **non attende** la porta (RE4) |
| **MisurazioniDiUtilizzo** | inoltro fuori dal percorso dell'Utente; la sua indisponibilità non ha alcun effetto osservabile |

**La deduplica lato client sul trasporto è una conseguenza dichiarata, non un difetto.** Persistere prima e pubblicare dopo significa che una ripubblicazione dopo un fallimento può consegnare due volte lo stesso messaggio. Il messaggio è immutabile dopo l'invio (MG1, MA1) e porta un identificativo: il client scarta il duplicato. L'alternativa — attendere la conferma del fornitore dentro la transazione — legherebbe la persistenza di un `MessaggioDiChat` alla disponibilità di un fornitore che non offre garanzie.

**Se in futuro un fornitore imponesse un webhook entrante**, sarà un endpoint dedicato con **verifica di firma e idempotenza sull'identificativo del fornitore**, e sarà una **modifica esplicita di questo punto** — non un'aggiunta silenziosa. La ragione della formalità è che un endpoint entrante è una superficie non autenticata dal contratto del client, e la sezione trasversale ha dichiarato l'assenza di limitazione di frequenza proprio sul presupposto che tutti gli endpoint siano autenticati.

---

### 6. Semantica dell'asincrono E1–E6

Il canale dei fatti serve **le sole sei finestre enumerate dal dominio**. I parametri sono bloccati qui perché sono ciò contro cui RE2, SE1, PE1 e PE2 vengono misurati.

| Parametro | Valore bloccato |
|---|---|
| **Garanzia di consegna** | **at-least-once** dichiarata: il fatto non si perde, ma può arrivare più di una volta |
| **Semantica di elaborazione** | **effectively-once**, ottenuta per deduplica sul consumatore |
| **Chiave di idempotenza** | **l'identificativo univoco dell'evento**, campo obbligatorio di ogni fatto, prodotto dal produttore |
| **Corsia rapida (E2, E5)** | polling **1 s** — copre p95 ≤ 5 s / p99 ≤ 15 s di **SE1** e **PE1** |
| **Corsia lenta (E1, E3, E4, E6)** | polling **30 s** — copre p95 ≤ 5 min di **PE2** |
| **Lotto per ciclo** | **200 fatti**, ordinati per istante |
| **Uniformità della deduplica** | applicata a **tutti** i consumatori, anche a quelli già idempotenti per invariante |

#### Perché due corsie e non una

Le corsie riproducono le **due sole classi di finestre** che gli invarianti dichiarano, e la classe non dipende dalla difficoltà tecnica ma **da chi subisce l'attesa**:

- **corsia rapida — c'è qualcuno che aspetta, o qualcuno che non dovrebbe essere lì.** E5 perché l'Utente ha appena accettato un Invito e guarda lo schermo; E2 perché chi ha perso l'appartenenza è già dentro l'incontro, sta ascoltando l'Audiochat, e nessuna interrogazione lo raggiungerà mai — **l'informazione deve andargli incontro**;
- **corsia lenta — nessuno sta aspettando.** Un nome vecchio in un elenco, un `Commento` sotto un `Post` già eliminato, un `AllegatoDiAulaStudio` ancora associato a un `Argomento` scomparso, una `Collocazione` che punta a un'Aula studio eliminata: nessuno subisce danno nel frattempo.

Un polling a 1 s consuma il 5% circa della finestra p95 di SE1 e PE1 nella sola attesa, lasciando il resto alla consegna e all'elaborazione in-processo: è il margine che rende la soglia raggiungibile senza un meccanismo di notifica immediata, che aggiungerebbe un canale di guasto in esercizio non presidiato.

#### Perché la deduplica è uniforme anche dove sarebbe superflua

Il modello di dominio **regala** l'idempotenza in cinque punti: G3 e AS3 impediscono che un `UtenteId` compaia due volte fra Membri e Partecipanti; IG2 e IA1 rendono priva di effetto una seconda accettazione di un Invito già in stato terminale; E4 pone `argomento_id` a null, operazione ripetibile; E6 rimuove una `Collocazione` che la seconda volta non c'è più.

Nondimeno **la deduplica per identificativo dell'evento è applicata a tutti i consumatori**, senza eccezioni. La ragione è di manutenzione, non di correttezza: **un unico meccanismo vale più di sei ragionamenti caso per caso**. Con `team_size = 1` e ~2 ore a settimana, un consumatore la cui sicurezza dipende dal ricordarsi che «quel particolare invariante rende innocua la ripetizione» è un consumatore che verrà modificato un giorno da qualcuno che non ricorda l'invariante — e il sintomo non sarebbe immediato.

Si noti che questo **non contraddice** l'assenza di registro di deduplica per E5 dichiarata nell'architettura dei dati: là si parla di un registro *di dominio* per riconoscere accettazioni già elaborate, qui di una chiave tecnica sull'identificativo dell'evento, che è campo obbligatorio della forma comune di ogni fatto.

#### Che cosa non transita da questo canale

**La scadenza degli Inviti a 7 giorni e la riconciliazione degli elementi orfani non sono fatti da consegnare**: sono meccanismi innescati da `CadenzaDeiMeccanismiRicorrenti` e **lavorano per interrogazione dello stato**. La conseguenza è che dopo un'interruzione ammessa da **RE1** (≤ 24 h) **non hanno arretrati da recuperare**: hanno una query che al ciclo successivo trova più righe. L'esclusione 8 è soddisfatta per costruzione, e i **0 interventi manuali** non richiedono alcun compensatore.

Non transitano da qui, e non esistono affatto come fatti: `MessaggioDiChatInviato` (nessun consumatore di dominio, volume incompatibile), la promozione a Moderatore (AS6 vieta ogni derivazione, e pubblicarla offrirebbe l'occasione di derivare), lo spostamento di un `AllegatoDiAulaStudio` fra Argomenti (nessun consumatore), qualunque fatto sulle `ImpostazioniDiPrivacy` (sarebbe replica di stato, contro IP4 e SE2).

---

### 7. Stabilità: antipattern → pattern

| Antipattern esposto | Pattern adottato | Fatto di questo progetto |
|---|---|---|
| **Unbounded result set** — dopo un'interruzione, un ciclo tenta di consegnare l'intero arretrato in un colpo | **Lotto limitato a 200 fatti per ciclo**, ordinati per istante | **RE1** ammette interruzioni ≤ 24 h; con la corsia rapida a 1 s l'arretrato si smaltisce in cicli successivi **senza saturare memoria né lo store**, e senza che l'unità lavoratrice interferisca con PE3 |

È l'unico antipattern che questa architettura espone davvero, e va detto perché il resto della lista abituale non si applica: non esiste chiamata sincrona fra servizi in rete (monolite modulare, interazioni in-processo), non esiste catena di dipendenze sincrone verso fornitori dentro il percorso del client (§5), non esiste risorsa condivisa fra unità oltre allo store relazionale, che entro la banda bloccata non è in contesa.

Il lotto di 200 è dimensionato sulla banda: con ≤ 500 Utenti registrati e ≤ 10 Aule studio simultanee, un arretrato di 24 ore resta ampiamente smaltibile entro pochi cicli della corsia rapida. Fuori dalla banda, il trigger di rivalutazione è dichiarato in §8.

---

### 8. Debito tecnico registrato

Ogni voce è una scelta consapevolmente subottimale, con **il trigger osservabile che ne impone la rivalutazione**. Nessuna è un difetto da correggere subito; tutte sono cambiali con una data di scadenza condizionata.

| Voce | Trigger di rivalutazione |
|---|---|
| **Il canale di pubblicazione dei fatti è accoppiato allo store relazionale e opera in polling** | Si rivaluta il meccanismo quando si verifica **una** di queste: (a) la corsia rapida non regge **p95 ≤ 5 s / p99 ≤ 15 s su E2** misurato in esercizio; (b) compare un'unità di esecuzione distribuita separatamente dalle attuali; (c) il volume supera **5 fatti al secondo sostenuti**, oltre la banda +30% |
| **Tre consumatori alimentano `riferimento_utente` ripetendo la stessa logica** | Alla comparsa di un **quarto** consumatore del `RiferimentoUtente` si estrae il consumo in **un adattatore unico**, senza toccare il published language |
| **La composizione in memoria nella facciata fa crescere il numero di chiamate in-processo per pagina** | Se l'apertura dell'Aula studio supera **p95 ≤ 800 ms** si introduce una lettura di appoggio **dentro lo schema proprietario del contesto** — mai una proiezione cross-contesto, che violerebbe §5 dell'architettura dei dati |

Due note sulla forma dei trigger. Il primo è **misurato in esercizio e non stimato**: finché E2 sta dentro la soglia, il polling è la scelta corretta perché non aggiunge alcun componente da sorvegliare. Il terzo dichiara **anche la soluzione ammessa**, ed è deliberato: senza quella clausola, il rimedio ovvio a una pagina lenta sarebbe una proiezione che unisce contesti, cioè esattamente la replica in più che SE3 non vuole censire e che MA2 misurerebbe come dipendenza nuova.

---

### 9. Verifiche sull'integrazione

Quattro controlli meccanici, coerenti con la disciplina già applicata ai confini di modulo e agli schemi:

1. **Nessuna chiamata a un fornitore dentro il percorso di un endpoint del contratto verso il client**, salvo il rilascio dell'accesso all'Audiochat e la pre-autorizzazione al caricamento, che sono i due gesti in cui il fornitore *è* il caso d'uso;
2. **Ogni fatto pubblicato porta identificativo univoco, istante di accadimento, identità dell'aggregato sorgente e versione del contratto** — la forma comune dichiarata dal catalogo eventi; un fatto privo di identificativo rende impossibile la deduplica di §6;
3. **Nessun endpoint del contratto accetta o restituisce un tipo del modello interno di un modulo**: la facciata compone e inoltra, non espone aggregati;
4. **Nessun campo di stato compare su `EtichettaDellAulaStudio`**, verificato sul contratto d'indice: è la violazione di AS8 più facile da introdurre e la meno visibile.

## Cross-cutting Concerns

Le preoccupazioni trasversali sono decise **una volta sola e valgono uniformemente per tutti i componenti**: non esiste un componente che autentichi a modo suo, che registri log a modo suo o che ritenti a modo suo. Con `team_size = 1`, ~2 ore a settimana e `maintenance_mode = unattended`, una regola trasversale enunciata in un punto e applicata ovunque vale più di quattro regole locali, ciascuna corretta e nessuna ricordata.

Il criterio di ammissione in questa sezione è stretto: **ogni voce inclusa è richiesta da uno scenario di qualità o da un vincolo già bloccato**. Ciò che è deliberatamente assente è dichiarato in §8 con il fatto di questo progetto che ne giustifica l'assenza e la condizione che la renderebbe necessaria — perché un'assenza non motivata è indistinguibile da una dimenticanza.

Quattro famiglie: **identità e autorizzazione**, **osservabilità e allerta**, **protezione del dato nei percorsi trasversali**, **resilienza dei percorsi**. Ciascuna chiude con una **verifica di conformità**: una regola trasversale che nessun test può violare non è una regola, è un'intenzione.

---

### 1. Identità e autorizzazione

#### Risoluzione dell'identità

Ogni richiesta risolve l'**Utente di dominio** leggendo lo schema `profilo` **in-processo**, dopo che `PortaIdentitàUtente` ha convertito l'account autenticato. La conversione è quella già dichiarata: passa `UtenteDiDominio`, non passano account, sessione, provider.

Una clausola qualifica il comportamento e va enunciata per intero:

> Se il `Profilo` non esiste più — account eliminato dalla catena di V5 — la richiesta è **respinta immediatamente**, indipendentemente dalla validità residua del titolo di accesso.

La revoca è quindi **effettiva senza dipendere dalla scadenza del titolo**. È la ragione per cui la durata del titolo può essere fissata a un valore comodo (§7) senza indebolire nulla: ciò che rende inoperante un account cancellato non è la scadenza, è **P1** — non esiste Utente di dominio senza `Profilo`.

#### Regola unica: la facciata autentica, i moduli autorizzano

**Ogni decisione su *chi può fare cosa* è presa dal modulo proprietario, su dato fresco, nel momento del gesto.** `FacciataDellApp` stabilisce chi è l'Utente e non decide altro; `PortaIdentitàUtente` traduce e non decide nulla.

| Decisione | Chi decide | Invariante coperta |
|---|---|---|
| Chi può contattare l'Utente; chi può vederne i contenuti | **Profilo** | IP1–IP4, B5; **SE2** |
| Titolo di ammissione all'Aula studio | **AulaStudio** | IA4, AS6; **SE1** |
| Permesso di Parlare, di Scrivere, di Caricare | **AulaStudio** | AS4, AL4, MA2 |
| Titolo a scrivere nella Chat testuale del Gruppo | **Gruppo** | MG2 |
| `Visibilità` dello spazio e appartenenza all'ateneo | **Gruppo** / **AulaStudio**, su dato fresco del `Profilo` | G5, AS7 |

La regola è la traduzione letterale della terza conseguenza vincolante della sezione Bounded Contexts: **se una regola decide chi può fare cosa, non appartiene mai ad Accesso**. Portarla nella facciata sarebbe la stessa violazione con un altro nome — la facciata attraversa quattro contesti, e una decisione presa lì sarebbe presa fuori dal contesto proprietario, su un dato che le è arrivato per composizione.

Due conseguenze operative:

- **nessuna decisione di autorizzazione è memorizzata nel titolo di accesso.** Un titolo che portasse con sé i `Permessi` o l'appartenenza a un Gruppo sarebbe una replica di una decisione, valida fino alla scadenza: contro SE1 (0 ammissioni indebite) e contro AL4/MA2, che leggono il Permesso **nell'istante del gesto**;
- **nessuna decisione di autorizzazione è memorizzata in cache**, per la stessa ragione e con la stessa forza di SE2 (0 finestre di visibilità indebita).

#### Verifica di conformità

1. **Batteria di test negativi sul contratto**: titolo assente, titolo scaduto, firma non valida, `Profilo` cancellato → tutte respinte.
2. **Test di scenario end-to-end** su **SE1** e **SE2**, i due percorsi in cui una decisione sbagliata è invisibile all'Utente che ne beneficia.
3. **Test di architettura** che **fallisce** se: un modulo `domain` importa il tipo del titolo di accesso; oppure nella facciata compare un riferimento a `Permessi`, `Visibilità` o `AppartenenzaAlGruppo`. È il controllo che difende la regola dalla deriva più probabile — una verifica «anticipata» nella facciata per risparmiare una chiamata.

---

### 2. Osservabilità

Con `maintenance_mode = unattended` il rischio registrato è **R8**: un guasto silenzioso resta tale finché un Utente non se ne lamenta. La contropartita dovuta non è «osservare tutto» — che con una persona sola produce rumore che si smette di leggere — ma il criterio opposto:

> **Si misura solo ciò che, restando invisibile, produce un danno.**

Sette segnali, **uno per scenario**, nessuno in più. Ogni riga nomina lo scenario che la richiede: un segnale senza scenario sarebbe un segnale che nessuno guarderà.

| Segnale | Scenario che lo richiede |
|---|---|
| Ritardo di consegna dei fatti, **p95/p99, separato per corsia rapida e lenta** | SE1, PE1, PE2 |
| Numero di fatti **non consegnabili** (tentativi esauriti) | RE2 |
| **Esito e istante dell'ultimo ciclo** di ogni meccanismo ricorrente, più elementi arretrati | RE1 |
| **Esito della verifica del residuo** e giorni residui per ogni richiesta di cancellazione | SE3 |
| **Minuti-partecipante di Audiochat** cumulati nel mese corrente | PE4 |
| Latenza **p95 di tre soli percorsi**: apertura della sala, decisione di visibilità, ingresso all'Aula studio | PE3, SE2, SE1 |
| **Esiti delle chiamate ai fornitori**: successo, timeout, tentativi spesi | RE3, RE4 |

#### Tre letture della tabella

**Il ritardo dei fatti è separato per corsia, e non aggregato.** Aggregare le due corsie renderebbe invisibile esattamente il caso che conta: la corsia lenta ha volume maggiore e finestra di 5 minuti, quindi assorbirebbe nel p95 complessivo uno sforamento della corsia rapida, che è dove vive SE1. Due misure separate, due soglie separate.

**Solo tre latenze di percorso, e sono quelle con una soglia numerica bloccata.** Apertura della sala (PE3, p95 ≤ 800 ms), decisione di visibilità (SE2, p95 ≤ 300 ms), ingresso all'Aula studio (SE1, 0 ammissioni indebite). Misurare la latenza di ogni endpoint produrrebbe un cruscotto che nessuno confronta con alcuna soglia dichiarata.

**I minuti-partecipante di Audiochat sono l'unico segnale di natura economica**, e servono a PE4: la soglia di allerta a 2.100 minuti/mese è il 70% del tetto di 3.000, perché una notifica al 100% arriverebbe quando il danno è già fatto.

#### Forma dei segnali

Log **strutturati**, con **identificativo di richiesta** e **identificativo dell'evento** come chiavi di correlazione. L'identificativo dell'evento è già campo obbligatorio della forma comune di ogni fatto di dominio, ed è la stessa chiave usata per la deduplica: correlare un ritardo di SE1 con il fatto che l'ha prodotto non richiede alcun identificatore aggiuntivo.

Si registrano **errori e fatti di dominio**. **Non** si registrano i singoli messaggi di Chat testuale: il volume è incompatibile, ed è la stessa ragione per cui `MessaggioDiChatInviato` non è un fatto di dominio.

#### Verifica di conformità

Ogni segnale ha **un'asserzione dentro il test di scenario corrispondente**. La formulazione è deliberatamente severa: **se il test di SE1 passa ma il segnale del ritardo non è stato emesso, il test fallisce**. È l'unico modo perché l'osservabilità non degradi silenziosamente — un segnale rimosso per errore non produce alcun sintomo, se non l'assenza di ciò che serviva ad accorgersi del prossimo guasto.

---

### 3. Allerta e ripresa senza presidio

Cinque condizioni di allerta, recapitate al titolare tramite **`AvvisiInUscita`**, con **al massimo un avviso per tipo ogni 6 ore**. L'anti-flood non è una comodità: un canale che sveglia dieci volte per lo stesso guasto è un canale che al undicesimo guasto viene ignorato.

| # | Condizione | Origine |
|---|---|---|
| **1** | Fatto della **corsia rapida non consegnato entro 60 s**, oppure **arretrato > 500 fatti** | SE1, PE1; il lotto è 200 fatti per ciclo, quindi 500 arretrati significano oltre due cicli di ritardo |
| **2** | Fatto divenuto **non consegnabile** dopo i tentativi previsti | RE2 |
| **3** | Meccanismo ricorrente **senza completamento per due cicli consecutivi** | RE1 |
| **4** | Richiesta di cancellazione **oltre il 25° giorno** senza esito totale, oppure **verifica del residuo con esito diverso da zero** | SE3, V5 |
| **5** | **Minuti-partecipante di Audiochat oltre 2.100/mese** | PE4 |

#### La condizione 2 e il suo rapporto con RE2

La condizione 2 è **l'unico caso in cui una mano umana è prevista**, e va qualificata perché sembra contraddire RE2 (**0 riavvii manuali richiesti**). Non la contraddice: RE2 chiede che il sistema **si riprenda da solo** da un guasto, e la ripresa autonoma è garantita dai **12 tentativi entro 24 h** (§6). La condizione 2 scatta **dopo** che quelle 24 ore sono trascorse senza successo — è il **residuo oltre il percorso normale**, non il percorso normale. Un fatto che non si consegna per un giorno intero non è un guasto transitorio: è un guasto che richiede una decisione.

#### La condizione 4 e i cinque giorni di margine

L'allerta scatta al **25° giorno**, non al 30°. Il margine di cinque giorni esiste perché la scadenza di V5 è **hard con owner esterno**: un avviso che arriva il giorno della scadenza informa di una violazione, non la previene. Cinque giorni sono, alla `deadline` dichiarata di ~2 ore a settimana, l'ordine di grandezza di una finestra di intervento reale.

La seconda metà della condizione — **verifica del residuo con esito diverso da zero** — è indipendente dal calendario: un residuo trovato al terzo giorno è un'anomalia che va vista subito, perché significa che un detentore non è stato raggiunto o non è stato censito.

#### Verifica di conformità

**Prova di iniezione**: si forza il fallimento di un fornitore in ambiente di prova e si verifica che l'avviso arrivi. È il solo modo per accertare che il canale di allerta funzioni — un canale mai esercitato è un canale che si scopre rotto nel momento in cui serviva.

---

### 4. Protezione del dato nei percorsi trasversali

Gli aggregati proteggono i dati personali dentro il proprio confine; i percorsi trasversali — log, avvisi, misurazioni — li portano **fuori** da quel confine, ed è lì che V1 e V3 vanno riaffermati. Una regola sola:

| Percorso | Ammesso | Vietato |
|---|---|---|
| **Log** | `utente_id`, identificativo di richiesta, identificativo dell'evento, codici di errore, conteggi | **nome, cognome, `Università`, `CorsoUniversitario`; testo di `Post`, `Commento` e messaggi; nomi dei file** |
| **Avvisi al titolare** | conteggi e identificativi tecnici | qualunque dato personale |
| **MisurazioniDiUtilizzo** | quanto ammesso dalla base giuridica, alle condizioni di V1 | identificatori riconducibili all'Utente **senza base giuridica** |

La terza riga è la più esposta e va letta insieme a ciò che l'integrazione ha già dichiarato: la relazione con MisurazioniDiUtilizzo è **conformist**, quindi **non esiste porta di traduzione che possa filtrare ciò che esce**. L'unico punto di controllo residuo è **la selezione del fornitore**, ed è la ragione per cui questa voce resta senza fornitore assegnato.

#### Avvio dell'applicazione

**L'avvio fallisce se un segreto atteso manca: nessun default silenzioso.** Un'applicazione che parte con una credenziale assente e degrada in silenzio è, in esercizio non presidiato, un guasto che si manifesta come comportamento anomalo settimane dopo. Fallire all'avvio lo rende immediato.

#### Verifica di conformità

1. **Controllo statico che fallisce la build** se un'invocazione di log riceve un tipo del dominio anziché campi nominati. È il controllo che rende la regola strutturale anziché disciplinare: passare un aggregato al logger è il modo naturale in cui nome, cognome e testo dei `Post` finiscono nei log senza che nessuno lo decida.
2. **Ispezione di un campione di righe di log dentro la stessa esecuzione che verifica SE3**: la verifica del residuo e l'ispezione dei log condividono il momento, così che un residuo nei log non possa sfuggire a una verifica che guarda solo gli schemi.

---

### 5. Idempotenza dei comandi del client

Tre gruppi di endpoint accettano una **chiave di idempotenza fornita dal client** e restituiscono **l'esito della prima esecuzione** se la chiave si ripete entro **24 h**:

- `POST /v1/inviti/{id}/accettazione`;
- `POST /v1/aule-studio/{id}/allegati`;
- concessioni e revoche di Permesso.

**Perché proprio questi tre.** L'unico client è un'app mobile su rete mobile, che ritenta; **PE1 descrive esattamente l'Utente in attesa che preme di nuovo**, perché IG3 e IA3 impongono che `Membro` e `Partecipante` non nascano nella stessa transazione dell'accettazione. Gli altri due sono i gesti in cui una ripetizione produrrebbe un effetto visibile: un `AllegatoDiAulaStudio` duplicato, oppure una revoca applicata due volte su un Permesso nel frattempo riconcesso.

**Perché il costo è basso.** Il dominio ha già fatto gran parte del lavoro: **G3** e **AS3** impediscono che un `UtenteId` compaia due volte, **IG2** e **IA1** rendono priva di effetto una seconda accettazione di un Invito in stato terminale. La chiave di idempotenza non aggiunge una garanzia mancante: **rende la seconda risposta identica alla prima**, che è ciò di cui il client ha bisogno per non mostrare un errore a un Utente il cui gesto è andato a buon fine.

La finestra di **24 h** coincide con quella dei ritentativi di consegna (§6): è deliberato, perché entrambe misurano lo stesso orizzonte — quanto a lungo un tentativo può ancora appartenere allo stesso gesto.

#### Verifica di conformità

Test che invia **due volte lo stesso comando con la stessa chiave** e asserisce **un solo effetto** e **la stessa risposta**. La seconda asserzione è quella che conta: un solo effetto con due risposte diverse è indistinguibile, dal punto di vista del client, da un errore.

---

### 6. Timeout, ritentativi, degradazione

#### Timeout

**Ogni chiamata uscente verso un fornitore ha un timeout: 2 s per la connessione, 10 s complessivi. Nessuna chiamata senza timeout.** Con `vendor_guarantees = vendor-terms-only` (A4) non esiste alcun impegno a monte sui tempi di risposta: una chiamata senza timeout è una chiamata la cui durata è decisa dal fornitore, e in esercizio non presidiato è il modo più semplice per esaurire risorse senza che nulla lo segnali.

#### Budget del percorso client

**Se una composizione della facciata supera 3 s, risponde con ciò che ha, dichiarando la parte mancante.** Mai un'attesa indefinita davanti a PE3.

È una risposta parziale **dichiarata**, non silenziosa: il client sa quale parte manca e può mostrarlo. La soglia di 3 s è quasi quattro volte il p95 di PE3 (800 ms), quindi non interferisce con il funzionamento normale — interviene solo quando il percorso è già fuori da ogni soglia bloccata, e la scelta è fra una risposta incompleta e nessuna risposta.

Una precisazione che delimita la regola: **la degradazione non si applica mai a una decisione di autorizzazione**. Se la risoluzione della visibilità o del titolo di ammissione non è disponibile, la richiesta è respinta, non servita parzialmente: SE1 e SE2 chiedono **zero** ammissioni e **zero** finestre indebite, e una risposta parziale su quel percorso sarebbe un'ammissione presa senza decisione.

#### Ritentativi

**Attesa crescente con jitter, 12 tentativi entro 24 h cumulative.** Poi il fatto diventa **non consegnabile** e scatta l'allerta 2 di §3.

Il jitter non è un dettaglio: senza di esso, un'interruzione che ferma molti consumatori insieme li fa ritentare insieme, producendo un picco esattamente quando il fornitore si sta riprendendo. Le 24 h coincidono con l'orizzonte di interruzione ammesso da **RE1**, così che i due meccanismi — ritentativo dei fatti e recupero degli arretrati dei meccanismi ricorrenti — abbiano lo stesso margine.

#### Degradazione dichiarata

| Componente indisponibile | Comportamento dichiarato |
|---|---|
| **PortaAudiochat** | l'apertura della sala **riesce**; le funzioni non-audio restano al **100%**: Chat testuale, Allegati, Argomenti, elenco dei Partecipanti, moderazione dei Permessi (**RE4**) |
| **ArchivioDiFile** | il **caricamento fallisce con errore esplicito**, ma la sala si apre e tutto il resto funziona |
| **TrasportoInTempoReale** | il messaggio è **persistito** e resta leggibile alla riapertura; non è consegnato in tempo reale ai presenti |
| **MisurazioniDiUtilizzo** | **nessun effetto** sul percorso dell'Utente |

La prima riga è possibile perché il modello lo ha reso possibile prima dell'architettura: **il dominio possiede il solo Permesso di Parlare** (AS8), non esiste aggregato «Audiochat», non esiste stato del canale. Un'Aula studio senza canale audio è un'Aula studio in cui un Permesso non produce effetto — **non un'Aula studio rotta**.

La terza riga discende dalla regola già dichiarata di pubblicare dopo il commit: il `MessaggioDiChat` è un aggregato persistito e immutabile (MG1, MA1), quindi la sua sopravvivenza non dipende dal trasporto.

#### Verifica di conformità

**Prova di degradazione automatizzata**: con `PortaAudiochat` disattivata, **il test di PE3 deve continuare a passare**. È la traduzione eseguibile di RE4, e l'unico modo per accorgersi che una dipendenza «non bloccante» è diventata bloccante — cosa che accade per aggiunta di una singola attesa, senza alcun sintomo fino al giorno in cui il fornitore è indisponibile.

---

### 7. Parametri bloccati

| Parametro | Valore | Conseguenza |
|---|---|---|
| **Durata del titolo di accesso** | **60 minuti** | Riduce i rinnovi senza indebolire la revoca, che dipende dalla risoluzione dell'Utente di dominio (§1) e **non** dalla scadenza |
| **Conservazione dei log applicativi** | **14 giorni**, purga automatica | Sotto i 30 giorni di V5: **nessuna riga di log sopravvive al termine di cancellazione**, quindi i log non entrano fra i detentori censiti dalla catena di SE3 |
| **Soglie di allerta** | 60 s / 500 fatti arretrati; 2 cicli mancati; 25° giorno; 2.100 minuti; anti-flood 6 h | Determinano **quando il titolare viene svegliato**: né rumore che si smette di leggere, né guasto silenzioso |

La seconda riga merita di essere letta due volte, perché è una scelta di conformità travestita da parametro operativo. I log contengono `utente_id`, che è un identificatore riconducibile all'Utente: se sopravvivessero oltre i 30 giorni sarebbero **una replica priva di percorso di cancellazione**, cioè l'esclusione 2 della sezione Constraints. Fissare la conservazione a 14 giorni — meno della metà del termine — li rende **strutturalmente incapaci di violare V5**, e risparmia alla catena di SE3 un detentore in più da censire e da scandire. È lo stesso ragionamento che l'architettura dei dati applica alla purga a 7 giorni dei fatti consegnati.

I 60 minuti del titolo di accesso sono, simmetricamente, un parametro che **non porta alcun peso di sicurezza**: se lo portasse — se cioè la revoca dipendesse dalla scadenza — sessanta minuti sarebbero una finestra di ammissione indebita di sessanta minuti, contro SE1.

---

### 8. Assenze dichiarate

| Assente | Fatto di questo progetto | Condizione che la renderebbe necessaria |
|---|---|---|
| **Cifratura applicativa a livello di campo** | Il modello contiene nome, cognome, `Università`, `CorsoUniversitario` e contenuti pubblicati: **nessun dato di categoria particolare**. V5 chiede **anonimizzazione irreversibile**, non riservatezza aggiuntiva — e una cifratura reversibile **non soddisferebbe comunque V5**, perché conservare la chiave equivarrebbe a conservare la mappa che V5 esclude | Ingresso nel modello di un dato di categoria particolare, oppure richiesta dell'Autorità di controllo su un trattamento specifico |
| **Limitazione di frequenza e protezione da abuso** | Banda bloccata di ≤ 500 Utenti registrati e ≤ 10 Aule studio simultanee; **unico client autenticato**; nessuno scenario di qualità raccolto sull'abuso | Esposizione di un endpoint **non autenticato** — per esempio un webhook entrante, oggi assente per decisione — oppure superamento misurato della soglia **PE4** con costo dell'Audiochat riconducibile a un uso anomalo |

Entrambe le assenze hanno **owner interno** e sono quindi rinegoziabili senza chiedere il permesso a nessuno; entrambe hanno una condizione osservabile che ne impone la rivalutazione, così che l'assenza non si trasformi in una dimenticanza per decorso del tempo.

La prima merita una nota, perché è controintuitiva: **non cifrare i campi non è un risparmio, è una conseguenza di V5**. Una cifratura a livello di campo con chiave conservata sarebbe pseudonimizzazione con passaggi in più; una con chiave distrutta sarebbe cancellazione, che è ciò che la catena già fa direttamente e in modo verificabile — la verifica del residuo cerca **0 record e 0 file**, non «0 record leggibili».

---

### 9. Punto aperto registrato

**L'audit trail delle azioni di moderazione non è deciso qui.** È legato a **R10**: V4 pretende segnalazione, blocco fra Utenti e rimozione dichiarata, che il modello di dominio approvato non contiene, e i cinque verbi del Moderatore sono locali allo spazio per decisione esplicita (AS6). Finché il gate non decide **che cosa esiste** in materia di moderazione, non è determinato **che cosa andrebbe tracciato**: un audit trail progettato adesso registrerebbe cinque verbi locali e mancherebbe esattamente gli atti — segnalazione, blocco, rimozione dichiarata — per cui un'autorità esterna potrebbe chiederne conto.

Il punto va portato al gate **con le due autorità** già nominate: il team di revisione dello store e il proprietario del modello di dominio approvato. L'architettura registra il posto vuoto e non lo riempie.

---

### 10. Quadro di copertura

Ogni voce trasversale, lo scenario o il vincolo che la richiede, e la verifica che la rende esigibile.

| Voce trasversale | Richiesta da | Verifica |
|---|---|---|
| Risoluzione dell'identità con `Profilo` cancellato → richiesta respinta | V5, P1, SE1 | Test negativo sul contratto |
| Autorizzazione nel modulo proprietario, su dato fresco | SE1, SE2, IA4, AL4, MA2, MG2 | Test di scenario + test di architettura sui tipi importati |
| Sette segnali di osservabilità | SE1, SE3, RE1, RE2, RE3, RE4, PE1, PE2, PE3, PE4, SE2 | Asserzione dentro il test di scenario corrispondente |
| Cinque condizioni di allerta, anti-flood 6 h | R8, SE3, RE1, RE2, PE4 | Prova di iniezione di guasto |
| Regola sui dati personali nei percorsi trasversali | V1, V3 | Controllo statico sulla build + ispezione durante la verifica di SE3 |
| Idempotenza dei comandi del client | PE1, G3, AS3, IG2, IA1 | Doppio invio con stessa chiave: un effetto, stessa risposta |
| Timeout 2 s / 10 s su ogni chiamata uscente | A4, RE3 | Assenza di chiamate senza timeout, verificata staticamente |
| Budget di percorso 3 s con risposta parziale dichiarata | PE3 | Test di composizione degradata |
| 12 ritentativi entro 24 h con jitter | RE2, esclusione 9 | Test di ripresa dopo guasto simulato |
| Degradazione dichiarata per quattro componenti | RE4 | Test di PE3 con `PortaAudiochat` disattivata |
| Conservazione dei log a 14 giorni | V5, esclusione 2 | Verifica che i log non compaiano fra i detentori censiti |

Nessuna voce di questa sezione è priva di uno scenario o di un vincolo che la richieda, e **nessuna voce è priva di verifica**. È la stessa disciplina applicata al grafo dei componenti e agli schemi dei dati, ed è dovuta per la stessa ragione: in un monolite modulare esercitato senza presidio, **ciò che non è verificato meccanicamente si erode senza produrre alcun sintomo** — fino al giorno in cui il sintomo è un Utente che si lamenta, o un'autorità che chiede conto.

## Technology Stack

Lo stack tecnologico è la parte più facilmente sostituibile di questo documento e, per questo, la parte che deve giustificarsi meno con argomenti di eleganza e più con argomenti di **capacità di lavoro disponibile**. Le condizioni di contesto sono note e non rinegoziabili in questa sede: `team_size = 1`, ~2 ore a settimana per 4 settimane, `maintenance_mode = unattended`, `budget_band = minimal`, e il filtro **V3** (`data_residency = eu-only`) che restringe l'insieme dei fornitori più di qualunque criterio tecnico.

Il criterio di selezione applicato a ogni voce è duplice: **default sicuro** — tecnologia diffusa, documentata, sostituibile senza riprogettare il sistema — salvo una sola **scommessa dichiarata**, isolata e con la sua via d'uscita enunciata (§5). Una seconda scommessa, con una persona sola e due ore a settimana, non sarebbe finanziabile.

Nessun nome di prodotto compare in alcuna frase di dominio, in alcun aggregato e in alcun fatto: la quinta regola di denominazione del linguaggio ubiquo resta vincolante anche qui. Questa sezione è **l'unico luogo del documento in cui i nomi dei fornitori sono ammessi**.

---

### 1. Runtime e linguaggio

| Voce | Scelta | Motivazione |
|---|---|---|
| **Runtime** | **Node.js 22 LTS** | È il runtime imposto dai framework adottati su backend, web e mobile. Con una sola persona non è sostenibile mantenere due runtime distinti: due cicli di aggiornamento, due modelli di concorrenza, due insiemi di strumenti di diagnosi. La versione **LTS** è scelta per ricevere aggiornamenti di sicurezza senza rincorrere il ciclo di rilascio — con `maintenance_mode = unattended`, un runtime fuori supporto è un guasto di sicurezza che matura in silenzio |
| **Linguaggio** | **TypeScript**, su tutti e tre i lati — backend, web, mobile | Un solo linguaggio riduce il costo di cambio di contesto, che è **la risorsa realmente scarsa** in un progetto portato avanti in poche ore a settimana. Consente inoltre di condividere i tipi del `ContrattoVersoIlClient` fra server e applicazioni, che è esattamente ciò che **CO1** richiede di tenere allineato in un punto solo |

#### Che cosa la scelta del linguaggio deve difendere

Un linguaggio a tipi statici non è qui una preferenza estetica: è lo strumento con cui diverse verifiche già dichiarate diventano eseguibili invece che disciplinari.

- **Confini di modulo verificati meccanicamente** — la severità richiesta dallo stile («nessun modulo raggiunge il modello di un altro, si vedono unicamente le interfacce pubblicate») è controllabile sui tipi importati. In un monolite modulare la violazione di un confine non produce alcun sintomo immediato: senza un controllo statico, **MA2** diventa insoddisfacibile senza che nessuno se ne accorga.
- **Test di architettura della sezione trasversale** — quello che fallisce se un modulo `domain` importa il tipo del titolo di accesso, o se nella facciata compare un riferimento a `Permessi`, `Visibilità` o `AppartenenzaAlGruppo`, poggia sulla stessa capacità.
- **Controllo statico sui log** — quello che fallisce la build se un'invocazione di log riceve un tipo del dominio anziché campi nominati, e che difende in concreto la regola di protezione del dato nei percorsi trasversali (V1).

In tre punti su tre, la tipizzazione statica è ciò che trasforma una regola trasversale in un controllo che non si può dimenticare.

---

### 2. Framework applicativi

| Voce | Scelta | Motivazione |
|---|---|---|
| **Backend** | **NestJS** | Il suo sistema di moduli è il supporto naturale dei moduli di dominio e dei componenti tecnici già definiti: **il grafo delle dipendenze fra moduli si dichiara esplicitamente nel codice anziché emergere dagli import**. È la proprietà che serve, perché il grafo da preservare è già fissato e va verificato, non scoperto |
| **Web** | **Next.js** | Servono pagine pubbliche raggiungibili **prima** dell'onboarding — informativa, base giuridica, avvio dell'eliminazione dell'account — con rendering lato server e indirizzi stabili |
| **Mobile** | **React Native con Expo** (dev client) e build tramite **EAS Build** | Una sola base di codice per iOS e Android è l'unico modo per coprire due piattaforme con una persona sola; EAS Build elimina la gestione delle toolchain native e delle firme. Si adotta il **dev client** e non il runtime Expo Go, perché audio in tempo reale e notifiche richiedono moduli nativi non inclusi nel runtime standard |

#### Perché il sistema di moduli del backend è il criterio decisivo

Lo stile ha stabilito che i confini interni sono **imposti dal codice e non affidati a convenzioni**, e che il grafo delle dipendenze in-processo deve coincidere con la Context Map: `Accesso → Profilo → { Bacheca, Gruppo, AulaStudio }`, i due contratti disgiunti Gruppo ↔ AulaStudio, Bacheca in separate ways, **nessuna dipendenza che risalga verso Profilo**.

Un framework che richiede di **dichiarare** che cosa un modulo espone e che cosa importa rende quel grafo un artefatto leggibile e confrontabile, invece di una proprietà emergente da centinaia di righe di import. Con `team_size = 1`, la differenza è fra una verifica di pochi minuti e una revisione che non verrà fatta.

Lo stesso meccanismo serve la divisione **per ruolo di esecuzione**: le due unità — applicativa e lavoratrice — sono ricavate **dalla stessa immagine**, e differiscono per quali componenti vengono attivati all'avvio. Un contenitore di moduli che compone l'applicazione per configurazione è ciò che rende quella divisione una scelta di avvio anziché due basi di codice da tenere allineate.

#### Perché esiste un lato web, e che cosa non è

Il lato web **non è un secondo client del prodotto**: `AppMobile` resta l'unico consumatore del `ContrattoVersoIlClient`, e questa sezione non aggiunge un componente `experience` che i Components non abbiano dichiarato. Esiste per servire pagine che devono essere raggiungibili **fuori dall'app e prima dell'onboarding**, ed è la conseguenza diretta di due vincoli:

- **V2** — informativa e base giuridica devono essere presenti **prima** della raccolta dei dati di Onboarding, quindi raggiungibili da un Utente che non ha ancora un `Profilo` con `StatoOnboarding` completato, e in un luogo con indirizzo stabile e citabile;
- **V4** — l'eliminazione dell'account **deve essere avviabile dall'app** (esclusione 15), e lo è tramite `POST /v1/account/eliminazione`. Il lato web non sostituisce quel percorso: lo affianca, e ospita la spiegazione di che cosa accade in 30 giorni — inclusa la conseguenza di **R12** che va dichiarata nell'informativa, ossia che un `AllegatoDiAulaStudio` caricato da chi ha cancellato l'account **resta accessibile** con il solo `CaricatoDa` anonimizzato.

Il rendering lato server serve a questo e a null'altro: pagine indicizzabili, citabili in un'informativa e servibili senza che l'Utente installi nulla.

---

### 3. Persistenza

| Voce | Scelta | Motivazione |
|---|---|---|
| **Store relazionale** | **PostgreSQL 16** | Tecnologia matura e diffusa, con **supporto nativo a schemi multipli**, isolamento **read committed** e blocco ottimistico per versione: tutti meccanismi già richiesti dalle decisioni sui dati. **Nessun secondo motore di persistenza entra nello stack** |
| **ORM** | **Prisma**, con `multiSchema` attivo | Modella direttamente la separazione in schemi già decisa, genera tipi TypeScript coerenti con il linguaggio unico dello stack e mantiene lo schema del database **sotto controllo di versione insieme al codice** |

#### Corrispondenza puntuale con l'architettura dei dati

Ogni meccanismo richiesto dalla sezione Data Architecture trova qui una funzione nativa, non una emulazione:

| Decisione già presa | Meccanismo del motore |
|---|---|
| Quattro schemi logici disgiunti — `profilo`, `bacheca`, `gruppo`, `aula_studio` — più `cancellazione` | schemi nativi, con privilegi per schema: **l'accesso incrociato è negato dal motore**, non da una convenzione |
| Foreign key **dentro** lo schema, nessuna **fra** schemi | vincoli referenziali dichiarati, inclusa l'unica cascata del modello (`bacheca.allegato → bacheca.post`, B4) |
| **Read committed** come default | livello di isolamento predefinito del motore |
| **Blocco ottimistico per versione** su `Gruppo`, `AulaStudio`, `AlberoOrganizzativo` | colonna di versione e confronto in aggiornamento: il conflitto dei due Moderatori che retrocedono l'ultimo Moderatore è respinto senza serializzazione globale |
| Tabella dei fatti in uscita **per schema**, scritta nella stessa transazione dell'aggregato | transazione ordinaria su tabelle dello stesso schema |
| Ripristino a un punto nel tempo **3 giorni**, copie giornaliere **14 giorni** | funzioni di backup del servizio gestito, con retention configurabile — condizione necessaria per non violare l'esclusione 18 di V5 |
| Scansione di verifica del residuo per `utente_id` su tutti gli schemi (**SE3**) | interrogazioni ordinarie, in un solo motore e in una sola connessione |

#### Perché nessun secondo motore

È la scelta più difendibile dell'intera sezione, e la ragione non è la parsimonia. **Ogni store aggiuntivo è simultaneamente**: un detentore in più da censire nella catena di **SE3** (la cui verifica deve avere esito **totale**), una regione UE in più da verificare per **V3**, una superficie in più da sorvegliare in esercizio non presidiato, e una voce in più sulla `budget_band`.

Nessuno scenario bloccato richiede un secondo motore entro la banda di capacità di riferimento: **PE3** (p95 ≤ 800 ms) è raggiungibile con indici su `aula_studio_id` e `gruppo_id` e letture dirette; l'unica proiezione ammessa — l'indice delle Collocazioni — è **di dominio** e vive in `gruppo`; e il debito registrato sull'eventuale lettura di appoggio prescrive già che stia **dentro lo schema proprietario del contesto**, mai in un archivio separato.

Si noti infine che l'esclusione dell'event sourcing **non è una scelta di questa sezione**: è imposta da V1 (nessun archivio append-only immutabile per i contenuti dell'Utente) e da V5 (anonimizzazione irreversibile su ogni replica). Nessun motore avrebbe potuto renderla disponibile.

#### Perché un ORM, e con quale limite

Un generatore di tipi a partire dallo schema è coerente con il criterio di §1: il tipo della riga e il tipo del codice non possono divergere in silenzio. La migrazione dello schema versionata insieme al codice serve inoltre l'esclusione 10 — **nessuna migrazione che richieda una finestra sorvegliata** — perché con `maintenance_mode = unattended` una migrazione che pretende presidio è una migrazione che verrà eseguita male.

Il limite da tenere fermo è uno solo e discende dai confini già decisi: **l'ORM non è autorizzato a comporre query che uniscano due schemi di dominio**, e la verifica meccanica prevista sui dati resta in vigore indipendentemente dallo strumento. Uno strumento comodo per attraversare un confine è precisamente il modo in cui il confine si erode.

---

### 4. Capacità generic — nessun fornitore assegnato in questa sede

Le sei capacità generic sono già rappresentate dai componenti `integration` e `technical` decisi altrove: `PortaIdentitàUtente`, `ArchivioDiFile`, `TrasportoInTempoReale`, `PortaAudiochat`, `AvvisiInUscita`, `MisurazioniDiUtilizzo`. **Questa sezione non assegna loro alcun prodotto**, e l'astensione è deliberata: i criteri di selezione sono vincoli con owner esterno, e vanno applicati alla selezione, non ricostruiti dopo.

I criteri già bloccati, da applicare a ogni fornitore prima dell'adozione:

1. **Regione UE dichiarata e selezionabile** (V3), per i dati a riposo e in transito, incluso l'instradamento del flusso di Audiochat;
2. **Accordo sul trattamento** dei dati personali (V1);
3. **Percorso di cancellazione che raggiunga ogni replica entro 30 giorni**, file archiviati inclusi (V5), e assenza di backup di durata indefinita e non purgabili;
4. **Costo per minuto di Audiochat prevedibile e con tetto di spesa impostabile** (`budget_band`, esclusione 11);
5. **Nessuna promessa assunta oltre i termini sottoscritti** (A4, `vendor-terms-only`, RE3);
6. **Nessun meccanismo di notifica push proprio su iOS** (V4, esclusione 17): il trasporto è imposto dalla piattaforma.

Due conseguenze operative già registrate altrove e ribadite qui perché riguardano la selezione:

- **Il piano gratuito o economico che non permette di scegliere la regione è escluso** (V3). È il punto in cui V3 preme su `budget_band`, ed è **R9**; la risoluzione è già scritta in **R7**: superata la soglia si rinegozia la banda di budget, **mai** gli obblighi di protezione dei dati personali.
- **`MisurazioniDiUtilizzo` resta senza fornitore assegnato.** Nessun prodotto di analisi d'uso entra nello stack con questa decisione. La relazione è **conformist** e priva di porta di traduzione: **l'unico punto di controllo su ciò che esce è la selezione del fornitore**, e finché V1 e V3 non sono entrambi soddisfatti in modo dimostrabile, il componente esiste come posto dichiarato nell'architettura e resta vuoto. Un componente dichiarato e non attivato è una scelta; un fornitore attivato senza base giuridica sarebbe una violazione di un vincolo hard.

Finché i fornitori non sono determinati, resta `null` anche **il valore numerico di disponibilità delle dipendenze esterne**, input di **RE3**: la regola («non promettere più del minimo a monte») esiste, la cifra no, e **nessuna dichiarazione di disponibilità verso gli Utenti può precedere quella determinazione**.

---

### 5. La scommessa dichiarata

**Expo / EAS Build è l'unica scommessa di questo insieme di scelte.**

**In che cosa consiste.** Se un modulo nativo necessario — audio in tempo reale per l'Audiochat, notifiche — non risultasse supportato dal dev client, occorrerebbe **uscire dal flusso gestito e assumere la manutenzione delle build native** su due piattaforme.

**Perché è accettata.** L'alternativa è **build native gestite a mano su iOS e Android**: due toolchain, due catene di firma, due cicli di aggiornamento imposti dalle piattaforme. È fuori portata per la capacità di lavoro disponibile — ~2 ore a settimana — e va confrontata con il costo di **MA1**, che fissa a **≤ 8 ore** l'intervento ammesso per sostituire la capacità di Audiochat, cioè **un mese intero di capacità**. Un lavoro ricorrente di manutenzione nativa consumerebbe quel budget più volte l'anno senza produrre alcun avanzamento di prodotto.

**Che cosa la limita.** La scommessa insiste sul solo componente `AppMobile` e non tocca alcun modulo di dominio: se cade, cadono le modalità di build, non il modello. È anche la ragione per cui la porta dell'Audiochat è isolata come `integration` con un solo contesto di attacco — **MA1** misura 0 modifiche agli aggregati del contesto Aula studio, e quella misura resta valida qualunque sia il flusso di build.

**Aggravante da tenere presente.** La scommessa vive dentro **R11**: una correzione urgente lato app richiede giorni di revisione dello store, e nessun presidio umano può accorciarli. Se la via d'uscita dal flusso gestito si rendesse necessaria **in prossimità di una correzione urgente**, i due costi si sommerebbero. È la ragione per cui **CO1** è strutturale e non opportunistica: ciò che non si può correggere lato client in tempo utile deve poter essere corretto **lato backend, in un punto solo**, cioè nella facciata.

#### Le altre voci sono default sicuri

**Node.js, TypeScript, NestJS, Next.js, React Native, PostgreSQL, Prisma** sono tecnologie diffuse, documentate e **sostituibili senza riprogettare il sistema**. La sostituibilità non è un'affermazione di comodo: nessuna decisione già bloccata dipende da una di esse. Lo stile è un monolite modulare con due unità di esecuzione dalla stessa immagine; i confini sono moduli e schemi; il contratto verso il client è REST/JSON con versione nel percorso; la semantica dei fatti è at-least-once con deduplica per identificativo dell'evento. Tutto questo si riesprime in un altro insieme di strumenti senza toccare né la Context Map né gli invarianti.

---

### 6. Quadro di copertura

| Scelta | Decisione già bloccata che serve |
|---|---|
| Node.js 22 LTS, runtime unico | `team_size = 1`; aggiornamenti di sicurezza senza presidio (`unattended`) |
| TypeScript su tre lati | Verifica meccanica dei confini di modulo (MA2); test di architettura su §1 dei Cross-cutting; controllo statico sui log (V1); tipi condivisi del contratto (CO1) |
| NestJS | Grafo delle dipendenze dichiarato e confrontabile con la Context Map; due unità di esecuzione dalla stessa immagine |
| Next.js | Informativa e base giuridica raggiungibili prima dell'Onboarding (V2); pagina di spiegazione della catena di eliminazione (V5, R12) |
| React Native + Expo / EAS Build | Due piattaforme con una persona sola; `AppMobile` come unico consumatore del contratto (CO1, V4) |
| PostgreSQL 16 | Schemi disgiunti con isolamento imposto dal motore; read committed; blocco ottimistico (G2, G3, AS2–AS5, A2–A4); outbox per schema; backup 3/14 giorni (V5) |
| Prisma con `multiSchema` | Tipi coerenti con lo schema; migrazioni versionate senza finestra sorvegliata (esclusione 10) |
| Nessun secondo motore di persistenza | Un solo detentore in più sarebbe un detentore in più per SE3, una regione in più per V3, una superficie in più per `unattended` |
| Nessun fornitore assegnato alle capacità generic | I criteri di selezione sono V1, V3, V5, V4, A4 e `budget_band`: si applicano alla selezione, non dopo |
| Nessun prodotto di analytics | V1: relazione conformist priva di porta di traduzione; l'unico controllo è la selezione del fornitore |

Nessuna voce dello stack introduce un componente, un archivio o un'integrazione che le sezioni precedenti non abbiano già deciso, e nessuna assume una garanzia che i termini sottoscritti non offrano.

## Appendice — trace link

| Da | Relazione | A |
|---|---|---|
| documento | derives_from | domain_model v1 |
