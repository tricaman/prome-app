# Prome sugli store — materiale di sottomissione (E13.2)

> Preparato **prima** della prima sottomissione, non dopo un rilievo. Le dichiarazioni qui dentro
> descrivono ciò che il prodotto tratta **davvero**: sono state ricavate dallo schema del database e
> dal codice, tabella per tabella, non da una memoria di cosa dovrebbe fare. Se il prodotto cambia,
> questo documento cambia con lo stesso commit.

---

## 1. Due cose bloccano la sottomissione, e non sono materiale

### 1.1 Segnalazione e blocco esistono (15 agosto 2026) — la linea guida 1.2 è coperta

Prome ospita **contenuti generati dagli utenti**, e la linea guida 1.2 di App Store Review chiede
quattro cose. Dove stanno, oggi:

1. **regole pubbliche con tolleranza zero** → https://prome.app/linee-guida, con l'impegno di
   risposta **entro 24 ore**;
2. **segnalare un contenuto** → azione «Segnala» su ogni post e commento altrui (web e app), motivo
   da elenco chiuso; la segnalazione scrive una riga e manda un'email a `EMAIL_SUPPORTO`;
3. **bloccare chi abusa** → «Blocca {nome}» nello stesso pannello: bidirezionale in bacheca, spegne
   le notifiche push di quella persona; elenco e sblocco in Impostazioni;
4. **contatti pubblici** → «Chi siamo» e privacy policy sul sito.

