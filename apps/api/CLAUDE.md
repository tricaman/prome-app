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

### Uscita

Due endpoint, perché rispondono a due domande diverse: `POST /accesso/esci` chiude **questa** sessione (`signOut`), `POST /accesso/esci-da-tutti` le chiude **tutte, compresa quella che l'ha chiesto** (`revokeSessions`). La seconda non è la prima fatta meglio: è il gesto di chi sospetta che qualcun altro sia entrato, e lasciare viva la sessione da cui l'ha premuta sarebbe esattamente il caso in cui non serve a niente. Entrambe passano dal fornitore chiamato come libreria, come tutto il resto dell'accesso — `session.deleteMany` diretto vive solo in `cancellazione-accesso.ts`, dove non esiste una sessione viva da cui partire.

`DURATA_SESSIONE_SECONDI` è esportata da `better-auth.ts` e la risposta all'ingresso ci calcola `scadeIl`: scritta due volte, prima o poi una delle due cambia e il client crede di avere una sessione che non ha più.

### Invio del codice

`AvvisiInUscita` è una porta (`infrastruttura/avvisi-in-uscita/canale-email.ts`) con due adattatori, scelti da `CANALE_EMAIL`. Quello di sviluppo **scrive il codice nei log e non manda niente**: in produzione l'avvio si ferma (`CANALE_EMAIL=sviluppo` + `NODE_ENV=production` = fail-fast), perché un codice nei log è un codice regalato. Quello SMTP parla con un fornitore qualunque — Brevo, Resend, altri: lo spike che deve sceglierne uno cambia quattro valori nel file dei segreti, non una riga di codice.

## Impostazioni di privacy (E6.1)

Profilo e Impostazioni di privacy **nascono nella stessa scrittura**, al valore più chiuso: fra le due non esiste un istante in cui il profilo c'è e le sue regole no, perché in quell'istante non si saprebbe chi vede cosa (IP1). Non esiste lo stato «non impostato», e `PUT /profilo/me/privacy` è **l'unico gesto che le cambia**.

- **IP2 senza doverselo ricordare**: l'aggiornamento tocca **solo gli assi indicati**, quindi l'asse omesso resta al valore che aveva e non può essere azzerato. Una richiesta con nessuno dei due campi non è malformata, è un cambio che non cambia niente: `PR009`, 422, e la regola vive nel modulo — non nel DTO.
- **IP3 — i due assi sono indipendenti**: nessun vincolo di coerenza fra `contattabilita` e `visibilita`, ogni combinazione è legittima. Non introdurre un «livello di privacy» unico: sarebbe esattamente il modello che il dominio ha rifiutato.
- **IP4 — nessun altro le tocca**: pubblicare un post o entrare in un'aula non le cambia come effetto collaterale.
- **Nessun evento emesso, e non è una dimenticanza.** Se nessun altro le modifica non c'è nulla da propagare, e una decisione di privacy replicata sarebbe una decisione presa su un dato vecchio: chi deve saperle le interroga alla lettura (`autoriVisibiliA`). È lo stesso motivo per cui il cambio vale subito, senza finestra (SE2). Non emettere nemmeno una misurazione: contare quante persone aprono i propri contenuti è una domanda legittima, ma è anche una decisione di privacy che comincia a lasciare una traccia altrove.
- **`contattabilita` oggi non è applicata da nessuna regola**, ed è scritto qui perché non si scopra leggendo il codice: gli inviti viaggiano per **indirizzo email**, che può non avere un account, e verificarla lì direbbe a chi invita se quella persona è iscritta a Prome — un oracolo di esistenza in cambio di una funzione che ancora non c'è. Per questo i client non la mostrano: l'API la accetta e la conserva, l'interfaccia non promette una protezione che non esiste.
- I test stanno in `test/privacy.spec.ts` e provano il difetto invisibile per definizione: che il post di un nuovo iscritto **non si veda**, che passando a `PUBBLICO` compaia alla lettura successiva e che tornando a `PRIVATO` sparisca dal feed **e dal link diretto** — i due punti separatamente, perché sparire da uno solo è il modo tipico in cui quest'area si rompe.

## Email transazionali: un involucro solo

**In `canale-email-smtp.ts` non si scrive HTML.** Un'email si dichiara come una sequenza di **blocchi** (`modello-email/blocchi.ts`) e passa da `componiEmail`, che le dà l'involucro comune: stessa scheda, stessa larghezza, stesso marchio in testa, stesso piè di pagina. Non è una convenzione da ricordare, è l'unica strada — chi aggiunge un'email non ha modo di ottenere un involucro diverso, che è la sola forma di coerenza che non si consuma nel tempo.

- **L'elenco dei blocchi è chiuso** (`titolo`, `paragrafo`, `codice`, `azione`, `dettagli`, `nota`, `separatore`), come quello degli eventi di prodotto e per lo stesso motivo: con l'HTML a mano la quinta email non somiglia più alla prima, e nessun controllo se ne accorge. Aggiungerne uno è una decisione, non un dettaglio.
- **HTML e testo semplice nascono dagli stessi blocchi** (`involucro.ts` e `testo.ts`). Erano due stringhe scritte a mano una accanto all'altra: bastava aggiungere un paragrafo a una sola per far divergere le due, e chi legge in testo semplice riceveva un messaggio incompleto senza che nessuno lo sapesse. La parte in testo non è cortesia — un messaggio di solo HTML finisce nello spam molto più spesso, e un codice OTP nello spam è un accesso che non avviene.
- **Nessun colore scritto a mano**: `stile.ts` deriva tutto da `@prome/design-tokens`, gli stessi token del web e del mobile. Il tema scuro si genera dalle stesse chiavi del chiaro in un blocco `@media (prefers-color-scheme: dark)`, quindi non esiste un ruolo dichiarato in un tema solo. Gli stili in linea sono già il tema chiaro completo: il foglio migliora, non abilita.
- **Tutto ciò che entra nel messaggio passa da `sicurezza.ts`.** Il titolo di un'aula e il nome di chi invita li scrive una persona: senza fuga dei marcatori, un'aula chiamata `<a href=…>` diventa un collegamento vero in un'email mandata dal nostro dominio. Gli `href` accettano solo `http(s)` e `mailto`; l'oggetto perde i caratteri di controllo, con cui si aggiungerebbe un destinatario nascosto.
- **Il marchio è un allegato in linea** (`cid:`), non un indirizzo remoto: Outlook e Gmail non fidato bloccano le immagini esterne, e un'email di accesso senza il proprio marchio è esattamente ciò che una email falsa non ha. In più il messaggio non fa alcuna richiesta di rete all'apertura, e non dipende dal deploy del web. Il PNG sta accanto al modulo e lo copia in `dist` la voce `assets` di `nest-cli.json`: se sparisce di là, sparisce dalla posta.
- Regole della posta che non si rilassano: **tabelle e non `div`** (il motore di Outlook è Word), **stili in linea e non fogli esterni** (Gmail li scarta), pixel e non unità relative, esadecimali e non variabili CSS. Su Outlook classico la pastiglia dell'azione diventa un rettangolo: è degradazione dichiarata, non un difetto da inseguire.
- **Guardarle prima di spedirle**: `pnpm --filter @prome/api email:anteprima` scrive ogni email, in ogni lingua, in `.anteprima-email/` (HTML e testo). Passa dall'adattatore vero, i18n compresa — un'anteprima costruita a parte prima o poi mente. Una nuova email va aperta nei due temi di sistema prima di dirla finita.
- I test stanno in `test/modello-email.spec.ts` e non toccano il database: provano ciò che dopo la spedizione nessuno può più verificare — che l'involucro sia lo stesso per tutti, che il testo degli utenti non diventi HTML, che le due parti dicano le stesse cose.

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

## Aula studio (E3) — il contesto core

Cinque aggregati (`AulaStudio`, `Argomento`, `AllegatoDiAulaStudio`, `Invito`, e in E4 il messaggio) e **una sola entità interna**, il `Partecipante`: sta dentro l'aula perché AS2–AS5 sono affermazioni sull'**insieme** dei partecipanti, e solo chi li vede tutti insieme può garantirle al commit.