**L'impegno delle 24 ore è operativo, non decorativo**: l'email di segnalazione arriva alla casella
`EMAIL_SUPPORTO` (obbligatoria in produzione: senza, l'API non parte) e le linee guida promettono
rimozione dei contenuti che violano le regole entro un giorno. La rimozione la fa l'operatore via
database — non esiste un pannello admin, ed è una scelta: la riga di segnalazione porta
l'identificativo del contenuto, e l'email un estratto di 300 caratteri per decidere.

Confini dichiarati: il blocco vale per la bacheca (la superficie non scelta) e non filtra aule o
gruppi già condivisi, dove restano uscita e moderazione; si segnalano post e commenti, non i
messaggi d'aula (spazi a moderazione propria).

### 1.2 Gli account esterni sono tuoi

- **Apple Developer Program** (99 $/anno) e **Google Play Console** (25 $ una volta): senza, `eas
  submit` non ha dove andare.
- **Account Expo** e progetto EAS: `eas init` scrive `extra.eas.projectId` in `app.json` — l'ho
  lasciato fuori di proposito, perché un identificativo inventato fa fallire la prima build con un
  errore che non nomina la causa.
- **Credenziali di firma**: le gestisce EAS (`eas credentials`). La cartella `credenziali/` è
  ignorata da git, ed è dove va la chiave del service account di Play.

---

## 2. Identità dell'app

| campo | valore |
| --- | --- |
| Nome | Prome |
| Bundle identifier (iOS) | `app.prome` |
| Package name (Android) | `app.prome` |
| Versione | 1.0.0 (build number e versionCode li incrementa EAS: `appVersionSource: "remote"`) |
| Categoria primaria | Istruzione |
| Categoria secondaria | Social |
| Lingue | Italiano, Inglese |
| Sito | https://prome.app |
| Privacy policy | https://prome.app/privacy |
| Supporto | https://prome.app/chi-siamo |
| Contenuti generati dagli utenti | **Sì** — incide sulla classificazione per età e richiede il punto 1.1 |
| Accesso senza account | No: senza account non c'è nulla da vedere, ed è una scelta del prodotto (nessun contenuto è pubblico sul web) |

**Classificazione per età**: la determina il questionario dei due store. La risposta che conta è
«contenuti generati dagli utenti: sì»; nessuna delle altre voci si applica (nessuna violenza,
nessun gioco d'azzardo, nessun accesso web senza restrizioni, nessun acquisto in app).

---

## 3. Schede

### Italiano

**Nome**: Prome
**Sottotitolo** (max 30): Studia insieme, davvero
**Testo promozionale** (max 170): Aule di studio con i tuoi compagni: materiali in un posto solo,
chat che resta, gruppi che durano oltre il singolo esame.

**Descrizione**:

```
Prome è il posto dove studiare insieme agli altri studenti della tua università.

AULE STUDIO
Apri un'aula per un esame, invita chi vuoi e tenete i materiali in un posto solo: PDF, appunti,
immagini, organizzati per argomento. La chat dell'aula resta scritta, quindi chi arriva dopo trova
la conversazione invece di chiedere di nuovo.

Un'aula non "finisce": la data serve a mettersi d'accordo, non a chiudere niente. I materiali
restano dove li avete lasciati.

GRUPPI
Un gruppo raccoglie le persone con cui studi sempre. Chi ne fa parte entra nelle aule del gruppo
senza aspettare un invito ogni volta.

BACHECA
Chiedi e rispondi: post con allegati, commenti, e la certezza di sapere chi vede cosa.

DECIDI CHI TI VEDE
La visibilità dei tuoi contenuti è una tua scelta — solo tu, il tuo ateneo, o tutti gli iscritti a
Prome. Cambiarla vale subito, anche per ciò che hai già scritto. "Tutti gli iscritti" non vuol dire
"sul web": niente di quello che scrivi su Prome ha una pagina pubblica, e i motori di ricerca non
lo vedono.

I TUOI DATI SONO TUOI
Si entra con l'email e un codice: nessuna password da ricordare, nessun accesso con altri account.
Puoi scaricare una copia completa dei tuoi dati quando vuoi, e puoi eliminare l'account dall'app —
i tuoi contenuti diventano anonimi, i tuoi dati vengono cancellati. Nessun tracciamento
pubblicitario, nessuna rivendita di dati: non c'è nulla da vendere.

Prome è pensato per l'università italiana e i server sono nell'Unione Europea.
```

**Parole chiave** (max 100 caratteri, separate da virgola):
`studio,università,appunti,esami,gruppo di studio,ateneo,materiali,studenti,condividere,aula`

### English

**Name**: Prome
**Subtitle**: Study together, for real
**Promotional text**: Study rooms with your coursemates: materials in one place, a chat that stays,
groups that outlast a single exam.

**Description**:

```
Prome is where you study with other students from your university.

STUDY ROOMS
Open a room for an exam, invite whoever you want, and keep the materials in one place: PDFs, notes,
images, organised by topic. The room chat stays written, so whoever joins later finds the
conversation instead of asking again.

A room never "ends": the date is there to agree on a time, not to close anything. The materials
stay where you left them.

GROUPS
A group holds the people you always study with. Members get into the group's rooms without waiting
for an invitation every time.

BOARD
Ask and answer: posts with attachments, comments, and certainty about who sees what.

YOU DECIDE WHO SEES YOU
The visibility of your content is your choice — only you, your university, or everyone on Prome.
Changing it takes effect immediately, including for what you already wrote. "Everyone on Prome"
does not mean "on the web": nothing you write on Prome has a public page, and search engines never
see it.

YOUR DATA IS YOURS
You sign in with your email and a code: no password to remember, no third-party sign-in. You can
download a full copy of your data whenever you want, and you can delete your account from the app
— your content becomes anonymous, your data is erased. No advertising trackers, no data resale:
there is nothing to sell.

Prome is built for Italian universities, and the servers are in the European Union.
```

**Keywords**:
`study,university,notes,exams,study group,campus,materials,students,share,study room`

---

## 4. Cosa tratta il prodotto, tabella per tabella

Questa è la sorgente delle due dichiarazioni che seguono. **Non aggiungere una tabella al database
senza aggiungere una riga qui**: una dichiarazione incompleta è indistinguibile da una completa per
chi la legge, ed è il difetto peggiore possibile in questo documento.

| dove | dato | perché | esce dal prodotto? |
| --- | --- | --- | --- |
| `accesso.utente` | email | è l'unico modo di entrare e di ricevere il codice | all'invio del codice, verso il relay SMTP (Brevo, UE) |
| `accesso.verifica` | codice OTP e scadenza | verificare l'ingresso | come sopra |
| `accesso.sessione` | token, **indirizzo IP**, user agent, scadenza | riconoscere il dispositivo, chiudere le sessioni da un altro dispositivo | no |
| `profilo.profilo` | nome, cognome, università, corso | dire agli altri chi sei dentro uno spazio condiviso | no |
| `profilo.impostazioni_di_privacy` | due assi di visibilità/contattabilità | applicare le tue regole in lettura | no |
| `profilo.preferenze_di_notifica` | due interruttori | non interromperti dove non vuoi | no |
| `profilo.dispositivo_di_notifica` | token della piattaforma | raggiungere il tuo apparecchio | **oggi no**: l'app non registra alcun token e non esiste un fornitore di notifiche |
| `bacheca.post` / `commento` | testo che scrivi | il prodotto | no |
| `bacheca.allegato` | file (PDF, immagini, testo) scelti dall'archivio o dal rullino, nome, tipo, dimensione | il prodotto | no: archivio sulla stessa macchina, UE |
| `aula_studio.*` | titolo, argomenti, partecipanti, permessi, messaggi, materiali | il prodotto | no |
| `aula_studio.invito` / `gruppo.invito_al_gruppo` | **indirizzo email di chi inviti** | mandargli l'invito | all'invio, verso il relay SMTP |
| `gruppo.*` | nome del gruppo, membri, ruoli | il prodotto | no |
| `profilo.blocco` | chi ha bloccato chi | non mostrarvi più l'uno i contenuti dell'altro in bacheca | no |
| `segnalazione.segnalazione` | chi ha segnalato quale contenuto e perché (mai il contenuto) | la coda di moderazione | **sì**: all'invio, email al supporto (`EMAIL_SUPPORTO`) via relay SMTP, con un estratto ≤300 caratteri del contenuto segnalato |
| `cancellazione.richiesta_di_cancellazione` | solo `utente_id`, istanti ed esiti | ri-applicare la cancellazione dopo un ripristino di backup | no |

**Cosa non c'è, e non è una dimenticanza**: nessun SDK pubblicitario, nessun prodotto di analitica
(la porta delle misurazioni **non ha un fornitore**: gli eventi esistono nel codice e non partono),
nessuna posizione geografica, nessun contatto della rubrica, nessuna fotocamera, nessun microfono,
nessun identificativo pubblicitario. **Nessun dato è condiviso con terze parti** oltre al relay
SMTP, che riceve l'indirizzo di destinazione perché è ciò che gli si chiede di fare.

---

## 5. App Privacy (Apple)

Domanda d'apertura — «raccogli dati da questa app?» → **Sì**.
«Usi i dati per il tracciamento (ATT)?» → **No**. Nessun SDK di terze parti, nessun identificativo
pubblicitario, nessun collegamento con dati di altre aziende. **Non chiedere il permesso ATT**:
chiederlo senza tracciare è un rilievo.

| Categoria Apple | Tipo | Raccolto | Collegato all'identità | Usato per il tracciamento | Scopo |
| --- | --- | --- | --- | --- | --- |
| Contact Info | Email Address | Sì | Sì | No | App Functionality |
| Contact Info | Name | Sì | Sì | No | App Functionality |
| Contact Info | Other User Contact Info | Sì (email di chi inviti) | Sì | No | App Functionality |
| User Content | Photos or Videos | Sì (immagini allegate) | Sì | No | App Functionality |
| User Content | Other User Content | Sì (post, commenti, messaggi, file, titoli) | Sì | No | App Functionality |
| Identifiers | User ID | Sì | Sì | No | App Functionality |
| Other Data | Other Data Types | Sì (università, corso) | Sì | No | App Functionality |

**Permessi iOS**: una sola stringa d'uso, `NSPhotoLibraryUsageDescription` — Apple la pretende
appena il framework Photos è collegato, anche quando la selezione passa dal selettore di sistema e
non produce alcuna richiesta. Fotocamera e microfono non sono dichiarati (il plugin li cancella
dall'Info.plist), e su Android fotocamera, microfono e archiviazione sono rimossi dal manifesto:
verificato con un prebuild, non dedotto.

**Da non dichiarare, e perché**: *Device ID* (l'app non registra nessun token di notifica),
*Usage Data* e *Diagnostics* (nessun fornitore di misurazioni, nessun crash reporter), *Purchases*,
*Location*, *Contacts*, *Search History*, *Sensitive Info*, *Health*, *Financial Info*.

L'**indirizzo IP** della sessione non ha una categoria propria nel modulo Apple e non è usato per
identificare né per tracciare: sta nel registro delle sessioni per far chiudere una sessione da un
altro dispositivo, e nella privacy policy è descritto. Se un revisore lo solleva, la risposta è
questa, per iscritto.

Nel questionario **Account Deletion** la risposta è che l'eliminazione si avvia **dentro l'app**
(Impostazioni → Elimina account): esiste e funziona, con 14 giorni di grazia e cancellazione entro
30. È un requisito, non un vanto — la linea guida 5.1.1(v) rifiuta chi offre la creazione di un
account senza offrirne l'eliminazione.

---

## 6. Data safety (Google Play)

| Sezione | Tipo | Raccolto | Condiviso | Obbligatorio | Scopo |
| --- | --- | --- | --- | --- | --- |
| Personal info | Name | Sì | No | Sì | App functionality |
| Personal info | Email address | Sì | No | Sì | App functionality, Account management |
| Personal info | User IDs | Sì | No | Sì | App functionality |
| Personal info | Other info (università, corso) | Sì | No | Sì | App functionality |
| Photos and videos | Photos | Sì | No | No (facoltativo: solo se alleghi) | App functionality |
| Files and docs | Files and docs | Sì | No | No | App functionality |
| Messages | Other in-app messages | Sì | No | No | App functionality |

Domande trasversali:

- **Dati cifrati in transito**: sì, HTTPS su tutto (certificati Let's Encrypt, un solo servizio esposto).
- **Gli utenti possono chiedere la cancellazione dei dati**: sì, **dall'app** e dal web. URL per la
  richiesta senza installare l'app: `https://prome.app/app/impostazioni`.
- **Raccolta obbligatoria per usare l'app**: nome, email e identificativo sì; il resto no.
- **Dati raccolti solo in modo effimero**: no, ciò che è dichiarato è conservato.
- **Rivolta ai bambini**: no. Pubblico: studenti universitari.
- **Ha una policy di sicurezza dei dati**: sì, https://prome.app/privacy.

---

## 7. Screenshot

Da catturare **durante il giro dal vivo**, con dati veri di due account di prova — mai finti, e mai
con i nomi di persone reali. Servono in **entrambe le lingue** solo se si pubblicano due schede
localizzate; altrimenti bastano le italiane.

| Store | Misure obbligatorie | Quanti |
| --- | --- | --- |
| App Store | 6,9" (1320×2868) e 6,5" (1242×2688) | 3–10 per misura |
| Play Store | telefono 1080×1920 o superiore, 16:9/9:16 | 2–8, più icona 512×512 e grafica in evidenza 1024×500 |

Le cinque schermate da mostrare, in quest'ordine — raccontano il prodotto nell'ordine in cui lo si
incontra:

1. **Aula studio aperta**, con la chat che ha qualche messaggio e la barra dei materiali.
2. **Materiali di un'aula** organizzati per argomento.
3. **Bacheca** con due o tre post e un allegato.
4. **Gruppo** con i membri e l'aula collocata al suo interno.
5. **Impostazioni → privacy**, che è il messaggio che ci distingue: chi vede cosa lo decidi tu.

Il tema **chiaro** per tutte: gli store le mostrano in fila e mescolare i due temi sembra un errore.

---

## 8. Note per il revisore

```
Prome è una piattaforma di studio per studenti universitari italiani. Non ci sono contenuti
pubblici: senza un account non c'è nulla da vedere, ed è una scelta di progetto.

Si entra con email + codice OTP, senza password. Per la revisione forniamo un account già
attivo (credenziali nel campo dedicato). Il codice arriva per email in pochi secondi; se
serve un secondo account per provare un invito, lo prepariamo su richiesta.

Come provare le funzioni principali:
1. Entra con l'account fornito.
2. Bacheca: pubblica un post, anche con un allegato.
3. Aule studio: apri un'aula, aggiungi un materiale, scrivi nella chat.
4. Gruppi: apri un gruppo e invita un indirizzo email.
5. Impostazioni: cambia la visibilità dei tuoi contenuti; scarica i tuoi dati; l'eliminazione
   dell'account è in fondo alla stessa schermata.

L'app non chiede alcun permesso a runtime. Per allegare una foto usa il selettore di
sistema, che consegna la sola immagine scelta: su iOS resta dichiarata
NSPhotoLibraryUsageDescription perché il framework Photos è collegato, ma nessuna
richiesta compare a schermo. Fotocamera, microfono e archiviazione sono rimossi dal
manifesto Android. Non usa posizione, rubrica né notifiche, e non contiene SDK
pubblicitari né di analitica.

Contenuti generati dagli utenti (linea guida 1.2): ogni post e commento di altri ha
un'azione «Segnala» con motivi predefiniti (la esaminiamo entro 24 ore) e, nello stesso
pannello, «Blocca»: chi blocchi sparisce dalla tua bacheca e tu dalla sua. L'elenco dei
bloccati è in Impostazioni → Utenti bloccati. Le regole della community sono pubbliche:
https://prome.app/linee-guida
```

**Account di prova**: da creare prima della sottomissione, con dati non riferibili a una persona
reale, e da **tenere vivo** — un account di prova scaduto è un rifiuto al secondo giro.

---

## 9. Cosa dichiarare quando arriverà il resto

- **Notifiche push** (E12.3): si aggiunge *Device ID* alla dichiarazione Apple e la sezione
  notifiche a Play. Oggi non si dichiara, perché l'app non registra alcun token.
- **Audio d'aula** (S-audio → E5): serve il permesso microfono con la sua motivazione scritta
  (`NSMicrophoneUsageDescription`) e la voce corrispondente nei due moduli. Oggi il permesso **non
  è dichiarato**, ed è giusto così: un permesso chiesto e non usato è un rilievo in revisione.
- **Link universali** (E12.4): il codice c'è **tutto** dal 17 agosto 2026 — il sito serve
  `apple-app-site-association` e `assetlinks.json` (`apps/web/src/app/.well-known/`), l'app dichiara
  `associatedDomains` e gli `intentFilters`, e `+native-intent.tsx` traduce l'indirizzo del sito
  nella schermata giusta. Mancano **due valori e una build**, ed è la parte che passa dai tuoi
  account:

  1. `APPLE_TEAM_ID` — App Store Connect → Membership, dieci caratteri.
  2. `ANDROID_SHA256_FIRMA` — `eas credentials` → Android → Keystore. Quando l'app sarà su Play,
     **aggiungere anche l'impronta di ri-firma di Play**, separata da virgola: sono chiavi diverse,
     e chi installa dallo store verificherebbe contro quella sbagliata.

  Le due variabili vanno in `deploy/.env` sulla macchina; il sito le rilegge a un riavvio, senza
  ricostruire. Poi serve **una build nuova dell'app**: `associatedDomains` è una capacità del
  binario, e quella installata oggi non la porta. Verifica: `curl -i` sui due indirizzi (200,
  `application/json`, nessuna redirezione) e un collegamento aperto **dall'email** su un telefono
  vero — non dalla barra degli indirizzi di Safari, dove i link universali non scattano di proposito.