- **AS8 — nessuno stato di ciclo di vita.** Non esiste «programmata», «in corso», «conclusa»: la sola differenza è la presenza di `dataOraInizio`, e quella data **non apre né chiude nulla**. L'etichetta la deriva il client. Aggiungere un campo di stato qui è la violazione più facile da introdurre e la meno visibile: il materiale sopravvive all'incontro proprio perché non c'è niente che lo chiuda.
- **AS4 — i permessi si concedono e si revocano UNO PER UNO** (`POST|DELETE /aule-studio/:id/partecipanti/:utenteId/permessi/:permesso`). Non esiste un gesto «dai tutti i permessi», e **non esiste un endpoint per la sola lettura**: quella si raggiunge per revoche successive. L'insieme vuoto è uno stato legittimo, non un errore.
- **AS5 in un solo verso**: un moderatore ha sempre i tre permessi (`permessiEffettivi` lo rende vero in lettura, così nessuno deve ricordarselo), ma **avere i tre permessi non fa moderatore**.
- **AS2** — l'ultimo moderatore non si rimuove né si retrocede. Il caso concorrente (due moderatori che si retrocedono a vicenda, ciascuno vedendo una situazione lecita) lo respinge il **blocco ottimistico**: `versione` sull'aula, incrementata dentro la transazione che cambia l'insieme.
- **AS7** — l'ateneo è **congelato** alla creazione dall'università del creatore; l'ateneo di chi chiede di entrare si legge **fresco dal Profilo**. Dato anagrafico propagato, decisione di autorizzazione interrogata: la linea non si attraversa mai.
- **AL4 / permessi al gesto**: il permesso di caricare si legge **nell'istante del caricamento**, mai da una copia presa all'ingresso. E il già caricato **resta** se il permesso viene revocato: si governa il presente, non si riscrive il passato.
- **Eliminare un argomento non cancella alcun file**: i materiali tornano sciolti (`argomentoId = null`), in differita. È l'opposto di ciò che accade ai post — riorganizzare non distrugge.
- **Chiavi archivio `aula-studio/{aulaId}/...`**, mai l'id utente: i file d'aula sopravvivono alla cancellazione dell'account, e una chiave che nominasse l'utente sarebbe un dato personale non cancellabile.
- **`PortaAppartenenzaGruppo`** è l'anti-corruption layer verso il Gruppo: passa **un booleano** tradotto in titolo di ammissione, e **la parola «Membro» non entra nel core**. Oggi risponde sempre di no; E7 si attaccherà lì senza toccare l'ammissione.
- Codici errore: prefisso **AS**. Il contesto ha **due sole dipendenze di dominio** (Profilo e, in futuro, l'appartenenza al Gruppo): una terza è una modifica della Context Map, non un dettaglio interno.

## Gruppo (E7) — lo spazio che resta

Un gruppo è un **contenitore di utenti con appartenenza e visibilità**: niente feed, niente chat, niente notifiche proprie. Ciò che manca manca di proposito — è l'ipotesi che la porta a timebox ha confermato, e allargarla è una decisione di prodotto, non un dettaglio implementativo.

- **G4 e G2 sono la stessa preoccupazione in due momenti**: chi crea è moderatore **nella stessa scrittura** (non esiste l'istante in cui un gruppo c'è e nessuno può amministrarlo), e l'ultimo moderatore non si rimuove né si retrocede. La via d'uscita non è un'eccezione ma un verbo che il dominio possiede già: **promuovere**. La gara fra due retrocessioni la respinge il blocco ottimistico sulla `versione` del gruppo — con tre rifiuti tutti legittimi a seconda dell'intreccio (403, 409, 422), e il gruppo che resta governabile in ogni caso.
- **G3 è nella chiave primaria**, non in un controllo: `@@id([gruppoId, utenteId])`. Aggiungere due volte la stessa persona è quindi **un'operazione senza effetto**, non un errore da gestire, ed è ciò che rende innocua la doppia consegna di un fatto.
- **G5 — l'ateneo è congelato alla creazione** dall'università del creatore. Se seguisse il profilo, un gruppo cambierebbe pubblico perché una persona si è trasferita. L'università di chi legge si interroga invece **fresca**: dato anagrafico propagato, decisione di autorizzazione interrogata.
- **`gruppo` ha la propria outbox** (`FattoInUscitaDelGruppo`), gemella di quella dell'aula: una tabella per schema, perché il fatto va scritto nella stessa transazione dell'aggregato che lo produce. Porta tre fatti — invito accettato, membro rimosso, gruppo eliminato — e gira sulla **stessa corsia rapida da 1 s**: di là qualcuno aspetta davanti allo schermo, di qua qualcuno sta leggendo ciò che non dovrebbe più.

### Il confine con l'aula studio

**La dipendenza va in un verso solo: Aula studio importa Gruppo, mai il contrario.** È ciò che rende impossibile l'anello fra i due moduli, e il motivo per cui il gruppo non elenca le aule collocate — non le conosce affatto. Chi le vuole le chiede al contesto che le possiede.

- Attraversa il confine **un solo booleano** (`PortaAppartenenzaGruppo`), chiesto su dato fresco (IA4): la parola «Membro» non entra nel core. Per questo **essere moderatore del gruppo non concede nulla dentro un'aula collocata** (AS6): l'informazione non passa proprio.
- **`haTitoloDiAmmissione` sta in un posto solo** e serve in due momenti opposti — chi chiede di entrare e chi, già dentro, deve poter restare. Due copie divergerebbero, e quella dimenticata sarebbe la seconda: cioè proprio quella che decide un'uscita.
- **SE1**: alla rimozione di un membro il fatto viaggia sulla corsia rapida e il core **ri-risolve il titolo su dato fresco**, rimuovendo **solo chi resta senza**. Chi era entrato con un invito proprio non si tocca — sarebbe una rimozione indebita, lo stesso difetto di segno opposto.
- Chi è **connesso** va tolto anche dalla stanza (`allontanaDallaStanza`): la riga smette di ammetterlo alla richiesta successiva, ma una connessione aperta non ne fa nessuna e continuerebbe a ricevere i messaggi. Il trasporto continua a non decidere niente — esegue una decisione già presa.
- **Eliminare un gruppo non elimina alcuna aula**: le collocate tornano sciolte, in differita e per fatto. Cancellare un riferimento non cancella mai la cosa riferita, come per gli argomenti.
- **Chi cancella l'account** esce da tutti i gruppi; dove lascerebbe uno spazio senza moderatori il ruolo passa al **membro più anziano**, perché qui non c'è più nessuno che possa promuovere, e un gruppo ingovernabile danneggia gli altri. Un gruppo rimasto vuoto si elimina. `gruppo` è ora fra i `DETENTORI_CENSITI`.

## Chat dell'aula (E4)

Il messaggio è un aggregato **minuscolo**: nessuna versione, immutabile dopo l'invio (MA1) — è un fatto, non un documento. Non condivide alcun modello con la futura chat del Gruppo: ciò che si verifica prima di scrivere è diverso (qui un permesso, là l'appartenenza), e la duplicazione è un costo già messo a bilancio.

- **Si scrive con una richiesta ordinaria** (`POST /aule-studio/:id/messaggi`), non dal socket: è lì che vivono le regole, e il permesso di scrivere si legge **fresco all'invio** (MA2). Revocarlo zittisce da quel momento, non cancella la conversazione.
- **Persistito prima, pubblicato dopo**: la consegna in tempo reale è un `catch` che ignora il fallimento, perché un errore di consegna non è un errore di scrittura. Con il trasporto spento la chat resta usabile.
- `TrasportoInTempoReale` è una porta con **due adattatori** e un interruttore (`TRASPORTO_TEMPO_REALE`): `assente` è la **degradazione dichiarata resa eseguibile**, ed è il valore dei test — un test che passasse solo col fornitore acceso non direbbe nulla sul giorno in cui cade.
- Il trasporto **consegna e non interpreta**: non conosce permessi. Sa solo chi può *ascoltare* una stanza, e lo chiede al modulo proprietario (`registraGuardiano`, registrato a runtime per non creare un anello fra i due). Chi è in sola lettura è ammesso ad ascoltare.
- **La deduplica sta nel client**, per identificativo: la consegna è at-least-once, e alla riconnessione si rilegge la cronologia invece di ricucire buchi.
- Un'aula con messaggi (o materiali) **non si elimina**: la verifica è al comando, su lettura fresca.

## Fatti di dominio (outbox)

`modules/aula-studio/recapito-fatti.service.ts`. **Una tabella per schema, mai globale**: il fatto si scrive nella **stessa transazione dell'aggregato che lo produce** — la firma di `pubblica()` esige la transazione proprio per rendere impossibile pubblicare fuori da essa.

- Consegna **at-least-once**, elaborazione effectively-once per **deduplica sull'id dell'evento**, applicata **sempre** anche dove un'invariante la renderebbe superflua: un meccanismo solo vale più di sei ragionamenti caso per caso.
- **Corsia rapida a 1 s** nel worker, separata dai 5 minuti delle riconciliazioni, perché il suo unico fatto ha qualcuno che aspetta davanti allo schermo. Lotti da 200, ritentativi con attesa crescente e jitter, poi il fatto è **non consegnabile** (`logger.error`: è l'unico caso in cui è prevista una mano umana).
- **Purga dei consegnati a 7 giorni**: non è igiene di spazio, è che un payload può trasportare dati personali.
- **`POST /inviti/:id/accettazione` risponde 202, non 201**: l'accettazione non crea il partecipante nella stessa transazione (IA3), e dire 201 sarebbe mentire su un'entità che ancora non esiste.
- Le scadenze (inviti a 7 giorni) **non passano di qui**: lavorano per interrogazione dello stato, quindi dopo un'interruzione non hanno arretrati da recuperare — hanno una query che trova più righe.

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

## «Scarica i tuoi dati» — l'esportazione

`GET /account/dati` risponde con **una copia completa in formato leggibile**: è la funzione che la privacy policy promette **per nome**, e la promessa vale come un requisito anche se nessun documento di `documentation/` la copre.

- **La compone la facciata**, non un modulo nuovo: la cancellazione resta l'unico componente autorizzato ad attraversare tutti i contesti insieme. Qui la facciata orchestra, e **ogni contesto decide cosa dei propri dati è esportabile** (`datiPersonaliDi`), come decide cosa è cancellabile.
- **I detentori che esportano sono gli stessi che devono cancellare.** Uno che sapesse cancellare ma non esportare produrrebbe una copia incompleta *che si dichiara completa* — invisibile a chi la riceve, perché non ha modo di sapere cosa manca. A ogni nuovo detentore si aggiornano **insieme** `DETENTORI_CENSITI` e `EsportazioneController`.
- **Solo i propri dati.** Negli spazi condivisi passa la linea più delicata: si esportano la propria appartenenza e i propri messaggi, **mai la conversazione intorno** né gli altri membri. Una copia dei propri dati non è una copia della stanza, e il test lo verifica su un gruppo e un'aula in comune.
- **Nessuna credenziale, nessun token, nessun codice**: non sono dati dell'utente ma il modo in cui il sistema lo riconosce, e finirebbero in un file nella cartella dei download. Un test cerca il token della sessione stessa dentro il documento.
- I file non viaggiano nel JSON: ci sono nome, tipo, dimensione e un **URL firmato generato all'esportazione**, quindi con validità limitata — scaduto, si riscarica la copia. È scritto nell'interfaccia, non lasciato scoprire.
- Nessun evento di misurazione: esercitare un diritto sui propri dati non è un gesto da contare.

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
- Codici per contesto: **Profilo PR001-999, Bacheca BA, Aula studio AS, Gruppo GR, Cancellazione CA** (`modules/{contesto}/constants/error-codes.ts`); sistema S/V/H in `common/constants/error-codes.ts`. Stesso messaggio, punti diversi → codici diversi.
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
