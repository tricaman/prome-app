---
artifact: "domain_model"
title: "Domain Model"
project: "Prome"
client: "Myself"
version: 1
status: "approved"
created_at: "2026-08-09T15:11:06.018Z"
approved_at: "2026-08-09T15:15:35.477Z"
stage: "domain_design"
attempt: 1
run_id: "1b6e45b3-70bf-411d-9002-7a1c1725f471"
version_id: "a197758c-286a-41e3-a0d6-f929dd3f2e6c"
generated_by: "documento generato da donumAI — le modifiche si fanno nella pipeline, non in questo file"
---

# Domain Model

## Ubiquitous Language

Il linguaggio ubiquo di Prome è vincolante: **un termine designa un solo concetto e un concetto si chiama sempre allo stesso modo**, nel parlato con il fondatore, nei documenti di analisi, nei nomi degli aggregati, degli invarianti e degli eventi di dominio delle sezioni successive. Un termine entra nel glossario solo se nomina un concetto distinto e verificabile con uno scenario concreto; se due parole descrivono lo stesso scenario, una delle due viene eliminata. Le sezioni Bounded Contexts, Context Map, Aggregates & Entities, Domain Invariants e Domain Events usano esclusivamente questo vocabolario.

Dove un termine assume significati diversi in contesti diversi — è il caso di **Utente** e di **Moderatore** — la differenza non è una sfumatura ma un confine: viene segnalata qui e trattata nella sezione dedicata ai bounded context.

### Persone e accesso

| Termine | Significato preciso | Conseguenza sul modello |
| --- | --- | --- |
| **Utente** | Persona che ha un account sulla piattaforma. È l'unico termine per la persona: "membro", "iscritto", "studente" non sono ammessi come sinonimi | La parola attraversa più contesti con significati diversi (credenziale, persona identificabile, autore): è la ragione dichiarata di più confini, non un'ambiguità tollerata |
| **Registrazione** | Creazione dell'account | Momento distinto dall'Onboarding: si è registrati senza essere passati per l'Onboarding |
| **Onboarding** | Raccolta dei dati identificativi dell'Utente — nome, cognome, Università, Corso universitario — successiva alla Registrazione | Ha un esito osservabile (completato o non completato) che altre regole richiamano |
| **Profilo** | L'insieme dei dati dell'Utente raccolti in Onboarding e in seguito | È anche il nome del contesto che possiede questi dati: il termine e il confine coincidono deliberatamente |
| **Università** | L'ateneo dell'Utente, dato del Profilo | Senza questo dato uno dei valori di Visibilità è indecidibile |
| **Corso universitario** | Il corso di laurea dell'Utente, dato del Profilo | È **l'unico impiego della parola "corso"** nel dominio |
| **Impostazioni di privacy** | Le regole scelte dall'Utente su due assi distinti: **chi può contattarlo** e **chi può vedere i suoi contenuti** | Due assi, non un livello unico: sono indipendenti e si nominano sempre separatamente |

Si noti la coppia **Registrazione / Onboarding**: sono due fatti diversi in due momenti diversi, ed è scorretto dire "registrazione" intendendo la raccolta di nome, cognome, Università e Corso universitario. Analogamente, le **Impostazioni di privacy** non si riassumono mai in un aggettivo unico ("profilo aperto", "profilo chiuso"): si nomina l'asse di cui si parla.

### Contenuti

| Termine | Significato preciso | Conseguenza sul modello |
| --- | --- | --- |
| **Post** | Contenuto testuale pubblicato da un Utente, con zero o più Allegati | Il Post non porta con sé una visibilità propria: chi lo vede discende dalle Impostazioni di privacy dell'autore |
| **Commento** | Risposta testuale a un Post, scritta da un Utente | Il Commento sta sotto un Post; non esiste commento a un Commento nel vocabolario fissato |
| **Allegato** | File caricato — PDF, immagine, file testuale | È **l'unico termine** per ciò che informalmente si chiama "materiale". Vale sia per il file che accompagna un Post sia per il file condiviso in un'Aula studio: stessa parola, cicli di vita separati (vedi la nota sull'omonimia) |

### Luoghi e appartenenze

| Termine | Significato preciso | Conseguenza sul modello |
| --- | --- | --- |
| **Gruppo** | Insieme stabile e persistente di Utenti, non tematico. Dispone di Chat testuale e Audiochat proprie | L'adesione dura oltre il singolo incontro |
| **Aula studio** | Spazio tematico su un argomento, dove si studia insieme. Dispone di Chat testuale, Audiochat e Allegati. Si fa partire subito oppure porta con sé una data/ora di inizio | Si scrive **sempre per esteso**: mai "aula" da sola, mai "stanza" |
| **Argomento** | Contenitore in cui si raccolgono Allegati e testo libero su un tema di studio | È un contenitore di materiale, non uno spazio con appartenenti |
| **Visibilità** | Unico termine per indicare chi vede uno spazio, con tre soli valori: **Privato**, **Ateneo**, **Pubblico** | Vale con gli stessi tre valori sia per il Gruppo sia per l'Aula studio |
| **Invito** | Meccanismo con cui un Utente viene chiamato a entrare in un'Aula studio | **Non** è ciò che determina la Visibilità: un'Aula studio Pubblica può emettere Inviti, un'Aula studio Privata non è "l'aula su invito" ma l'aula con Visibilità Privato |
| **Membro** | Utente che appartiene a un Gruppo | Parola riservata al Gruppo |
| **Partecipante** | Utente ammesso in un'Aula studio | Parola riservata all'Aula studio |
| **Moderatore** | Ruolo di gestione di un Gruppo o di un'Aula studio. Chi crea è Moderatore | I suoi verbi sono esattamente cinque: **invitare**, **rimuovere**, **promuovere**, **concedere** e **revocare** Permessi |
| **Permessi** | Le tre capacità di interazione di un Partecipante: **Parlare** (Audiochat), **Scrivere** (Chat testuale), **Caricare** (Allegati) | Tre capacità nominate una per una, mai un "livello" o un "grado" |
| **Sola lettura** | Condizione di chi assiste senza interagire, cioè di chi non dispone di alcun Permesso | È una condizione derivata dall'assenza dei tre Permessi, non un quarto valore da assegnare |

#### Il ruolo di Moderatore è locale allo spazio

Si dice "Moderatore del Gruppo" oppure "Moderatore dell'Aula studio", mai "Moderatore" in assoluto. Essere Moderatore di un Gruppo non dice nulla su ciò che si può fare dentro un'Aula studio: sono due ruoli omonimi in due spazi diversi, e la parola non si trasferisce dall'uno all'altro.

### Funzionalità

| Termine | Significato preciso |
| --- | --- |
| **Chat testuale** | Scambio di messaggi scritti dentro un Gruppo o un'Aula studio. È una **funzionalità**, non un luogo |
| **Audiochat** | Canale audio dentro un Gruppo o un'Aula studio. È una **funzionalità**, non un luogo |

Si dice "la Chat testuale dell'Aula studio", "l'Audiochat del Gruppo": la funzionalità è sempre posseduta da uno spazio. Non si dice "entrare in chat" o "creare una audiochat" come se fossero destinazioni autonome.

### Regole di denominazione fissate

1. **Un solo concetto per "studiare insieme": l'Aula studio.** Un incontro programmato e un incontro estemporaneo sono entrambi Aule studio, distinte unicamente dalla presenza o assenza della data/ora di inizio. Incontri che si ripetono sono **più Aule studio**, non un concetto nuovo: nessuna parola viene coniata per la ripetizione.
2. **Appartenenza distinta per luogo.** Si è **Membro di un Gruppo** e **Partecipante di un'Aula studio**. Le due parole non sono intercambiabili e non si qualificano: "Membro dell'Aula studio" è scorretto, così come "Partecipante del Gruppo".
3. **La parola "corso" compare solo in "Corso universitario"**, dato del Profilo. Nessuno spazio condiviso della piattaforma porta questo nome.
4. **Chat testuale e Audiochat sono funzionalità**, possedute da Gruppi e Aule studio. Non sono spazi a sé e non si nominano come tali.
5. **Nessun nome di prodotto o tecnologia entra nel linguaggio ubiquo.** Il dominio parla di Audiochat, Chat testuale, Allegato, Registrazione; i nomi dei fornitori — di canale audio, di archiviazione file, di autenticazione, di trasporto dei messaggi, di notifica, di analisi — non compaiono in nessuna frase di dominio, in nessun aggregato e in nessun evento. Restano confinati alla fase di architettura.

#### Nota sull'omonimia dell'Allegato

"Allegato" è una sola parola con un solo significato — un file caricato — ma **non un solo ciclo di vita**. L'Allegato di un Post accompagna quel Post; l'Allegato di un'Aula studio è materiale condiviso durante l'incontro e può essere raccolto in un Argomento. Condividono il termine perché l'Utente li chiama così; non condividono regole, e la sezione sugli aggregati tratterà separatamente i due casi. Quando la distinzione conta, si dice "Allegato del Post" e "Allegato dell'Aula studio".

### Termini eliminati deliberatamente

| Termine escluso | Motivo dell'esclusione | Come si dice invece |
| --- | --- | --- |
| **Sessione** (di studio, audio) | Coincideva con Aula studio da un lato e con Audiochat dall'altro: due sovrapposizioni, nessun concetto proprio | Aula studio, oppure Audiochat |
| **Artefatto** | Astrazione che nessuno pronuncia: i contenuti si nominano direttamente | Allegato, Argomento |
| **Aperto / Chiuso** | Sinonimi di Pubblico e Privato: la Visibilità ha un solo vocabolario | Visibilità Pubblico, Visibilità Privato |
| **Mutare** | È la revoca del Permesso di Parlare, non un'azione a sé | revocare il Permesso di Parlare |
| **Osservatore** | È la condizione di Sola lettura, non un ruolo a sé | Partecipante in Sola lettura |
| **Materiale** | Sinonimo informale di un termine già fissato | Allegato |
| **Stanza**, **aula** (da sola) | Sinonimi o abbreviazioni di un termine già fissato | Aula studio, sempre per esteso |
| **Membro** riferito all'Aula studio | Confonde due appartenenze che il dominio tiene distinte | Partecipante |

L'eliminazione è operativa: questi termini non compaiono nelle sezioni successive, e la loro ricomparsa in una discussione va trattata come un errore di linguaggio da correggere sul momento, non come una variante accettabile.

## Bounded Contexts

Il modello di Prome è diviso in **cinque bounded context**. I confini sono tagliati sul **significato dei termini**, non sui moduli tecnici né sulle schermate: ogni contesto ha un solo modello dominante, un solo significato per ciascuna parola del linguaggio ubiquo, e una classificazione di sottodominio che ne determina il livello di investimento di modellazione.

La classificazione non è un'etichetta descrittiva: è una decisione di allocazione dello sforzo. Con **una sola persona e un tempo misurato di ~2 ore in 4 settimane**, sapere dove *non* si progetta modello è tanto vincolante quanto sapere dove si progetta.

### Quadro dei cinque contesti

| Contesto | Confine di significato | Classe | Implicazione di investimento |
| --- | --- | --- | --- |
| **Accesso** | L'Utente come account: Registrazione, credenziali, sessione di accesso. Qui l'Utente non ha né identità anagrafica né appartenenza accademica | generic | Non si progetta: si adotta una capacità esistente e la si nasconde dietro un punto di traduzione |
| **Profilo** | L'Utente come persona identificabile e contattabile: Onboarding, nome, cognome, Università, Corso universitario, e le regole su chi può contattarlo e chi può vedere i suoi contenuti | supporting | Si porta alla parità funzionale e non oltre; nessuna sofisticazione oltre ciò che serve ai consumatori |
| **Bacheca** | La pubblicazione asincrona: Post e Commento, con l'Utente ridotto al ruolo di autore o lettore | supporting | Parità funzionale con quanto già esisteva online: Post, Commenti, Allegati. Nessuna estensione |
| **Gruppo** | La comunità persistente: appartenenza che dura oltre il singolo incontro, moderazione, regole di accesso allo spazio, Chat testuale e Audiochat del Gruppo | supporting | Modello sufficiente a reggere Membri, Moderatori e Visibilità; nessun investimento su ciò che non differenzia |
| **Aula studio** | L'incontro di studio circoscritto nel tempo: apertura e chiusura dell'incontro, ingresso su Invito, moderazione dell'incontro, differenziazione delle facoltà di intervento, Allegati condivisi durante l'incontro, Chat testuale e Audiochat dell'incontro | **core** | È qui che si concentra l'investimento di modellazione: le distinzioni fini, i Permessi uno per uno, gli invarianti più stretti |

### Perché questi tagli e non altri

#### La parola «Utente» ha tre significati incompatibili: tre confini

Il linguaggio ubiquo fissa **Utente** come unico termine per la persona. Ma la stessa parola, letta dentro tre modelli diversi, nomina tre cose che non si possono unificare senza produrre un modello confuso:

- in **Accesso** l'Utente è **una credenziale**: qualcosa che si autentica, che ha una sessione di accesso e null'altro. Non ha nome, non ha Università, non ha contenuti;
- in **Profilo** l'Utente è **una persona identificabile e contattabile**: ha nome e cognome, ha un'affiliazione accademica (Università, Corso universitario) e ha le Impostazioni di privacy sui due assi — chi può contattarlo, chi può vedere i suoi contenuti;
- in **Bacheca** l'Utente è **un autore o un lettore**: rileva solo come firma di un Post o di un Commento, e come destinatario della decisione di visibilità presa altrove.

Tre significati, tre confini. Se **Accesso** e **Profilo** fossero un solo contesto, il vocabolario del fornitore di autenticazione (account, sessione, provider) finirebbe mescolato a nome, cognome e Università, e la regola «l'Onboarding è completato se e solo se i quattro dati sono valorizzati» starebbe accanto a regole che il dominio non possiede. Se **Bacheca** assorbisse **Profilo**, il Post porterebbe con sé una visibilità propria, mentre la decisione fissata è opposta: **chi vede un Post discende dalle Impostazioni di privacy dell'autore**, non da un attributo del Post.

#### Gruppo e Aula studio restano due contesti distinti

È il taglio più costoso e il più deliberato. Appartenenza allo spazio e appartenenza all'incontro sono **due modelli diversi**, non due varianti dello stesso:

- nel **Gruppo** l'adesione **persiste**: si è Membro finché non si viene rimossi o non si esce. Il Gruppo è un insieme stabile e non tematico, e la sua ragione d'essere è durare oltre il singolo incontro;
- nell'**Aula studio** l'appartenenza **esiste per la durata dell'incontro** e porta con sé facoltà — i Permessi di Parlare, Scrivere, Caricare — che si esauriscono con esso. Il Partecipante è ammesso a un incontro, non iscritto a una comunità.

Di conseguenza **moderazione, Visibilità, Chat testuale e Audiochat vengono modellate due volte**, una per contesto. È una duplicazione voluta e messa a bilancio: è il costo accettato per **proteggere il core** da un modello di comunità stabile che lo appesantirebbe. Un unico contesto «spazi condivisi» avrebbe un'appartenenza con due semantiche, un Moderatore con due portate e una Visibilità valutata in due momenti diversi del ciclo di vita: esattamente il tipo di modello che il linguaggio ubiquo ha già rifiutato quando ha eliminato «stanza», «sessione» e «Membro dell'Aula studio».

Coerentemente, il ruolo di **Moderatore è locale allo spazio**: essere Moderatore di un Gruppo non dice nulla su ciò che si può fare dentro un'Aula studio. Due contesti, due ruoli omonimi, nessuna derivazione automatica dall'uno all'altro.

#### L'Aula studio è l'unico core

L'Aula studio è **ciò che distingue il prodotto**. Gli spazi di studio tematici con moderazione, facoltà di intervento differenziate e materiali condivisi **non esistono negli strumenti generalisti** dove oggi avviene il comportamento reale osservato: il ripasso si organizza altrove, ognuno carica i propri file al momento del bisogno e li ritrova scorrendo una cronologia. Quel comportamento reale è la sola evidenza raccolta, e l'Aula studio è la risposta di dominio a quel comportamento.

Bacheca, Gruppo e Profilo sono **lavoro necessario ma non differenziante**: senza Profilo non si sa chi è l'Utente né chi può vedere cosa, senza Bacheca manca la parità con quanto già esisteva online, senza Gruppo manca la comunità che ospita gli incontri. Nessuno dei tre, però, è la ragione per cui uno studente sceglierebbe Prome invece di ciò che già usa. Quindi: **supporting**, portati alla parità funzionale e non oltre.

**Accesso non si progetta affatto.** È l'unico contesto interamente generic tra i cinque: l'autenticazione è una capacità che si adotta.

### Sottodomini generic — si adottano, non si modellano

Sono capacità che il prodotto consuma senza possederne il modello:

- **autenticazione** (il contesto Accesso nella sua interezza);
- **archiviazione dei file** che stanno dietro agli Allegati;
- **trasporto in tempo reale** della Chat testuale e dell'Audiochat;
- **notifiche push**;
- **invio email**;
- **analytics**.

Su questi **non si progetta modello di dominio**: si integra una capacità esistente. Il linguaggio ubiquo resta però vincolante anche qui — il dominio continua a dire Allegato, Chat testuale, Audiochat, Registrazione, e mai il nome di un fornitore. Il modo concreto in cui ciascuna capacità viene raggiunta, e i pattern che ne governano il confine, sono materia della Context Map e della fase di architettura, non di questa sezione.

### Conseguenze vincolanti per il resto del documento

Queste regole valgono per le sezioni Context Map, Aggregates & Entities, Domain Invariants e Domain Events, e non sono rinegoziabili sezione per sezione:

1. **L'investimento di modellazione si concentra sull'Aula studio.** Gli aggregati più articolati, gli invarianti più stretti e il catalogo di eventi più ricco appartengono al core. Dove il core chiede una distinzione fine, la si fa; dove la chiede un supporting, si preferisce la soluzione più semplice che regge.
2. **I contesti supporting si portano alla parità funzionale e non oltre.** Profilo, Bacheca e Gruppo ricevono ciò che serve a funzionare come funzionava prima, più ciò che il core richiede da loro. Nessuna elaborazione speculativa.
3. **Nessun contesto generic riceve regole di dominio.** In particolare: **se una regola decide *chi può fare cosa*, non appartiene mai ad Accesso**, e appartiene sempre a uno dei quattro contesti modellati. La contattabilità e la visibilità dei contenuti dell'Utente stanno in Profilo; la Visibilità dello spazio, l'ammissione e i Permessi stanno in Gruppo e in Aula studio, ciascuno per il proprio spazio.
4. **Ogni concetto ha un solo contesto proprietario.** Il Moderatore del Gruppo e il Moderatore dell'Aula studio sono due modelli distinti nei rispettivi contesti; l'Argomento e l'Allegato dell'Aula studio appartengono al core; il Post e il suo Allegato appartengono alla Bacheca. La parola condivisa non implica mai un modello condiviso.
5. **Nessun contesto nuovo viene introdotto più avanti.** I concetti rinviati fuori dalla prima release non aprono un sesto confine: incontri che si ripetono sono più Aule studio, quindi restano dentro il core.

## Context Map

I cinque bounded context non sono isole: si parlano lungo un numero **deliberatamente piccolo di linee**, ciascuna con un pattern di integrazione dichiarato, una direzione di dipendenza esplicita e un contenuto preciso che attraversa il confine. Questa sezione fissa **quali linee esistono, chi sta a monte, che cosa passa e che cosa non passa mai**. I pattern qui nominati — anti-corruption layer, customer/supplier, open-host service con published language, partnership, conformist, separate ways — sono pattern di relazione fra modelli: i meccanismi concreti con cui verranno realizzati appartengono alla fase di architettura e non compaiono qui.

Il criterio che governa tutte le linee è quello già fissato nella sezione precedente: **l'investimento si concentra sull'Aula studio**, e ogni linea che tocca il core esiste solo se il core non può farne a meno. Il risultato è che il core ha **due sole dipendenze di dominio**.

### Quadro delle linee

| Linea | Pattern | Direzione | Cosa attraversa il confine |
| --- | --- | --- | --- |
| Accesso → Profilo | anti-corruption layer (punto di traduzione unico) | Accesso a monte, Profilo a valle | esclusivamente l'identità dell'Utente di dominio |
| Profilo → Bacheca | customer/supplier + open-host service con published language | Profilo a monte | riferimento anagrafico dell'Utente; esito delle decisioni di privacy |
| Profilo → Gruppo | customer/supplier + open-host service con published language (stesso contratto) | Profilo a monte | riferimento anagrafico dell'Utente, inclusa l'Università; esito delle decisioni di privacy |
| Profilo → Aula studio | customer/supplier + open-host service con published language (stesso contratto) | Profilo a monte | riferimento anagrafico dell'Utente, inclusa l'Università; esito delle decisioni di privacy |
| Aula studio → Gruppo (indice) | partnership, contratto d'indice pubblicato | Aula studio a monte su questo contratto | un'etichetta minima dell'Aula studio, mai il suo modello (nessun Partecipante, Permesso, Audiochat) |
| Gruppo → Aula studio (appartenenza) | partnership, contratto di appartenenza pubblicato | Gruppo a monte su questo contratto | un solo fatto: se un dato Utente è Membro di un dato Gruppo |
| Bacheca ↔ Gruppo | separate ways | nessuna | nulla |
| Bacheca ↔ Aula studio | separate ways | nessuna | nulla |
| Ogni contesto → capacità generic | anti-corruption layer sottile; conformist dichiarato solo per analytics | fornitore a monte | operazioni tecniche espresse nella lingua del dominio |

### Verso Accesso: un solo punto di traduzione, posseduto da Profilo

Esiste **un unico anti-corruption layer** verso Accesso, e il suo proprietario è **Profilo**. Il suo compito è uno solo: convertire l'account autenticato nell'**Utente di dominio**. Nulla di più attraversa quel confine — nessuna nozione di credenziale, nessuna nozione di sessione di accesso, nessun attributo che il fornitore di autenticazione porti con sé.

La conseguenza è vincolante per gli altri tre contesti modellati: **il vocabolario dell'autenticazione — account, sessione, provider, token — non compare in Bacheca, Gruppo e Aula studio**. Questi tre non conoscono Accesso: conoscono soltanto l'Utente pubblicato da Profilo. Se un giorno il modo di autenticarsi cambia, la traduzione da riscrivere è in un solo punto, e il core non se ne accorge.

Lo scambio su questa linea è **sincrono, in risposta immediata, senza riconciliazione differita**: l'identità o è disponibile nel momento in cui serve, oppure l'operazione non procede. Non esiste una copia locale dell'account da riallineare, perché non esiste un modello locale dell'account: esiste un Utente di dominio, e nasce qui.

Questa linea è anche l'applicazione letterale della regola già fissata: **se una regola decide *chi può fare cosa*, non appartiene mai ad Accesso**. Accesso stabilisce che qualcuno è chi dice di essere; tutto ciò che riguarda contattabilità, Visibilità, ammissione e Permessi vive nei quattro contesti modellati.

### Verso Profilo: un contratto unico, versionato, non specializzato

Profilo è **supplier** dei tre contesti a valle e pubblica un **open-host service con published language**: un contratto unico e versionato, **identico per i tre consumatori e non specializzato per nessuno di essi**. Non esiste un contratto «per la Bacheca» e uno «per l'Aula studio»: esisterebbero due modelli di Utente da mantenere allineati, ed è precisamente ciò che il confine serve a evitare. Che il consumatore sia il core o un supporting non cambia il linguaggio pubblicato; cambia semmai quanto ne usa.

Sul contratto viaggiano **due cose distinte, con due modalità di scambio diverse** — e la distinzione è sostanziale, non un dettaglio di realizzazione:

1. **Il riferimento anagrafico dell'Utente** — nome, cognome, Università, Corso universitario — è **distribuito ai consumatori per propagazione**. Bacheca, Gruppo e Aula studio ne tengono una copia locale, che serve a mostrare chi ha scritto un Post, chi è Membro, chi è Partecipante. È un dato che tollera un ritardo: un nome aggiornato che compare qualche minuto dopo negli elenchi non rompe nulla.
2. **Le domande di autorizzazione** — chi può contattare l'Utente, chi può vedere i contenuti dell'Utente — sono **interrogazioni sincrone risolte da Profilo nel momento in cui servono**. Non si propagano e non si copiano: una decisione di privacy replicata è una decisione che può essere presa su un dato vecchio, ed è esattamente il caso in cui il ritardo non è accettabile.

**L'Università viaggia su questa linea** per una ragione precisa: senza di essa il valore **Ateneo** della Visibilità è **indecidibile a valle**. Gruppo e Aula studio devono poter stabilire se un Utente appartiene o meno all'ateneo di riferimento dello spazio, e quel dato nasce nel Profilo. È l'unico motivo per cui un dato anagrafico attraversa il confine verso il core: non «per completezza», ma perché una regola del core lo richiede.

#### Ripartizione delle competenze — chi decide che cosa

La linea verso Profilo è la sede in cui si rischia di più la confusione di responsabilità, quindi la ripartizione è fissata esplicitamente:

| Decisione | Contesto proprietario |
| --- | --- |
| Chi può contattare l'Utente | **Profilo** |
| Chi può vedere i contenuti dell'Utente | **Profilo** |
| Visibilità del Gruppo, ammissione al Gruppo | **Gruppo**, per il proprio spazio |
| Visibilità dell'Aula studio, ammissione, Permessi (Parlare, Scrivere, Caricare) | **Aula studio**, per il proprio spazio |

Da cui due negazioni altrettanto vincolanti:

- **Profilo non conosce il concetto di Moderatore.** Non sa che esistono ruoli di gestione di uno spazio, non li registra, non li valuta. Il Moderatore è locale allo spazio, come già fissato, e nessuna delle due parti lo esporta.
- **L'Aula studio non conosce le Impostazioni di privacy come proprio concetto.** Il core non modella i due assi della privacy: interroga Profilo quando la risposta gli serve, e per il resto parla la propria lingua — Visibilità, Invito, Partecipante, Permessi.

È la stessa disciplina applicata da entrambi i lati: nessuno dei due contesti importa il vocabolario dell'altro, e la sovrapposizione apparente (entrambi hanno a che fare con «chi vede cosa») è risolta separando l'oggetto della decisione — **i contenuti dell'Utente** stanno in Profilo, **lo spazio condiviso** sta in Gruppo o in Aula studio.

### Partnership Gruppo ↔ Aula studio: bidirezionale, su due contratti che non si sovrappongono

È la linea più delicata, perché mette in relazione il core con il contesto da cui la sezione precedente ha deciso di proteggerlo. La relazione è **bidirezionale** ed è realizzata da **due contratti pubblicati distinti e non sovrapposti**, uno per verso. Su **entrambi i lati c'è un anti-corruption layer**.

#### Contratto d'indice — dall'Aula studio al Gruppo

Su questo contratto **l'Aula studio è a monte**. Attraversa il confine **un'etichetta minima dell'Aula studio**, quanto basta al Gruppo per organizzarne il riferimento nel proprio spazio. Non attraversa **mai il modello del core**: nessun Partecipante, nessun Permesso, nessuna Audiochat, nessun Invito. Il Gruppo non deve poter ragionare su chi è ammesso a un incontro né su chi vi può parlare: quelle decisioni appartengono all'Aula studio e restano dentro l'Aula studio.

#### Contratto di appartenenza — dal Gruppo all'Aula studio

Su questo contratto **il Gruppo è a monte**, e attraversa il confine **un solo fatto**: se un dato Utente è Membro di un dato Gruppo. Un fatto, non un modello. L'**anti-corruption layer dell'Aula studio traduce quel fatto in un concetto proprio del core**: il core valuta un titolo di ammissione al proprio incontro e continua a parlare la propria lingua — **Partecipante, Invito, Permessi**.

Questa è la clausola che protegge il core in concreto: **l'Aula studio non importa il concetto di Membro**, né alcun altro elemento del modello di comunità del Gruppo. Il termine Membro resta riservato al Gruppo, come fissato nel linguaggio ubiquo, e non entra nel vocabolario dell'incontro nemmeno come termine importato.

#### Perché non shared kernel e non conformist

Entrambi i pattern sono **esplicitamente scartati** su questa linea:

- **Shared kernel** richiederebbe un modello condiviso di appartenenza e di moderazione, mantenuto in accordo dai due contesti. È esattamente la duplicazione che la sezione precedente ha deciso di **pagare invece di eliminare**: appartenenza persistente e appartenenza all'incontro sono due modelli diversi, e fonderli riporterebbe nel core il modello di comunità stabile da cui lo si è separato.
- **Conformist** significherebbe che uno dei due adotta il modello dell'altro senza traduzione. Se lo facesse l'Aula studio, il core parlerebbe la lingua di un supporting: inaccettabile per il contesto su cui si concentra l'investimento.

Quindi: **appartenenza e moderazione restano modellate separatamente nei due contesti**, con due contratti stretti e due traduzioni.

#### Quando questa scelta va rivista

La partnership è dichiarata **rivedibile a una condizione osservabile**: quando le **Aule studio collocate in Gruppi supereranno stabilmente quelle autonome**. In quel momento il baricentro d'uso si sarà spostato, e la simmetria fra i due contesti non descriverà più la realtà; si valuterà allora **una relazione asimmetrica dichiarata**. Finché la condizione non si verifica, la partnership resta com'è: la revisione è legata a un fatto misurabile, non a una sensazione.

### Separate ways della Bacheca

**La Bacheca non si integra né con Gruppo né con Aula studio.** Nessun contratto, nessun evento condiviso, nessuna libreria di dominio comune. È una non-linea decisa, non una linea rimandata.

La tentazione da respingere ha un nome preciso: l'**omonimia dell'Allegato**. Un Allegato di un Post e un Allegato di un'Aula studio **condividono la parola, non il ciclo di vita** — il primo accompagna il contenuto che è pubblicato, il secondo è materiale condiviso durante l'incontro e può essere raccolto in un Argomento. Da qui: **nessuna libreria di dominio condivisa, nessuno shared kernel**. Ciò che i due hanno realmente in comune è una **capacità generic di archiviazione**, che è un servizio, non un modello.

Seconda conseguenza, altrettanto esplicita: **un Post pubblicato non entra mai negli spazi del Gruppo**. La Bacheca è pubblicazione asincrona verso chi le Impostazioni di privacy dell'autore consentono; il Gruppo è una comunità con la propria Chat testuale. Collegare le due cose introdurrebbe un flusso di contenuti fra contesti che nessuna decisione presa richiede.

La Bacheca resta dunque un contesto con **una sola linea entrante** — il contratto pubblicato da Profilo — e nient'altro. È anche ciò che la rende la parte più facilmente pubblicabile per prima senza trascinarsi dietro il resto del modello.

### Capacità generic: porte sottili che parlano la lingua del dominio

Archiviazione dei file, trasporto della Chat testuale, trasporto dell'Audiochat, notifiche push, invio email stanno **dietro porte sottili** — anti-corruption layer minimi — che **espongono i termini del dominio (Allegato, Chat testuale, Audiochat) e mai quelli del fornitore**. Le porte sono sottili perché non c'è modello da tradurre: c'è un'operazione tecnica da nominare in lingua di dominio.

Vale in modo particolare per l'**Audiochat**: la sua porta esiste per una ragione dichiarata, cioè **poter sostituire la capacità sottostante senza toccare il modello dell'Aula studio**. È il punto in cui una scelta tecnica incerta incrocia il core, e il confine è la sola difesa: nel dominio l'Audiochat resta una funzionalità posseduta dall'Aula studio, alla quale corrisponde il solo Permesso di Parlare.

**Unica eccezione dichiarata: analytics è conformist.** Si adotta il modello del fornitore senza traduzione, perché è un **flusso a senso unico che non rientra nel dominio**: nulla di ciò che analytics esprime torna indietro a decidere qualcosa nel modello. Costruire una porta di traduzione qui sarebbe lavoro speso per proteggere un confine che nessuna regola di dominio attraversa.

Su nessuna di queste linee passano regole di dominio, coerentemente con quanto già fissato: le capacità generic non ricevono decisioni su *chi può fare cosa*.

### Grafo risultante e proprietà da preservare

Il grafo delle dipendenze di dominio è:

```
Accesso → Profilo → { Bacheca, Gruppo, Aula studio }
                       Gruppo ↔ Aula studio  (due contratti distinti:
                                              indice ↑, appartenenza ↓)
Bacheca ⟂ Gruppo      Bacheca ⟂ Aula studio  (separate ways)
```

Tre proprietà vanno preservate da qualunque decisione successiva:

1. **Nessun ciclo sullo stesso contratto.** La bidirezionalità fra Gruppo e Aula studio esiste solo perché i due versi viaggiano su **due contratti distinti e non sovrapposti**: l'indice in un verso, l'appartenenza nell'altro. Aggiungere al contratto d'indice un'informazione di appartenenza, o viceversa, creerebbe il ciclo che questa decisione evita.
2. **Nessuna dipendenza che risale verso Profilo.** Profilo è supplier e non diventa mai consumatore di Bacheca, Gruppo o Aula studio. In particolare non apprende nulla sugli spazi: non sa che esistono Moderatori, Membri o Partecipanti.
3. **Il core ha due sole dipendenze di dominio**: il **contratto pubblicato da Profilo** e il **fatto di appartenenza pubblicato dal Gruppo**. Ogni proposta futura che aggiunga una terza dipendenza al contesto Aula studio va trattata come una modifica della Context Map, non come un dettaglio interno al core.

Una lettura finale, utile a chi deve decidere l'ordine di lavoro: il contesto con più linee entranti è il core, ed entrambe sono strette e traducibili; il contesto con meno linee è la Bacheca, che dipende solo da Profilo. La mappa dice quindi anche questo — **la parte pubblicabile per prima è quella con meno confini da attraversare**, e il core è protetto abbastanza da poter essere costruito dopo senza rimettere in discussione ciò che lo precede.

## Aggregates & Entities

Gli aggregati sono **piccoli confini di consistenza transazionale**: ciascuno raccoglie ciò che deve essere vero *insieme, nello stesso istante di scrittura*, e nient'altro. Tutto ciò che sta fuori dal confine è riferito **per sola identità** — mai per contenimento, mai per navigazione diretta al modello altrui. Un aggregato che cresce oltre ciò che è obbligato a garantire diventa un punto di contesa in scrittura e un modello che nessuno riesce più a spiegare a voce.

Due criteri hanno guidato ogni composizione qui sotto, e vale la pena enunciarli prima delle tabelle perché spiegano le scelte apparentemente asimmetriche:

1. **Si include ciò che nasce e muore con la radice, e ciò la cui regola non è verificabile senza la radice.** L'`Allegato` di un Post non ha vita propria: sta dentro. L'`AllegatoDiAulaStudio` sopravvive allo spostamento fra Argomenti e non dipende da un contenitore: sta fuori.
2. **Si esclude ciò che viene scritto in concorrenza da persone diverse.** Il Commento è aggregato autonomo perché più Utenti commentano lo stesso Post nello stesso momento; farne un'entità interna al Post significherebbe far competere tutti gli autori sulla stessa scrittura.

La distribuzione degli aggregati riflette la classificazione dei contesti: **il core Aula studio è il contesto con la composizione più articolata** (cinque aggregati, e le distinzioni più fini), mentre i supporting restano al minimo che regge la parità funzionale.

---

### Contesto Profilo

| Aggregato (radice) | Entità interne | Value object |
| --- | --- | --- |
| **Profilo** (id = `UtenteId`) | — | `NomeCompleto`, `Università`, `CorsoUniversitario`, `StatoOnboarding` |
| **ImpostazioniDiPrivacy** (id = `UtenteId`) | — | `RegolaDiContattabilità`, `RegolaDiVisibilitàContenuti` |

#### Perché due aggregati e non uno solo articolato in due sezioni

Profilo e ImpostazioniDiPrivacy **condividono l'identità** (`UtenteId`) ma **non il lifecycle**, ed è questa la ragione della separazione. L'anagrafica si riempie durante l'**Onboarding** e poi si corregge raramente; le Impostazioni di privacy esistono fin dal primo istante di vita dell'Utente, con un valore di partenza, e cambiano quando e solo quando l'Utente decide di cambiarle. Sono due traiettorie di scrittura indipendenti: un aggiornamento del Corso universitario e una modifica della regola su chi può contattare l'Utente non hanno alcuna regola comune da difendere al commit.

Unificarli produrrebbe un unico oggetto scritto da due flussi scorrelati, con l'effetto pratico di far dipendere una decisione di privacy dallo stato dell'Onboarding — dipendenza che il dominio non ha mai affermato. La condivisione dell'identità è invece deliberata: dato un `UtenteId`, entrambi si raggiungono senza intermediazioni.

#### Sui value object di questo contesto

- `NomeCompleto` tiene insieme nome e cognome perché nel dominio si presentano e si aggiornano sempre insieme: è il modo in cui l'Utente si mostra a chi legge un Post o un elenco di Partecipanti.
- `Università` e `CorsoUniversitario` sono **due value object distinti** e non un unico blocco «affiliazione accademica»: l'Università ha un impiego che il Corso universitario non ha — è il dato senza il quale il valore **Ateneo** della Visibilità sarebbe indecidibile a valle — mentre il Corso universitario resta un dato descrittivo del Profilo.
- `StatoOnboarding` è un value object e non un'entità: non ha identità propria, è una qualità del Profilo in un dato momento. È l'unico stato di ciclo di vita presente nell'intero modello, e appartiene a un supporting, non al core.
- Le due regole di privacy sono **due value object separati**, uno per asse — chi può contattare l'Utente, chi può vedere i contenuti dell'Utente — coerentemente con il linguaggio ubiquo che vieta di riassumerle in un aggettivo unico. Non esiste un value object «livello di privacy».

Questo contesto **non contiene alcun concetto di Moderatore, Membro o Partecipante**: sono termini che vivono negli spazi, e Profilo non conosce gli spazi.

---

### Contesto Bacheca

| Aggregato (radice) | Entità interne | Value object |
| --- | --- | --- |
| **Post** | `Allegato` (0..N) | `TestoDelPost`, `FileArchiviato` (chiave storage, nome, tipo, dimensione) |
| **Commento** (riferisce `PostId`) | — | `TestoDelCommento` |

#### L'Allegato è entità interna al Post

L'`Allegato` **nasce e muore con il contenuto che accompagna**. Non lo si sposta da un Post a un altro, non lo si consulta indipendentemente dal Post che lo porta, non ha una collocazione alternativa. È il caso da manuale di entità interna: ha bisogno di un'identità per essere distinto dagli altri Allegati dello stesso Post — quindi non è un value object — ma la sua esistenza è interamente subordinata alla radice.

Da qui discende che aggiungere o rimuovere un Allegato è una **scrittura sul Post**, e che l'eliminazione del Post porta via i suoi Allegati nella stessa scrittura. È una garanzia che l'aggregato può dare perché ha tutto dentro il proprio confine.

#### Il Commento è aggregato autonomo

Il Commento è **scritto in concorrenza da autori diversi**: è la ragione decisiva. Su un Post commentano più Utenti, spesso ravvicinati nel tempo, e ciascuno deve poter scrivere il proprio Commento senza attendere né contendere con gli altri. Un Commento contenuto nel Post trasformerebbe ogni risposta in una modifica del Post stesso.

Il Commento **riferisce il `PostId` per identità**, secondo la regola generale: conosce il numero identificativo del Post sotto cui sta, non il Post. La conseguenza — che l'esistenza del Post sia verificata quando si comanda la scrittura e non protetta al momento del commit — è materia della sezione sugli invarianti; qui basta registrare che il confine è tracciato consapevolmente là dove quella garanzia non è più esigibile.

#### Il value object `FileArchiviato`

`FileArchiviato` descrive il file in termini di dominio — **chiave di archiviazione, nome, tipo, dimensione** — e non nomina alcun fornitore. È immutabile e privo di identità: due Allegati con lo stesso `FileArchiviato` sono due Allegati distinti che puntano allo stesso file archiviato. La chiave di archiviazione è un dato opaco per il dominio: serve a ritrovare il file attraverso la capacità generic di archiviazione, e null'altro.

Si noti che **il Post non porta alcun attributo di visibilità**: chi vede un Post è una decisione delle Impostazioni di privacy dell'autore, che vivono in un altro contesto e si interrogano al momento della lettura. Nessun value object di visibilità compare quindi in questo contesto — l'assenza è tanto vincolante quanto le presenze.

---

### Contesto Gruppo

| Aggregato (radice) | Entità interne | Value object |
| --- | --- | --- |
| **Gruppo** | `Membro` (con ruolo Moderatore) | `NomeDelGruppo`, `Visibilità` |
| **AlberoOrganizzativo** (uno per Gruppo) | `Cartella` (annidabile) | `Collocazione` (sole `AulaStudioId`) |
| **InvitoAlGruppo** | — | `Destinatario`, `StatoInvito` |
| **MessaggioDiChat (Gruppo)** | — | `TestoMessaggio`, `IstanteDiInvio` |

#### `Gruppo` — la comunità e i suoi Membri in un solo confine

Il `Membro` è **entità interna al Gruppo**, con il proprio ruolo di Moderatore. La composizione è imposta dalle regole che il Gruppo deve garantire *insieme*: che un Utente compaia una volta sola fra i Membri, e che il Gruppo non resti mai senza un Moderatore. Sono affermazioni sull'**insieme** dei Membri, non sul singolo: solo un aggregato che vede tutti i Membri contemporaneamente può verificarle al momento della scrittura. Estrarre il Membro come aggregato autonomo renderebbe entrambe le regole non più garantibili.

Il `Membro` riferisce l'Utente **per sola identità** (`UtenteId`): nome e cognome non stanno qui, arrivano dal riferimento anagrafico pubblicato da Profilo. Il Gruppo non possiede una copia del Profilo, possiede l'appartenenza.

`Visibilità` è il value object con i tre valori del linguaggio ubiquo — Privato, Ateneo, Pubblico. Quando vale Ateneo, il Gruppo porta con sé **l'ateneo di riferimento** dello spazio: è un dato dello spazio, non dell'Utente, e non va confuso con l'`Università` del Profilo di chi vi accede.

#### `AlberoOrganizzativo` — un aggregato separato dal Gruppo

L'organizzazione interna è **un aggregato a sé, uno per Gruppo**. La separazione dal `Gruppo` ha una motivazione strutturale: le regole dell'Albero — nessun ciclo nell'annidamento, unicità del nome fra Cartelle sorelle, unicità di una `AulaStudioId` nell'intero Albero — riguardano la **forma dell'albero**, non l'appartenenza. Nulla lega la creazione di una Cartella all'elenco dei Membri, e tenere i due insiemi nello stesso confine farebbe contendere chi riordina le Cartelle con chi entra ed esce dal Gruppo.

La `Cartella` è **entità interna e annidabile**: la sua posizione ha senso solo dentro l'albero che la contiene, e le regole di forma sono affermazioni sull'intera struttura. La `Collocazione` è invece un **value object che riferisce esclusivamente `AulaStudioId`** — nient'altro. È il punto in cui la disciplina della Context Map diventa composizione di aggregati: il Gruppo colloca il **riferimento** a un'Aula studio, non ne importa il modello. Nessun Partecipante, nessun Permesso, nessuna Audiochat entra nell'Albero organizzativo.

**Nel contesto Gruppo non esiste alcun aggregato `Argomento`.** L'Albero contiene esclusivamente Cartelle e collocazioni di Aule studio. Il materiale di studio non è organizzato dal Gruppo.

#### `InvitoAlGruppo` — l'Invito ha vita propria

L'Invito è aggregato autonomo perché **esiste prima e indipendentemente dall'appartenenza che potrebbe produrre**: viene emesso, resta in attesa, si conclude in un modo o nell'altro. Il suo destinatario può anche non essere ancora un Utente della piattaforma. Farne un'entità interna al Gruppo caricherebbe la comunità di tutti gli Inviti mai emessi, compresi quelli che non diventeranno mai un Membro.

`Destinatario` e `StatoInvito` sono value object: il primo identifica chi è chiamato, il secondo dice a che punto è il ciclo di vita dell'Invito. La regola per cui l'accettazione **non** produce il Membro nella stessa scrittura è una conseguenza diretta di questa separazione, ed è trattata negli invarianti.

#### `MessaggioDiChat (Gruppo)` — aggregato minuscolo, per volume e per concorrenza

Ogni messaggio della Chat testuale del Gruppo è **un aggregato a sé**, con `TestoMessaggio`, `IstanteDiInvio` e l'autore riferito per identità. La Chat testuale è una funzionalità posseduta dal Gruppo, non un luogo, e infatti **non esiste alcun aggregato «Chat»**: esiste il messaggio.

La scelta è dettata dalla natura del flusso: molti autori scrivono contemporaneamente, e il messaggio una volta inviato non cambia più. Un aggregato che contenesse la conversazione sarebbe un punto di contesa per ogni singola riga scritta. Il messaggio non contiene alcuna regola di appartenenza: **il titolo a scrivere si verifica sul `Gruppo`**, non dentro il messaggio.

Questa è la **chat globale del Gruppo**, distinta dai contenuti collocati nelle Cartelle dell'Albero organizzativo: le due cose non si toccano e non stanno nello stesso confine.

---

### Contesto Aula studio (core)

| Aggregato (radice) | Entità interne | Value object |
| --- | --- | --- |
| **AulaStudio** | `Partecipante` (con ruolo Moderatore e Permessi) | `TitoloAulaStudio`, `Visibilità`, `DataOraDiInizio` (opzionale), `Permessi`, `CollocazioneNelGruppo` (`GruppoId`, opzionale) |
| **Argomento** (riferisce `AulaStudioId`) | — | `TitoloArgomento`, `TestoLibero` |
| **AllegatoDiAulaStudio** (riferisce `AulaStudioId`; `ArgomentoId` facoltativo) | — | `FileArchiviato`, `CaricatoDa` (`UtenteId`) |
| **Invito** | — | `Destinatario`, `StatoInvito` |
| **MessaggioDiChat (Aula studio)** | — | `TestoMessaggio`, `IstanteDiInvio` |

#### `AulaStudio` — l'incontro, i suoi Partecipanti e le loro facoltà

È l'aggregato su cui si concentra l'investimento di modellazione. Il `Partecipante` è **entità interna**, e porta con sé **il ruolo di Moderatore e i Permessi**. La composizione è la parte più densa del modello, e ogni elemento del confine risponde a una regola che l'aggregato deve garantire nello stesso istante:

- che un `UtenteId` compaia **al massimo una volta** fra i Partecipanti — affermazione sull'insieme;
- che esista **sempre almeno un Partecipante Moderatore** — di nuovo un'affermazione sull'insieme, che nessun Partecipante isolato potrebbe verificare;
- che i Permessi di ciascun Partecipante siano **ben formati**, cioè un sottoinsieme di {Parlare, Scrivere, Caricare}, concessi e revocati **uno per uno**;
- che il ruolo di Moderatore e i Permessi restino coerenti fra loro.

Per questo **i Permessi non sono un aggregato né un'entità**: sono un **value object del Partecipante**. Non hanno identità, non hanno storia propria, non si consultano indipendentemente da chi li possiede. L'insieme vuoto di Permessi è la **Sola lettura** — condizione derivata, non quarto valore da assegnare — coerentemente con il linguaggio ubiquo che ha eliminato «Osservatore».

Altre precisazioni che fanno parte della composizione:

- **`DataOraDiInizio` è un value object opzionale.** La sua presenza o assenza è **l'unica** differenza fra un'Aula studio programmata e una estemporanea: nessun tipo diverso, nessuna gerarchia, nessun concetto nuovo per gli incontri che si ripetono, che restano più Aule studio.
- **L'`AulaStudio` non porta alcun value object di stato del ciclo di vita.** Non esiste un `StatoAulaStudio` con valori come «programmata», «in corso», «conclusa». L'Aula studio **resta consultabile senza transizioni**, e la data non apre né chiude nulla. È l'assenza più significativa dell'intero modello, ed è deliberata: uno stato del genere sarebbe stato la porta d'ingresso per il termine «Sessione», già eliminato dal linguaggio ubiquo.
- **`CollocazioneNelGruppo` è un value object opzionale** che riferisce il solo `GruppoId`. L'Aula studio esiste **sia autonoma sia collocata in un Gruppo**, ed è la stessa Aula studio nei due casi: il core non ha due modelli. Il riferimento è per identità e non porta con sé nulla della comunità — coerentemente con l'anti-corruption layer che traduce il fatto di appartenenza senza importare il concetto di Membro.
- **`Visibilità`** ha gli stessi tre valori del Gruppo, ma è **un value object di questo contesto**, non condiviso: i due contesti modellano la Visibilità due volte, ed è la duplicazione già messa a bilancio. Quando vale Ateneo, l'Aula studio porta il proprio ateneo di riferimento.
- **L'Audiochat non introduce alcuna entità né alcun value object.** Il dominio possiede **soltanto il Permesso corrispondente**, dentro il value object `Permessi`. Non esiste un aggregato «Audiochat», non esiste uno stato del canale, non esiste un elenco di chi sta parlando: la capacità sta dietro una porta generic, e ciò che il dominio decide è chi ha il Permesso di Parlare. È la difesa concreta del core rispetto alla componente tecnica più incerta del progetto.

Il ruolo di Moderatore **è definito solo dentro l'Aula studio**: nessuna derivazione automatica dal ruolo ricoperto nel Gruppo, e infatti nel confine dell'`AulaStudio` non compare alcun elemento del modello di comunità.

#### `Argomento` — aggregato del core, non entità dell'Aula studio, non aggregato del Gruppo

L'`Argomento` è **un aggregato del contesto Aula studio**, e la doppia negazione va letta per intero perché entrambe le alternative erano plausibili:

- **non è entità interna all'`AulaStudio`** perché non c'è alcuna regola che l'Aula studio debba garantire sull'insieme dei propri Argomenti nello stesso istante: si aggiunge un Argomento, se ne riscrive il testo libero, se ne elimina uno, senza che nulla debba essere vero contemporaneamente su tutti gli altri. Tenerlo dentro farebbe contendere chi scrive materiale di studio con chi concede un Permesso o ammette un Partecipante;
- **non è aggregato del Gruppo** perché **il materiale di studio segue l'incontro anche quando l'Aula studio è autonoma**. Se l'Argomento appartenesse alla comunità, un'Aula studio non collocata non potrebbe averne — e la maggior parte delle Aule studio nasce autonoma.

L'Argomento **riferisce l'`AulaStudioId` per identità**, in modo obbligatorio: è un contenitore di materiale legato a un incontro preciso, e non migra altrove. I suoi value object sono `TitoloArgomento` e `TestoLibero`: un contenitore in cui si raccolgono Allegati e testo libero su un tema di studio, esattamente come lo definisce il linguaggio ubiquo. **Non ha appartenenti**: non è uno spazio.

#### `AllegatoDiAulaStudio` — aggregato autonomo con collocazione facoltativa

È l'**asimmetria deliberata con la Bacheca**, e merita di essere enunciata senza attenuazioni: **nel Post l'Allegato sta dentro il confine, nell'Aula studio sta fuori**. Stessa parola del linguaggio ubiquo, due composizioni diverse, perché diversi sono i cicli di vita — è precisamente ciò che la Context Map ha registrato scartando qualunque libreria di dominio condivisa fra i due contesti.

Le ragioni dell'autonomia:

- l'Allegato dell'Aula studio ha una **collocazione facoltativa in un Argomento**. Esistono legittimamente sia **allegati sciolti nell'Aula studio** sia **allegati raccolti in un Argomento**, e nessuno dei due casi è un ripiego dell'altro. **Non serve alcun Argomento di default**: l'assenza di collocazione è uno stato normale;
- lo **spostamento fra Argomenti è una scrittura sul solo Allegato**. Non tocca l'Argomento di partenza, non tocca quello di arrivo, non tocca l'Aula studio. Un Allegato contenuto in un Argomento renderebbe ogni spostamento una scrittura su due contenitori;
- l'eliminazione di un Argomento **non porta via i suoi Allegati**: tornano sciolti nell'Aula studio. Questa possibilità esiste solo perché l'Allegato vive fuori dal confine dell'Argomento — è l'esatto opposto del rapporto fra Post e Allegato del Post.

I riferimenti sono per identità: `AulaStudioId` obbligatorio, `ArgomentoId` facoltativo, `CaricatoDa` come `UtenteId`. Il `FileArchiviato` è **lo stesso concetto di value object** già descritto per la Bacheca — chiave di archiviazione, nome, tipo, dimensione — ma **modellato in questo contesto**, non importato: la parola è condivisa, la definizione è ripetuta per confine. `CaricatoDa` registra chi ha portato il materiale nell'incontro, e non è la stessa cosa del Partecipante: è un riferimento a un Utente, che resta valido anche se quel Partecipante lascia l'Aula studio.

Il **Permesso di Caricare non è un attributo dell'Allegato**: sta nei `Permessi` del Partecipante, dentro l'`AulaStudio`, e si verifica su quell'aggregato al momento del caricamento.

#### `Invito` (Aula studio) — stesso ruolo dell'`InvitoAlGruppo`, altro contesto

L'`Invito` è aggregato autonomo per le stesse ragioni dell'`InvitoAlGruppo`: **vive prima dell'ammissione che potrebbe produrre**, può essere rivolto a chi non è ancora Utente della piattaforma, e ha un proprio ciclo di vita che si conclude anche senza produrre alcun Partecipante. `Destinatario` e `StatoInvito` sono i suoi value object.

Due precisazioni di composizione, entrambe già implicite nel linguaggio ubiquo:

- l'`Invito` è **un aggregato distinto dall'`InvitoAlGruppo`**, non lo stesso modello riusato. Sono due contesti diversi, e il core non importa il modello del supporting;
- **l'Invito non determina la Visibilità.** Un'Aula studio Pubblica può emettere Inviti, e un'Aula studio Privata non è «l'Aula studio su invito»: è l'Aula studio con `Visibilità` uguale a Privato. I due concetti stanno in due aggregati diversi proprio perché sono due decisioni diverse. Che l'appartenenza al Gruppo ospitante costituisca a sua volta un titolo di ammissione è materia degli invarianti; qui rileva che **l'Invito non è l'unico ingresso**, e che quindi non poteva essere modellato come parte dell'`AulaStudio`.

#### `MessaggioDiChat (Aula studio)` — modellato di nuovo, non condiviso

Composizione identica a quella del Gruppo — `TestoMessaggio`, `IstanteDiInvio`, autore per identità, un aggregato per messaggio — ma **è un aggregato di questo contesto**. È la duplicazione dichiarata fra Gruppo e Aula studio: Chat testuale e Audiochat sono modellate due volte, una per contesto, come costo accettato per proteggere il core.

Anche qui **non esiste alcun aggregato «Chat»**: la Chat testuale è una funzionalità posseduta dall'Aula studio. Il messaggio non contiene alcun Permesso: **il Permesso di Scrivere sta nell'`AulaStudio`**, e si verifica lì.

---

### Riferimenti fra aggregati — quadro d'insieme

Nessun aggregato contiene un altro aggregato. Tutti i collegamenti sono per identità, e sono esattamente questi:

| Da | A (per sola identità) | Natura del riferimento |
| --- | --- | --- |
| `Profilo` ↔ `ImpostazioniDiPrivacy` | identità condivisa `UtenteId` | stesso Utente, due lifecycle |
| `Commento` | `PostId`, autore (`UtenteId`) | risposta a un Post |
| `Post`, `Membro`, `Partecipante`, `MessaggioDiChat`, `AllegatoDiAulaStudio` | `UtenteId` | autore, appartenente, ammesso, chi ha caricato |
| `Collocazione` (in `AlberoOrganizzativo`) | `AulaStudioId` | riferimento all'incontro, mai al suo modello |
| `AulaStudio` (`CollocazioneNelGruppo`) | `GruppoId` | zero o un Gruppo ospitante |
| `Argomento` | `AulaStudioId` | materiale legato all'incontro |
| `AllegatoDiAulaStudio` | `AulaStudioId`, `ArgomentoId` (facoltativo) | materiale sciolto o raccolto |
| `InvitoAlGruppo` | `GruppoId`, `Destinatario` | chiamata a entrare nella comunità |
| `Invito` | `AulaStudioId`, `Destinatario` | chiamata a entrare nell'incontro |

Si noti la **doppia comparsa di `AulaStudioId` e `GruppoId` in versi opposti**: la `Collocazione` nell'Albero organizzativo del Gruppo e la `CollocazioneNelGruppo` dell'Aula studio sono **due riferimenti distinti su due contratti distinti**, non un legame bidirezionale dentro un unico modello. È la traduzione, a livello di aggregati, dei due contratti non sovrapposti della partnership.

### Cosa non è stato modellato, e perché va tenuto così

Le assenze seguenti sono decisioni, non dimenticanze, e ogni proposta futura di colmarle va trattata come una modifica del modello:

- **nessun aggregato `Chat testuale` e nessun aggregato `Audiochat`**: sono funzionalità possedute dagli spazi, mai luoghi;
- **nessuno stato di ciclo di vita sull'`AulaStudio`**: né value object né entità che dicano se un incontro è in corso;
- **nessun aggregato `Permesso`**: i Permessi sono un value object del Partecipante, concessi e revocati uno per uno;
- **nessun aggregato `Sola lettura`** e nessun ruolo omonimo: è l'insieme vuoto di Permessi;
- **nessun `Argomento` nel contesto Gruppo**, che organizza solo Cartelle e collocazioni;
- **nessun attributo di visibilità sul `Post`**, che dipende dalle Impostazioni di privacy dell'autore;
- **nessun aggregato di dominio nel contesto Accesso**, che non si modella affatto;
- **nessuna entità o value object condiviso fra Bacheca e Aula studio**, `FileArchiviato` incluso: stessa definizione, due contesti, nessun modello comune.

## Domain Invariants

Un'invariante è una condizione che l'aggregato **garantisce da sé, all'istante del commit, con i soli dati che possiede dentro il proprio confine**. Non è una regola importante, non è una regola scritta in maiuscolo: è una regola che l'aggregato può *rifiutarsi* di violare, perché tutto ciò che serve a verificarla sta dentro il confine tracciato nella sezione precedente.

Da questo criterio discende una distinzione che questa sezione tiene rigorosamente separata in due parti:

1. **Invarianti per aggregato** — enunciate in forma verificabile, cioè in modo che si possa dire senza discussione se una data scrittura le rispetta o no. Se una regola non è enunciabile così, non è un'invariante: è un'intenzione.
2. **Regole di business che non sono invarianti** — tutte quelle che coinvolgono **più aggregati**. Sono altrettanto vincolanti per il prodotto, ma sono **coerenza differita**, e per ciascuna la finestra di tolleranza è fissata qui come **scelta di business**, non come conseguenza tecnica.

La disciplina è stretta di proposito. Con una sola persona e un tempo di lavoro misurato in ore, ogni condizione dichiarata «da garantire sempre» che in realtà attraversa due aggregati è una promessa che il modello non può mantenere. È più onesto — e più economico — dichiarare la finestra di ritardo accettabile che fingere una garanzia che al commit non c'è.

Una nota ricorrente, perché è il pattern più frequente in questo modello: diverse regole si verificano **su dato fresco al momento del comando** e **non** sono protette al commit. Il titolo a scrivere un messaggio, il Permesso di Caricare, l'appartenenza al Gruppo che ammette a un'Aula studio: tutte si leggono nell'istante in cui servono, e **ciò che è già stato fatto resta valido** se la condizione cambia dopo. Non è una debolezza tollerata: è la scelta esplicita di non riscrivere il passato quando cambia il presente.

---

### Invarianti per aggregato

#### `Profilo` (id `UtenteId`)

| # | Invariante |
| --- | --- |
| **P1** | Esiste **esattamente un** `Profilo` per `UtenteId`, creato al primo accesso autenticato con l'Onboarding non ancora completato. **Nessun Utente autenticato esiste senza Profilo** |
| **P2** | L'Onboarding risulta `Completato` **se e solo se** nome, cognome, `Università` e `CorsoUniversitario` sono valorizzati (non vuoti dopo trim) |
| **P3** | La transizione è **a senso unico**: da Completato non si torna indietro, e i quattro dati restano modificabili ma **mai svuotabili** |

**Perché queste tre e non altre.** P1 chiude la sola porta d'ingresso dell'identità nel dominio: l'anti-corruption layer verso Accesso converte l'account autenticato in Utente di dominio, e nel momento stesso in cui quella conversione avviene il `Profilo` esiste. Non esiste quindi un limbo in cui l'Utente è autenticato ma il dominio non sa chi sia — condizione che, se ammessa, costringerebbe ogni contesto a valle a gestire un caso «Utente senza Profilo» che nessuno saprebbe descrivere.

P2 è enunciata come **doppia implicazione** proprio perché sia verificabile: non «l'Onboarding si completa quando l'Utente compila i dati», ma una condizione che si può controllare guardando l'aggregato. Il `trim` non è un dettaglio: senza di esso uno spazio bianco basterebbe a dichiarare completato un Onboarding vuoto, e la prova di completamento richiesta altrove (B6, IA2) perderebbe ogni valore.

P3 protegge il resto del modello **a valle**. Se l'Onboarding potesse tornare incompleto, ogni aggregato che ha già ricevuto la prova di completamento — un Post pubblicato, un Invito accettato — si troverebbe fondato su una condizione svanita, senza alcun modo di reagire. La irreversibilità evita di dover modellare quella reazione. I quattro dati restano correggibili, perché un cognome sbagliato si corregge, ma non svuotabili, perché svuotarli sarebbe la stessa cosa che tornare indietro.

#### `ImpostazioniDiPrivacy` (id `UtenteId`)

| # | Invariante |
| --- | --- |
| **IP1** | Esiste **esattamente un'istanza** per `UtenteId`, creata **contestualmente al `Profilo`** con i valori di default: nessun Utente esiste privo di regole di privacy, **nemmeno con Onboarding incompleto** |
| **IP2** | **Entrambe** le regole sono sempre valorizzate con un valore ammesso: **non esiste lo stato «non impostato»** |
| **IP3** | I due assi sono **indipendenti**: nessun vincolo di coerenza reciproca, uno può essere più aperto dell'altro |
| **IP4** | Lo scostamento dal default è **sempre esplicito e voluto dall'Utente**: nessun'altra operazione di dominio (pubblicazione di un Post, creazione di un Gruppo, ingresso in un'Aula studio) modifica le Impostazioni di privacy come effetto collaterale |

**IP1 e IP2 insieme eliminano l'assenza di decisione.** La Context Map stabilisce che le domande di autorizzazione — chi può contattare l'Utente, chi può vedere i suoi contenuti — sono interrogazioni sincrone risolte da Profilo nel momento in cui servono. Una domanda sincrona deve avere sempre una risposta: se esistesse lo stato «non impostato», ogni consumatore dovrebbe decidere per conto proprio come comportarsi in quel caso, e la decisione di privacy si frammenterebbe in tre contesti diversi. Creare le Impostazioni **contestualmente al Profilo**, e non al completamento dell'Onboarding, chiude anche la finestra intermedia: un Utente registrato ma non ancora identificato ha comunque regole di privacy applicabili.

**IP3 è un'invariante negativa deliberata.** Il linguaggio ubiquo vieta di riassumere la privacy in un aggettivo unico, e questo aggregato ne è la traduzione: i due assi non si vincolano a vicenda. Un Utente può accettare di essere contattato da chiunque e mostrare i propri contenuti solo al proprio ateneo, o l'esatto contrario, e **nessuna di queste combinazioni è un errore da correggere**. Introdurre una regola di coerenza fra i due assi significherebbe reintrodurre di fatto il «livello di privacy» che il modello ha rifiutato.

**IP4 è la garanzia più importante per la fiducia dell'Utente.** Nessuna azione compiuta altrove nel dominio tocca queste due regole: pubblicare un Post non allarga la visibilità dei contenuti, entrare in un'Aula studio Pubblica non rende contattabili da chiunque, creare un Gruppo non cambia nulla. È anche il motivo per cui questo aggregato **non emette eventi**: se nessuno lo modifica se non l'Utente stesso, non c'è nulla da propagare.

#### `Post`

| # | Invariante |
| --- | --- |
| **B1** | `TestoDelPost` non vuoto dopo trim, **massimo 5.000 caratteri** |
| **B2** | L'autore (`UtenteId`) è **obbligatorio e immutabile** per tutta la vita del Post |
| **B3** | Ogni `Allegato` ha un `FileArchiviato` **completo**: chiave di archiviazione non vuota, nome non vuoto, tipo ∈ {PDF, immagine, file testuale}, dimensione **> 0 e ≤ 25 MB** |
| **B4** | **Non esiste Allegato senza Post**: rimozione dell'Allegato ed eliminazione del Post con i suoi Allegati avvengono **nella stessa transazione** |
| **B5** | *Invariante negativa*: il Post **non possiede** alcun attributo di visibilità; chi lo vede discende dalle Impostazioni di privacy dell'autore **al momento della lettura** |
| **B6** | Un Post **non è costruibile** senza la prova che l'autore ha l'Onboarding completato: la prova è **un valore passato al costruttore**, e senza di essa l'aggregato non esiste |

**B4 è l'invariante che giustifica la composizione dell'aggregato.** L'`Allegato` è entità interna al Post proprio perché questa garanzia va data al commit: un Allegato orfano non deve poter esistere neppure per un istante. È l'unico punto del modello in cui un file e il contenuto che lo porta condividono la transazione, ed è possibile solo perché condividono il confine.

**B6 merita la formulazione più precisa di tutta la sezione.** L'esistenza di un Onboarding completato è un fatto che vive in un altro contesto: la Bacheca non può interrogarlo al commit e non può garantirlo. Ciò che **può** garantire è di **non essere costruibile senza la prova**. La prova è un valore che entra nel costruttore, cioè un dato che l'aggregato possiede nel momento in cui nasce; senza quel valore non c'è Post, non c'è oggetto malformato da correggere, non c'è stato intermedio. È il modo in cui una condizione inter-contesto diventa un'invariante locale: **non verificando il fatto altrove, ma esigendo che la prova sia presente qui**.

**B5 è dichiarata fra le invarianti benché sia un'assenza**, perché è precisamente ciò che qualcuno tenterà di aggiungere. Un attributo di visibilità sul Post sarebbe una copia locale di una decisione che appartiene a Profilo, e produrrebbe due risposte possibili alla stessa domanda. La visibilità si risolve **al momento della lettura**, interrogando Profilo: è più costoso, ed è l'unico modo perché una modifica delle Impostazioni di privacy abbia effetto immediato su tutto ciò che l'Utente ha già pubblicato.

B1 e B3 sono limiti numerici, e in quanto tali sono verificabili senza margine di interpretazione. I 25 MB e i tre tipi ammessi valgono **anche** per l'`AllegatoDiAulaStudio` (AL1): stessa regola enunciata due volte, in due contesti, senza alcuna definizione condivisa — coerentemente con il separate ways fra Bacheca e Aula studio.

#### `Commento`

| # | Invariante |
| --- | --- |
| **C1** | `TestoDelCommento` non vuoto, **massimo 2.000 caratteri** |
| **C2** | `PostId` e autore **obbligatori e immutabili** |
| **C3** | Il Commento **non** garantisce l'esistenza del Post: l'esistenza è verificata **al comando**, non protetta al commit |

**C3 è la conseguenza esplicita dell'aver reso il Commento un aggregato autonomo.** Il Commento riferisce il `PostId` per identità, e un riferimento per identità non è un vincolo di esistenza: nell'istante in cui si scrive il Commento, il Post potrebbe essere stato appena eliminato. Il modello **non finge** di poterlo impedire. Verifica l'esistenza quando riceve il comando — su lettura fresca — e accetta che una finestra sottilissima resti aperta, chiusa poi dalla coerenza differita E3.

L'alternativa sarebbe stata contenere i Commenti dentro il Post, ottenendo la garanzia al prezzo di far competere tutti gli autori sulla stessa scrittura. Per un supporting portato alla parità funzionale, è un prezzo che non si paga.

#### `Gruppo`

| # | Invariante |
| --- | --- |
| **G1** | `NomeDelGruppo` non vuoto |
| **G2** | Esiste **sempre almeno un Membro con ruolo Moderatore**: l'ultimo Moderatore **non può essere rimosso né retrocesso**; per uscire deve prima **promuovere** qualcun altro |
| **G3** | Un `UtenteId` compare **al massimo una volta** fra i Membri, il che rende **idempotente** l'accettazione di un Invito duplicato |
| **G4** | Chi crea il Gruppo ne è **Membro Moderatore fin dalla creazione** |
| **G5** | La `Visibilità` è **sempre valorizzata**; se ristretta all'ateneo, il Gruppo porta **l'ateneo di riferimento**, precompilato dall'`Università` del creatore alla creazione e **da lì immutabile** |

**G2 e G4 sono la stessa preoccupazione in due momenti.** G4 garantisce che il Gruppo nasca già governabile — non esiste l'istante in cui un Gruppo esiste senza nessuno che possa invitare, rimuovere, promuovere; G2 garantisce che non lo diventi mai in seguito. Insieme rendono impossibile il Gruppo abbandonato che nessuno può più amministrare, e lo fanno **senza introdurre alcun ruolo di sistema**: la via d'uscita per l'ultimo Moderatore è un verbo che il dominio già possiede, **promuovere**.

Entrambe sono affermazioni **sull'insieme dei Membri**, e questo è esattamente il motivo per cui il `Membro` è entità interna al `Gruppo`: nessun Membro isolato può sapere se è l'ultimo Moderatore.

**G3 è un'invariante di unicità con un effetto collaterale prezioso.** Poiché un `UtenteId` compare al massimo una volta, l'aggiunta ripetuta dello stesso Membro **non è un errore da gestire: è un'operazione senza effetto**. È ciò che rende innocua la doppia consegna dell'accettazione di un Invito nella coerenza differita E5, senza che nessun contesto debba tenere traccia di ciò che ha già elaborato.

**G5 separa due cose che si confondono facilmente.** L'ateneo di riferimento è **un dato dello spazio**, congelato alla creazione dall'`Università` del creatore; l'`Università` di chi chiede di accedere è **un dato del Profilo**, letto fresco. Se l'ateneo dello spazio seguisse i cambiamenti del Profilo del creatore, un Gruppo cambierebbe pubblico perché una persona ha cambiato ateneo — effetto che nessuno si aspetta. Congelarlo è la scelta prevedibile.

#### `AlberoOrganizzativo`

| # | Invariante |
| --- | --- |
| **A1** | **Esattamente un Albero per Gruppo**, con una **Cartella radice sempre presente** |
| **A2** | **Nessun ciclo**: una Cartella non può essere discendente di sé stessa |
| **A3** | Profondità **massima di 5 livelli** sotto la radice |
| **A4** | Nome di Cartella non vuoto e **unico fra le Cartelle sorelle** |
| **A5** | Una `Collocazione` riferisce **solo `AulaStudioId`**, e la stessa `AulaStudioId` compare **al massimo una volta nell'intero Albero** |
| **A6** | L'eliminazione di una Cartella **non elimina Aule studio**: le Collocazioni contenute **risalgono alla Cartella genitore** |

A2, A3 e A4 sono **invarianti di forma**: riguardano la struttura dell'albero e sono verificabili guardando il solo aggregato. Sono la ragione per cui l'`AlberoOrganizzativo` è separato dal `Gruppo` — nessuna di esse ha a che vedere con l'appartenenza — e per cui la `Cartella` è entità interna: la profondità e l'assenza di cicli sono proprietà dell'intera struttura, non della singola Cartella.

Il limite di **5 livelli** è un numero arbitrario, e va detto: serve a rendere la regola verificabile e a impedire strutture che nessuno saprebbe più percorrere. Un limite arbitrario ma dichiarato è preferibile a un limite implicito che emerge quando è troppo tardi.

**A5 è la traduzione, al livello dell'aggregato, del contratto d'indice della partnership.** La `Collocazione` riferisce **solo** l'identità dell'Aula studio: nessun Partecipante, nessun Permesso, nessuna Audiochat, nessun titolo di ammissione entra nell'Albero. L'unicità nell'intero Albero — non solo fra Cartelle sorelle — dice che un'Aula studio sta **in un punto solo** dell'organizzazione del Gruppo, coerentemente con AS9 che dal lato del core dice che la collocazione è al più una.

**A6 è l'invariante che impedisce alla comodità organizzativa di distruggere il core.** Riordinare le Cartelle è un gesto leggero, di organizzazione interna; eliminare Aule studio con i loro Argomenti, Allegati e messaggi è tutt'altro. Facendo risalire le Collocazioni alla Cartella genitore, l'operazione resta reversibile a mano e non produce alcuna perdita. L'Albero organizza **riferimenti**, e cancellare un riferimento non cancella mai la cosa riferita.

#### `InvitoAlGruppo`

| # | Invariante |
| --- | --- |
| **IG1** | `Destinatario` e `GruppoId` **obbligatori e immutabili** |
| **IG2** | **Solo dallo stato iniziale** di Invito emesso si transita; gli stati conclusivi sono **terminali e immutabili** |
| **IG3** | L'accettazione **non** crea il Membro nella stessa transazione |

**IG1 impedisce il riuso dell'Invito.** Un Invito emesso verso un destinatario per un Gruppo resta quello: non si redireziona verso un'altra persona, non si converte in un invito a un altro Gruppo. Se serve invitare qualcun altro, si emette un altro Invito. L'immutabilità rende ogni Invito un fatto tracciabile e non un contenitore riscrivibile.

**IG2 rende il ciclo di vita un percorso a senso unico con stati terminali.** Un Invito accettato non torna in attesa, un Invito concluso non si riapre. La conseguenza pratica è che **una seconda accettazione dello stesso Invito non ha effetto**: l'aggregato è già in uno stato terminale e rifiuta la transizione. Insieme a G3, è la seconda difesa contro la doppia consegna.

**IG3 è una non-garanzia enunciata come invariante**, e la formulazione è deliberata. Invito e Gruppo sono due aggregati distinti, quindi la creazione del Membro **non può** avvenire nella stessa scrittura dell'accettazione. Dichiararlo qui evita che qualcuno lo dia per scontato: fra l'accettazione e l'esistenza del Membro c'è una finestra, ed è la più stretta del sistema (E5) proprio perché in quell'intervallo c'è una persona che aspetta.

#### `MessaggioDiChat` (Gruppo)

| # | Invariante |
| --- | --- |
| **MG1** | Testo non vuoto, `IstanteDiInvio` e autore valorizzati; **una volta inviato il messaggio è immutabile** |
| **MG2** | Il messaggio **non ricontrolla l'appartenenza**: il titolo a scrivere è verificato **sul `Gruppo`, su dato fresco, al momento dell'invio**, e un messaggio già inviato **resta valido se l'autore esce dal Gruppo** |

**MG1 rende il messaggio un fatto, non un documento.** L'immutabilità è ciò che consente all'aggregato di essere minuscolo: nulla da riconciliare, nulla da bloccare, nessuna contesa fra chi scrive contemporaneamente.

**MG2 enuncia il pattern generale delle verifiche su dato fresco**, qui applicato per la prima volta. La regola «solo i Membri scrivono nella Chat testuale del Gruppo» è **vera e vincolante**, ma non è un'invariante del messaggio: il messaggio non contiene l'elenco dei Membri e non potrebbe verificarla. Si verifica sul `Gruppo` nell'istante dell'invio, leggendo il dato aggiornato.

La seconda metà è altrettanto importante: **la conversazione non si riscrive**. Chi esce da un Gruppo non fa sparire ciò che ha scritto quando ne faceva parte. Una regola diversa richiederebbe di rivedere ogni messaggio a ogni uscita, per una comunità in cui le uscite sono normali.

#### `AulaStudio`

| # | Invariante |
| --- | --- |
| **AS1** | `TitoloAulaStudio` non vuoto |
| **AS2** | Esiste **sempre almeno un Partecipante Moderatore**; il creatore è Moderatore; **l'ultimo non si rimuove né si retrocede** |
| **AS3** | Un `UtenteId` compare **al massimo una volta** fra i Partecipanti |
| **AS4** | Ogni Partecipante ha **Permessi ben formati**: sottoinsieme di {Parlare, Scrivere, Caricare}, concessi e revocati **uno per uno**; **l'insieme vuoto è la Sola lettura ed è uno stato legittimo, non un errore** |
| **AS5** | Un Moderatore ha **sempre i tre Permessi**: la promozione li concede e **non sono revocabili finché il ruolo dura** |
| **AS6** | Ruoli e Permessi sono definiti **solo all'interno dell'Aula studio**: **nessuna derivazione automatica** dal ruolo ricoperto nel Gruppo |
| **AS7** | La `Visibilità` è sempre valorizzata; se ristretta all'ateneo, l'Aula studio porta l'ateneo **precompilato dall'`Università` del creatore alla creazione e poi congelato**. L'appartenenza dell'aspirante Partecipante a quell'ateneo si valuta invece **sempre su dato fresco del Profilo** |
| **AS8** | `DataOraDiInizio` è **opzionale**; se presente, **alla creazione deve essere futura**. **Nessuno stato di ciclo di vita**: l'Aula studio resta consultabile e la data **non apre né chiude nulla** |
| **AS9** | La `CollocazioneNelGruppo` è **al più una**: zero o un Gruppo, **mai due** |

È l'aggregato del core, e ha il corredo di invarianti più fitto del modello. Vale la pena leggerle a gruppi.

**AS2 e AS3 riproducono per l'incontro ciò che G2–G4 fanno per la comunità**, e per la stessa ragione strutturale: sono affermazioni sull'**insieme** dei Partecipanti, e solo un aggregato che li vede tutti insieme può verificarle. La simmetria con il Gruppo è apparente e non implica alcuna condivisione: sono due modelli distinti che arrivano a due regole analoghe, come già messo a bilancio.

**AS4 è il cuore della differenziazione delle facoltà di intervento**, ed è la ragione per cui l'Aula studio è core. Tre affermazioni in una:

- i Permessi sono **esattamente tre**, un sottoinsieme di {Parlare, Scrivere, Caricare}. Nessun quarto valore, nessun grado, nessun livello;
- si concedono e si revocano **uno per uno**. Non esiste il gesto «dai tutti i permessi» come operazione di dominio: il Moderatore concede Parlare, oppure concede Scrivere, oppure concede Caricare. È ciò che rende la moderazione fine invece che grossolana, ed è la differenza osservabile rispetto agli strumenti generalisti dove il ripasso avviene oggi;
- **l'insieme vuoto è uno stato legittimo**. Chi non ha alcun Permesso è in **Sola lettura**: assiste senza interagire, ed è una condizione normale dell'incontro, non un difetto da correggere né un ruolo separato. L'invariante lo dichiara esplicitamente perché è il punto in cui qualcuno sarebbe tentato di introdurre «Osservatore», termine già eliminato dal linguaggio ubiquo.

**AS5 lega il ruolo alle facoltà, in un solo verso.** Chi modera un incontro deve poter parlare, scrivere e caricare: promuovere concede i tre Permessi, e finché il ruolo dura non sono revocabili. Non vale il contrario: **avere i tre Permessi non fa Moderatore**. Un Partecipante con tutti e tre i Permessi resta un Partecipante, e non può invitare, rimuovere né promuovere. Il ruolo è più dei Permessi che porta con sé.

**AS6 è l'invariante che protegge il core dal contesto vicino**, ed è la traduzione operativa dell'anti-corruption layer sul contratto di appartenenza. Essere Moderatore di un Gruppo **non produce alcun Permesso** dentro un'Aula studio collocata in quel Gruppo, e non produce il ruolo di Moderatore dell'incontro. L'appartenenza al Gruppo è un **titolo di ammissione** (IA4) e nulla di più: fa entrare, non fa moderare, e chi entra per quella via entra come qualunque altro Partecipante. Se questa derivazione fosse ammessa, il core dovrebbe conoscere il modello di ruoli del Gruppo, ed è esattamente ciò che i due contratti distinti servono a evitare.

**AS7 ripete per l'incontro la distinzione già vista in G5, e la esplicita meglio.** Due dati che si assomigliano e non lo sono:

| Dato | Dove vive | Come si comporta |
| --- | --- | --- |
| Ateneo di riferimento dell'Aula studio | value object dell'`AulaStudio` | precompilato dall'`Università` del creatore, **congelato** alla creazione |
| `Università` dell'aspirante Partecipante | `Profilo`, altro contesto | letto **fresco** a ogni valutazione di ammissione |

È una scelta di prevedibilità: lo spazio non cambia pubblico perché il suo creatore ha cambiato ateneo, ma la persona che chiede di entrare viene valutata per quello che è **adesso**. La copia locale del riferimento anagrafico non è sufficiente qui: la Visibilità Ateneo si decide su dato fresco.

**AS8 è l'assenza più difesa dell'intero modello.** `DataOraDiInizio` è opzionale, e la sua presenza o assenza è **l'unica** differenza fra un'Aula studio programmata e una estemporanea. Il vincolo di futurità vale **alla creazione** — non si programma un incontro nel passato — e non oltre: una data che diventa passata non rende l'Aula studio invalida, perché **la data non apre né chiude nulla**.

Soprattutto: **nessuno stato di ciclo di vita**. Non esiste «programmata», «in corso», «conclusa». L'Aula studio resta consultabile, con i suoi Argomenti e i suoi Allegati, prima e dopo l'incontro. È deliberato per due ragioni: uno stato del genere sarebbe la porta d'ingresso del termine «Sessione», già eliminato; e sarebbe un attributo che qualcuno dovrebbe far transitare, introducendo un intero meccanismo temporale che il dominio non ha chiesto. Il materiale di studio sopravvive all'incontro **perché non c'è nulla che lo chiuda**.

**AS9 chiude il verso del core sulla partnership.** Zero o un Gruppo, mai due. Insieme ad A5, che dal lato del Gruppo impone l'unicità della Collocazione nell'Albero, forma la coppia di regole che tiene coerenti i due riferimenti su contratti distinti — ciascuna verificabile nel proprio aggregato, senza che nessuno dei due contesti debba leggere l'altro al commit.

#### `Argomento`

| # | Invariante |
| --- | --- |
| **AR1** | `TitoloArgomento` non vuoto; **`AulaStudioId` obbligatorio e immutabile**: un Argomento **non migra** ad altra Aula studio |
| **AR2** | `TestoLibero` facoltativo, **massimo 20.000 caratteri** |

**AR1 fissa il legame che giustifica l'esistenza dell'aggregato.** L'Argomento è un contenitore di materiale legato a **un** incontro preciso: nasce lì e resta lì. L'immutabilità del legame è ciò che rende sicura AL3 — se un Argomento potesse migrare, gli Allegati che vi sono raccolti si troverebbero collocati in un Argomento di un'altra Aula studio, e la condizione di appartenenza andrebbe rivalutata su tutti.

Ciò che si sposta, nel modello, è l'**Allegato fra Argomenti**, non l'Argomento fra Aule studio. Il testo libero ampio (20.000 caratteri) riflette la natura del concetto: è il posto dove si scrive di un tema di studio, non un'etichetta.

#### `AllegatoDiAulaStudio`

| # | Invariante |
| --- | --- |
| **AL1** | `FileArchiviato` completo e valido, **con le stesse regole di B3** |
| **AL2** | `AulaStudioId` **obbligatorio e immutabile**; l'Utente che ha caricato (`CaricatoDa`) è **immutabile** |
| **AL3** | `ArgomentoId` **facoltativo**; se valorizzato, l'Argomento deve appartenere **alla stessa Aula studio** — condizione verificata **al comando**, **non** garantita al commit |
| **AL4** | Il Permesso `Caricare` è verificato **sull'`AulaStudio`, su dato fresco, al momento del caricamento**; l'Allegato già caricato **resta valido** se il Permesso viene revocato in seguito |

**AL1 rinvia esplicitamente a B3 senza condividerne la definizione.** Chiave non vuota, nome non vuoto, tipo ∈ {PDF, immagine, file testuale}, dimensione > 0 e ≤ 25 MB: le stesse regole, enunciate due volte in due contesti che stanno in separate ways. Se un giorno il limite cambiasse per gli Allegati dell'Aula studio e non per quelli del Post, i due enunciati divergerebbero **senza rompere nulla** — ed è esattamente il grado di indipendenza voluto.

**AL2 rende il legame con l'incontro definitivo e la paternità del caricamento un fatto storico.** `CaricatoDa` è immutabile e resta valido anche quando quel Partecipante lascia l'Aula studio: registra chi ha portato il materiale, non chi è presente adesso.

**AL3 è una non-garanzia dichiarata, come C3.** La collocazione in un Argomento è facoltativa — l'assenza di collocazione è uno stato normale, non un ripiego, e **non serve alcun Argomento di default**. Quando la collocazione c'è, la condizione «stessa Aula studio» si verifica al comando su lettura fresca; al commit l'Allegato non può garantirla, perché l'Argomento sta fuori dal suo confine. La finestra residua è chiusa da E4, che riporta gli Allegati allo stato sciolto quando l'Argomento sparisce.

**AL4 applica il pattern del dato fresco al Permesso di Caricare.** Il Permesso vive nei `Permessi` del Partecipante, dentro l'`AulaStudio`: si legge lì, nell'istante del caricamento. E ciò che è già stato caricato **resta**: revocare il Permesso di Caricare impedisce nuovi caricamenti, non cancella il materiale già condiviso. È la stessa logica di MG2 e MA2 — **si governa il presente, non si riscrive il passato** — e ha una conseguenza pratica che il dominio accetta: il materiale portato da chi è poi stato limitato resta a disposizione di chi studia.

#### `Invito` (Aula studio)

| # | Invariante |
| --- | --- |
| **IA1** | Stati e transizioni **come IG1–IG2**: destinatario e Aula studio immutabili, **unico passaggio** dallo stato iniziale, stati conclusivi **terminali** |
| **IA2** | L'Invito è **accettabile solo esibendo la prova di un Profilo con Onboarding completato**. Un Invito rivolto a un indirizzo **non ancora associato a un Utente resta legittimamente in attesa** |
| **IA3** | L'accettazione **non** crea il Partecipante nella stessa transazione |
| **IA4** | L'Invito **non è l'unico titolo di ammissione**: essere Membro del Gruppo che ospita l'Aula studio è **titolo sufficiente e non richiede Invito**, valutato **su dato fresco all'ingresso** |

**IA1 replica il ciclo di vita dell'`InvitoAlGruppo` in un altro contesto**, senza riusarne il modello: due aggregati distinti che si comportano allo stesso modo, coerentemente con la scelta di non condividere modello fra Gruppo e Aula studio.

**IA2 è la stessa tecnica di B6: la prova come valore esibito, non come fatto verificato altrove.** L'aggregato non interroga Profilo al commit; esige che la prova gli venga presentata, e senza di essa la transizione non avviene. La seconda metà dell'invariante è la parte che riguarda l'esperienza reale: **un Invito rivolto a chi non è ancora Utente resta legittimamente in attesa**. Non è un errore, non è uno stato degenere. È il caso normale — si invita un amico che non ha ancora un account — e l'Invito lo aspetta finché la finestra di validità lo consente. Chi arriva si registra, completa l'Onboarding, e a quel punto ha la prova che serve.

**IA4 è l'invariante che rende l'Aula studio uno spazio della comunità senza importarne il modello.** Ci sono due titoli di ammissione: l'Invito accettato **oppure** l'essere Membro del Gruppo che ospita l'Aula studio. Il secondo è **sufficiente e non richiede Invito**, e si valuta **su dato fresco all'ingresso**, interrogando il contratto di appartenenza nel momento in cui qualcuno chiede di entrare.

È un'asimmetria di cui vale la pena essere consapevoli, e che ha una motivazione precisa. L'**ammissione** si risolve benissimo con una lettura fresca: chi chiede di entrare sta chiedendo *adesso*, e la domanda ha una risposta immediata. L'**espulsione** no: chi ha perso l'appartenenza mentre è già dentro un incontro non farà alcuna nuova richiesta, e nessuna interrogazione può raggiungerlo. Per questo il verso dell'uscita è coerenza differita con la finestra più stretta possibile (E2), mentre il verso dell'ingresso non ha bisogno di alcuna propagazione.

Si noti infine che **l'Invito non determina la Visibilità**: un'Aula studio Pubblica emette Inviti come qualunque altra, e un'Aula studio Privata non è «l'Aula studio su invito» ma quella con `Visibilità` uguale a Privato. Sono due decisioni in due aggregati diversi.

#### `MessaggioDiChat` (Aula studio)

| # | Invariante |
| --- | --- |
| **MA1** | Testo non vuoto, autore e `IstanteDiInvio` valorizzati; **immutabile dopo l'invio** |
| **MA2** | Il Permesso `Scrivere` è verificato **sull'`AulaStudio`, su dato fresco, all'invio**; **la revoca successiva non invalida i messaggi già scritti** |

Stessa forma di MG1–MG2, con una differenza sostanziale: nel Gruppo si verifica **l'appartenenza**, nell'Aula studio si verifica **il Permesso di Scrivere**. Non sono la stessa condizione: un Partecipante ammesso all'incontro può essere in Sola lettura, e in quel caso è dentro ma non scrive. È la differenziazione delle facoltà di intervento applicata alla Chat testuale.

MA2 completa la terna del pattern «dato fresco al comando, passato immutabile» — MG2 per il titolo a scrivere nel Gruppo, AL4 per il Permesso di Caricare, MA2 per il Permesso di Scrivere. Revocare il Permesso di Scrivere **zittisce da quel momento**, non cancella la conversazione.

---

### Regole di business che non sono invarianti — coerenza differita

Le regole seguenti sono **vincolanti per il prodotto** ma **non garantite al commit**, perché coinvolgono più aggregati. Per ciascuna la finestra di tolleranza è **una scelta di business fissata qui**, non un effetto collaterale della realizzazione: dice quanto a lungo il sistema può restare temporaneamente incoerente **senza che nessuno se ne accorga in modo dannoso**.

| # | Regola | Finestra di tolleranza |
| --- | --- | --- |
| **E1** | Il nome dell'Utente aggiornato nel `Profilo` si riflette su Post, Commenti, elenchi di Membri e di Partecipanti | **pochi minuti** |
| **E2** | Chi perde l'appartenenza al Gruppo perde l'ammissione alle Aule studio collocate: al prossimo ingresso il diniego è immediato su lettura fresca; **se è già dentro un incontro in corso viene allontanato** | **pochi secondi** |
| **E3** | Eliminato un Post, i suoi Commenti vengono eliminati | **pochi minuti** |
| **E4** | Eliminato un Argomento, i suoi Allegati **tornano sciolti nell'Aula studio e non vengono cancellati** | **pochi minuti** |
| **E5** | Invito accettato, quindi creazione del Membro o del Partecipante | **pochi secondi** — il ritardo più stretto del sistema |
| **E6** | Eliminata un'Aula studio, la sua `Collocazione` sparisce dall'`AlberoOrganizzativo` del Gruppo | **pochi minuti** |

#### Lettura delle finestre

Le finestre si dividono in due sole classi, e la divisione non è casuale.

**Pochi minuti — nessuno sta aspettando.** E1, E3, E4 ed E6 riguardano situazioni in cui l'incoerenza temporanea è invisibile o innocua: un nome vecchio in un elenco, un Commento sotto un Post che non c'è più, un Allegato ancora associato a un Argomento eliminato, una Collocazione che punta a un'Aula studio sparita. Nessuno subisce un danno nel frattempo, e nessuno resta bloccato in attesa.

E1 in particolare è la contropartita esplicita della scelta di propagare il riferimento anagrafico invece di interrogarlo: le copie locali in Bacheca, Gruppo e Aula studio esistono perché mostrare chi ha scritto è un'operazione frequentissima, e pagare qualche minuto di nome vecchio è ampiamente preferibile. Si noti il contrasto voluto con la **Visibilità Ateneo**, che invece si valuta sempre su dato fresco (AS7, G5): dato anagrafico propagato, decisione di autorizzazione interrogata.

E4 merita una lettura attenta, perché è **l'unica regola di questa tabella che non elimina nulla**. L'eliminazione di un Argomento fa tornare i suoi Allegati **sciolti nell'Aula studio**: il materiale di studio non si perde mai per un gesto di riorganizzazione. È possibile solo perché l'`AllegatoDiAulaStudio` è aggregato autonomo, ed è l'esatto contrario del rapporto Post–Allegato, dove B4 impone la cancellazione nella stessa transazione. La stessa filosofia di A6: **riorganizzare non distrugge**.

**Pochi secondi — c'è qualcuno che aspetta, o qualcuno che non dovrebbe essere lì.** E2 ed E5 sono le due finestre strette, per due motivi opposti.

**E5 è il ritardo più stretto del sistema perché l'Utente è in attesa**: ha appena accettato un Invito e sta guardando lo schermo. Fra l'accettazione (IG2, IA1) e l'esistenza del Membro o del Partecipante (G3, AS3) c'è necessariamente uno scarto — IG3 e IA3 lo dichiarano come invarianti — e quello scarto è tutto ciò che separa l'Utente dallo spazio in cui vuole entrare. È anche il punto in cui **l'idempotenza già garantita conta di più**: se l'accettazione venisse elaborata due volte, G3 e AS3 rendono la seconda priva di effetto, senza che nessuno debba tenere traccia di ciò che è già avvenuto.

**E2 ha una struttura doppia** che è utile enunciare per intero, perché è l'unico caso in cui una stessa regola si risolve in due modi diversi:

- **all'ingresso**: il diniego è **immediato**, perché IA4 valuta l'appartenenza su dato fresco. Non c'è finestra: chi non è più Membro non entra, punto;
- **a incontro in corso**: chi è già dentro **viene allontanato entro pochi secondi**. Qui la lettura fresca non serve a nulla, perché nessuna nuova richiesta verrà mai fatta: la persona è già dentro, sta ascoltando l'Audiochat e leggendo la Chat testuale. L'unico modo per raggiungerla è che l'informazione **le venga incontro**.

È la ragione dell'asimmetria dichiarata nella partnership: l'ammissione per appartenenza si risolve con un'interrogazione, l'espulsione richiede una propagazione. E i pochi secondi sono la finestra scelta perché è il tempo entro cui l'allontanamento è ancora percepito come conseguenza della rimozione, e non come un evento inspiegabile.

#### Eliminazione dell'Aula studio — regola confermata, natura riclassificata

Un'**Aula studio si elimina solo se non contiene Allegati né messaggi di Chat testuale**.

La regola **resta vincolante come regola di business**: protegge esattamente il bisogno che il dominio esiste per servire — che il materiale di studio non sparisca per un gesto affrettato — ed è coerente con A6 ed E4, che entrambi rifiutano la distruzione come effetto collaterale di un'operazione di organizzazione.

Ma **non è un'invariante dell'aggregato `AulaStudio`**, e la riclassificazione è la conseguenza onesta della composizione già decisa: `AllegatoDiAulaStudio` e `MessaggioDiChat` sono **aggregati autonomi**, fuori dal confine dell'`AulaStudio`. L'aggregato non li possiede, non li conta, non può garantirne l'assenza al commit. Dichiararla invariante sarebbe una promessa che il modello non può mantenere.

Quindi:

- la condizione è **verificata al comando, su lettura fresca**: nel momento in cui si chiede l'eliminazione, si guarda se ci sono Allegati o messaggi;
- resta una **finestra di rischio residua**, sottilissima e dichiarata: un Allegato caricato nello stesso istante in cui l'eliminazione viene comandata;
- quella finestra è chiusa da una **riconciliazione che rimuove gli elementi orfani entro pochi minuti**.

È il metodo applicato con coerenza in tutta questa sezione: **si dichiara ciò che l'aggregato garantisce, si verifica al comando ciò che non può garantire, si dichiara la finestra residua e si dice come viene chiusa.** Nessuna delle tre cose viene taciuta.

---

### Il quadro in una lettura

Tre schemi ricorrono, e riconoscerli aiuta a valutare qualunque regola nuova che verrà proposta in futuro:

1. **Affermazioni sull'insieme → entità interna.** Le regole che parlano di *tutti* i Membri o di *tutti* i Partecipanti (G2, G3, AS2, AS3, AS4, AS5) sono garantibili solo perché Membro e Partecipante stanno dentro il confine. È la prova, a posteriori, che la composizione degli aggregati è corretta: ogni entità interna è lì per un'invariante che senza di lei sarebbe indimostrabile.
2. **La prova esibita al posto del fatto verificato.** B6 e IA2 trasformano una condizione che vive in un altro contesto in un'invariante locale: non interrogando altrove al commit, ma **esigendo che la prova sia presente nel momento della costruzione o della transizione**. È il modo in cui un confine si rispetta senza rinunciare alla garanzia.
3. **Dato fresco al comando, passato immutabile.** MG2, AL4, MA2 e IA4 verificano la condizione **nell'istante in cui l'azione viene chiesta**, e non tornano mai a invalidare ciò che è già accaduto. Chi esce da un Gruppo non cancella i propri messaggi; chi perde il Permesso di Caricare non si porta via il materiale già condiviso; chi perde il Permesso di Scrivere tace da adesso.

E due assenze, ribadite qui perché sono le più esposte a essere colmate per abitudine: **il `Post` non ha visibilità propria** (B5) e **l'`AulaStudio` non ha stato di ciclo di vita** (AS8). Sono invarianti negative a tutti gli effetti, e la loro violazione non produrrebbe un errore visibile — produrrebbe un modello diverso da quello concordato.

## Domain Events

Il dominio pubblica **fatti già accaduti**, nominati al passato nel linguaggio ubiquo. Un evento non è una notifica di modifica: è la registrazione di qualcosa che è successo e che non si può disfare. Da questo criterio discendono tre regole vincolanti per l'intero catalogo:

1. **Nessun evento generico.** Non esiste `PostAggiornato`, non esiste `AulaStudioModificata`, non esiste alcun evento che porti lo stato completo dell'aggregato e lasci al consumatore il compito di scoprire cosa sia cambiato. Ogni evento nomina **un cambiamento preciso**: un Onboarding completato, un Permesso revocato, un Membro rimosso, una Collocazione spostata.
2. **Payload minimo e descrittivo del cambiamento.** Viaggia ciò che serve a capire il fatto, non ciò che il consumatore *potrebbe* volere. Un evento che porta l'intero aggregato è una copia di stato travestita da fatto, e produce consumatori che dipendono da campi di cui il produttore non sa nulla.
3. **Un consumatore deve capire cosa è successo dal solo nome e dal solo payload.** È il criterio di verifica applicato a ogni riga delle tabelle che seguono: se per interpretare un evento occorre conoscere una regola interna del produttore, il nome è sbagliato o il payload è incompleto.

Gli eventi sono **fatti di dominio**, non messaggi tecnici: nessuno di essi nomina un fornitore, un canale di trasporto o un meccanismo di consegna. Il modo in cui viaggiano appartiene alla fase di architettura.

---

### Regola sugli Inviti — finestra di validità: 7 giorni

`InvitoAlGruppo` e `Invito` (Aula studio) hanno la **stessa finestra di validità: 7 giorni**. È una decisione unica applicata a due aggregati di due contesti distinti, non una regola condivisa: ciascun contesto la enuncia per sé, coerentemente con il fatto che i due Inviti non condividono modello.

Due conseguenze precise sul catalogo:

- **L'istante di scadenza è calcolato all'emissione e viaggia nel payload degli eventi di emissione.** Chi consuma il fatto sa *quando* l'Invito scade senza dover conoscere la regola dei 7 giorni. Se un giorno la finestra cambiasse, i consumatori non se ne accorgerebbero: leggono una data, non applicano un calcolo. È la differenza fra pubblicare un fatto e pubblicare una regola.
- **Allo scadere della finestra il dominio emette `InvitoAlGruppoScaduto` e `InvitoAllAulaStudioScaduto`.** Sono **fatti temporali con nome di dominio**, che chiudono il ciclo di vita dell'Invito portandolo in uno stato conclusivo terminale (IG2, IA1). La scadenza **non è un'attività tecnica anonima**: è un accadimento che il dominio nomina, esattamente come nomina l'emissione e l'accettazione. Un Invito che scade è un fatto che riguarda una persona che era stata chiamata e non è entrata.

Si noti la coerenza con IA2: un Invito rivolto a chi non è ancora Utente **resta legittimamente in attesa**, e la scadenza è ciò che gli dà una fine. Senza il fatto temporale, quell'attesa non finirebbe mai.

---

### Catalogo — Profilo

| Evento | Trigger | Proprietà | Reazioni |
| --- | --- | --- | --- |
| `ProfiloCreato` | creazione del `Profilo` | `UtenteId`, istante | **nessun consumatore interno al dominio**: l'Utente non è ancora identificabile |
| `OnboardingCompletato` | `Profilo` (P2) | `UtenteId`, nome, cognome, `Università`, `CorsoUniversitario`, istante | Bacheca, Gruppo e Aula studio **creano** la propria copia locale del `RiferimentoUtente` |
| `NomeUtenteAggiornato` | `Profilo` | `UtenteId`, nome, cognome | le tre copie locali del `RiferimentoUtente` (E1) |
| `AffiliazioneAccademicaAggiornata` | `Profilo` | `UtenteId`, `Università`, `CorsoUniversitario` | le tre copie locali del `RiferimentoUtente`. La Visibilità Ateneo continua a valutarsi **su dato fresco** (AS7, G5) |

#### Lettura

**`ProfiloCreato` è un evento senza consumatori, e va tenuto così.** Nel momento in cui il `Profilo` nasce (P1), l'Utente ha un'identità ma non un'identificabilità: non ha nome, non ha Università, non ha Corso universitario. Non c'è nulla che Bacheca, Gruppo o Aula studio possano farne — una copia locale del `RiferimentoUtente` creata qui sarebbe vuota. L'evento esiste perché il fatto è avvenuto, non perché qualcuno lo attende.

**`OnboardingCompletato` è il momento in cui l'Utente entra nel resto del dominio.** È l'unico evento che porta il quadro anagrafico completo, e lo porta una volta sola: la transizione è a senso unico (P3), quindi non si ripete e non si annulla. I tre consumatori **creano** qui la propria copia locale — non la aggiornano, la costituiscono. È anche la ragione per cui il payload contiene tutti e quattro i dati: non è uno stato completo dell'aggregato, è **esattamente ciò che P2 dichiara essere il contenuto del completamento**.

**I due eventi di aggiornamento sono deliberatamente due, e non uno.** Sarebbe stato più comodo un solo `ProfiloAggiornato` con i quattro campi: è precisamente l'evento generico che il catalogo vieta. Nome e affiliazione accademica cambiano per motivi diversi, e soprattutto **hanno usi diversi a valle**:

- il nome serve a mostrare chi ha scritto un Post, chi è Membro, chi è Partecipante. È il caso tipico di E1, con finestra di **pochi minuti**;
- l'affiliazione accademica serve, oltre che a mostrarsi, alla decisione sulla **Visibilità Ateneo**. E qui la riga della tabella dice una cosa che va letta con attenzione: **la propagazione aggiorna la copia locale, ma non è ciò su cui si decide l'ammissione**. AS7 e G5 impongono che l'appartenenza dell'aspirante Partecipante o Membro a un ateneo si valuti **su dato fresco del Profilo**. L'evento tiene allineato ciò che si mostra; l'autorizzazione resta un'interrogazione sincrona.

È la traduzione, nel catalogo eventi, della ripartizione fissata nella Context Map: **dato anagrafico propagato, decisione di autorizzazione interrogata**. Un evento non può mai essere la base di una decisione di privacy, perché un evento è per definizione un fatto del passato.

**Nessun evento sulle `ImpostazioniDiPrivacy`** — l'esclusione è trattata più avanti insieme alle altre.

---

### Catalogo — Bacheca

| Evento | Trigger | Proprietà | Reazioni |
| --- | --- | --- | --- |
| `PostPubblicato` | `Post` | `PostId`, `AutoreId`, istante, numero di Allegati | nessun consumatore interno al dominio |
| `CommentoPubblicato` | `Commento` | `CommentoId`, `PostId`, `AutoreId`, istante | nessun consumatore interno al dominio |
| `PostEliminato` | `Post` | `PostId`, `AutoreId`, **chiavi dei `FileArchiviato` che erano allegati** | policy interna che elimina i Commenti del Post (E3) |

#### Lettura

La Bacheca è il contesto in **separate ways** con Gruppo e Aula studio, e il catalogo lo mostra senza bisogno di commento: **nessuno dei suoi eventi ha consumatori fuori dal contesto**. `PostPubblicato` e `CommentoPubblicato` non attraversano alcun confine — un Post pubblicato non entra mai negli spazi del Gruppo, e nessuna Aula studio reagisce a un contenuto della Bacheca.

**`PostPubblicato` porta il numero di Allegati, non gli Allegati.** È la scelta di payload minimo applicata al caso più tentante: sarebbe stato facile far viaggiare nomi, tipi e dimensioni. Ma l'`Allegato` è **entità interna** al Post (B4), non ha vita fuori dal suo confine, e nessun consumatore ha titolo per ragionarci sopra. Il conteggio dice ciò che serve — che quel Post porta materiale, e quanto — senza esportare un modello.

**`PostEliminato` è l'unico evento della Bacheca con un payload arricchito, e per una ragione precisa.** Porta **le chiavi dei `FileArchiviato` che erano allegati**, al passato: sono i riferimenti ai file che, essendo scomparsi con il Post nella stessa transazione (B4), non sono più raggiungibili da nessuna parte del modello. Senza quelle chiavi nel payload, l'informazione sarebbe perduta nell'istante stesso della cancellazione, e i file resterebbero nell'archiviazione senza che nulla li nomini più. È un caso in cui **l'evento è l'ultima occasione per dire una cosa**, e quindi la dice.

La sua reazione è **una policy interna al contesto**: l'eliminazione dei Commenti (E3, **pochi minuti**). È esattamente la finestra dichiarata negli invarianti, e discende da C3: il Commento non garantisce l'esistenza del Post, quindi per un tempo dichiarato esistono Commenti sotto un Post che non c'è più. Nessuno subisce danno nel frattempo, e la finestra è la classe «pochi minuti» proprio perché nessuno sta aspettando.

---

### Catalogo — Gruppo

| Evento | Trigger | Proprietà | Reazioni |
| --- | --- | --- | --- |
| `GruppoCreato` | `Gruppo` | `GruppoId`, nome, `Visibilità`, ateneo se Ateneo, `UtenteId` del creatore | policy che crea l'`AlberoOrganizzativo` con la Cartella radice (A1, inter-aggregato quindi differito) |
| `InvitoAlGruppoEmesso` | `InvitoAlGruppo` | `InvitoId`, `GruppoId`, nome del Gruppo, destinatario, istante di emissione, **istante di scadenza** (emissione + 7 giorni) | nessun consumatore interno al dominio |
| `InvitoAlGruppoAccettato` | `InvitoAlGruppo` | `InvitoId`, `GruppoId`, `UtenteId`, istante | policy che **aggiunge il Membro** al Gruppo (IG3, E5) |
| `InvitoAlGruppoScaduto` | scadenza dei 7 giorni | `InvitoId`, `GruppoId`, istante | chiude il ciclo di vita dell'Invito |
| `MembroAggiuntoAlGruppo` | `Gruppo` | `GruppoId`, `UtenteId`, istante | nessun consumatore interno al dominio |
| `MembroRimossoDalGruppo` | `Gruppo` | `GruppoId`, `UtenteId`, istante | **Aula studio: allontana l'Utente dalle Aule studio collocate nel Gruppo** (E2) |
| `CollocazioneSpostataInCartella` | `AlberoOrganizzativo` | `GruppoId`, `AulaStudioId`, `CartellaId` di destinazione | nessuno fuori dal Gruppo: è **organizzazione interna** |

#### Lettura

**`GruppoCreato` porta l'ateneo solo se la `Visibilità` vale Ateneo**, e non altrimenti: il payload descrive il fatto così com'è avvenuto, senza campi vuoti di riserva. L'ateneo che viaggia è **l'ateneo di riferimento dello spazio**, precompilato dall'`Università` del creatore e da lì immutabile (G5) — non è l'`Università` del creatore che continua a vivere nel suo Profilo, ed è la ragione per cui questo dato sta nell'evento del Gruppo e non si legge da Profilo.

La sua reazione è la creazione dell'`AlberoOrganizzativo` con la Cartella radice. A1 impone che esista **esattamente un Albero per Gruppo** con radice sempre presente, ma `Gruppo` e `AlberoOrganizzativo` sono **due aggregati distinti**: la condizione è inter-aggregato, quindi non garantibile al commit e necessariamente differita. È un caso in cui una regola formulata come invariante di un aggregato (l'Albero, che garantisce la propria radice) si raggiunge attraverso una policy che reagisce a un fatto di un altro aggregato.

**Il trittico degli Inviti — emesso, accettato, scaduto — copre l'intero ciclo di vita di IG1–IG2**, senza stati intermedi e senza eventi di modifica. `InvitoAlGruppoEmesso` porta **il nome del Gruppo** oltre al `GruppoId`: è l'unico caso in cui un dato descrittivo accompagna un'identità, e il motivo è che il destinatario può **non essere ancora un Utente** della piattaforma. Chi riceve una chiamata a entrare deve poter capire dove viene chiamato senza dover risolvere un identificativo dentro un contesto a cui non ha ancora accesso. Insieme all'istante di scadenza, il payload è **autosufficiente**: nome e scadenza rendono il fatto comprensibile a chi lo consuma senza conoscere il modello del Gruppo.

**`InvitoAlGruppoAccettato` è l'evento con la finestra più stretta del contesto.** IG3 dichiara come invariante che l'accettazione **non** crea il Membro nella stessa transazione: fra questo evento e `MembroAggiuntoAlGruppo` c'è E5, **pochi secondi**, ed è il ritardo più stretto del sistema perché **c'è una persona che aspetta**. È anche il punto in cui l'idempotenza già garantita paga: G3 rende priva di effetto una seconda aggiunta dello stesso `UtenteId`, e IG2 rende priva di effetto una seconda accettazione dello stesso Invito. Nessuno dei due lati deve tenere traccia di ciò che ha già elaborato.

**`MembroAggiuntoAlGruppo` non ha consumatori, `MembroRimossoDalGruppo` sì.** È l'asimmetria più importante dell'intero catalogo, e ha una motivazione che vale la pena enunciare per intero.

> L'**ammissione** per appartenenza al Gruppo si risolve **con lettura fresca** (IA4): chi chiede di entrare in un'Aula studio collocata sta chiedendo *adesso*, e l'Aula studio interroga il contratto di appartenenza nell'istante in cui la domanda arriva. Non serve alcuna copia locale dell'elenco dei Membri, quindi **`MembroAggiuntoAlGruppo` non è consumato dall'Aula studio**.
>
> L'**espulsione** deve raggiungere **chi è già dentro un incontro in corso**, e nessuna interrogazione può farlo: quella persona non farà alcuna nuova richiesta, sta ascoltando l'Audiochat e leggendo la Chat testuale. L'unico modo di raggiungerla è che l'informazione **le venga incontro**. Perciò è **propagazione per evento** (E2, pochi secondi).

È la prova che la direzione della propagazione non si decide per simmetria ma per necessità: si propaga solo ciò che nessuna domanda potrebbe scoprire in tempo. Si noti anche che l'Aula studio, ricevendo questo fatto, **non importa il concetto di Membro**: il suo anti-corruption layer lo traduce in un titolo di ammissione decaduto, e il core continua a parlare di Partecipante rimosso.

**`CollocazioneSpostataInCartella` è organizzazione interna e resta dentro il Gruppo.** Riordinare le Cartelle non riguarda l'Aula studio: A6 garantisce che l'eliminazione di una Cartella non elimini alcuna Aula studio, e il core non ha alcun motivo di sapere in quale ramo dell'Albero il suo riferimento è collocato. Se questo evento uscisse dal contesto, il Gruppo starebbe esportando il proprio modello di organizzazione, contro il contratto d'indice.

---

### Catalogo — Aula studio (core)

È il catalogo più ricco del modello, coerentemente con la concentrazione dell'investimento sul core. Vale la pena notare fin d'ora che **la maggior parte di questi eventi non ha consumatori interni al dominio**: il core produce fatti perché essi *sono accaduti*, non perché qualcun altro ne dipenda. Un catalogo denso di eventi senza consumatori è il segno che il contesto è **a monte di poco e a valle di poco**, cioè che è ben protetto.

| Evento | Trigger | Proprietà | Reazioni |
| --- | --- | --- | --- |
| `AulaStudioCreata` | `AulaStudio` | `AulaStudioId`, titolo, `Visibilità`, ateneo se Ateneo, `DataOraDiInizio` (opzionale), creatore, `GruppoId` (opzionale) | `AlberoOrganizzativo`, **se collocata**: inserisce la Collocazione nella Cartella radice (A5) |
| `AulaStudioRinominata` | `AulaStudio` | `AulaStudioId`, nuovo titolo | indice delle Collocazioni nell'`AlberoOrganizzativo` |
| `InizioDellAulaStudioRiprogrammato` | `AulaStudio` | `AulaStudioId`, nuova `DataOraDiInizio` (**assente = estemporanea**) | indice delle Collocazioni nell'`AlberoOrganizzativo` |
| `AulaStudioCollocataInGruppo` | `AulaStudio` (AS9) | `AulaStudioId`, `GruppoId`, titolo, `DataOraDiInizio` | `AlberoOrganizzativo`: **crea** la Collocazione |
| `AulaStudioScollocataDalGruppo` | `AulaStudio` | `AulaStudioId`, `GruppoId` | `AlberoOrganizzativo`: **rimuove** la Collocazione |
| `InvitoAllAulaStudioEmesso` | `Invito` | `InvitoId`, `AulaStudioId`, titolo, destinatario, istante di emissione, **istante di scadenza** (emissione + 7 giorni) | nessun consumatore interno al dominio |
| `InvitoAllAulaStudioAccettato` | `Invito` | `InvitoId`, `AulaStudioId`, `UtenteId`, istante | policy che **crea il Partecipante** (IA3, E5) |
| `InvitoAllAulaStudioScaduto` | scadenza dei 7 giorni | `InvitoId`, `AulaStudioId`, istante | chiude il ciclo di vita dell'Invito |
| `PartecipanteAmmessoAllAulaStudio` | `AulaStudio` | `AulaStudioId`, `UtenteId`, **causa dell'ammissione** (Invito accettato \| appartenenza al Gruppo) | nessun consumatore interno al dominio |
| `PartecipanteRimossoDallAulaStudio` | `AulaStudio` | `AulaStudioId`, `UtenteId`, **causa** (`rimosso dal Moderatore` \| `decaduta l'appartenenza al Gruppo` \| `uscita volontaria`), istante | nessun consumatore interno al dominio |
| `PermessoConcessoAlPartecipante` | `AulaStudio` (AS4) | `AulaStudioId`, `UtenteId`, **Permesso ∈ {Parlare, Scrivere, Caricare}** | nessun consumatore interno al dominio |
| `PermessoRevocatoAlPartecipante` | `AulaStudio` | `AulaStudioId`, `UtenteId`, **Permesso revocato** | nessun consumatore interno al dominio |
| `AllegatoDiAulaStudioCaricato` | `AllegatoDiAulaStudio` | `AllegatoId`, `AulaStudioId`, `ArgomentoId` opzionale, `CaricatoDa`, nome, tipo, dimensione | nessun consumatore interno al dominio |
| `ArgomentoEliminato` | `Argomento` | `ArgomentoId`, `AulaStudioId` | policy che rende **sciolti** gli Allegati che vi erano associati, **senza cancellarli** (E4) |
| `AulaStudioEliminata` | `AulaStudio` | `AulaStudioId`, `GruppoId` opzionale, istante | `AlberoOrganizzativo`: rimuove la Collocazione (E6); **avvia la riconciliazione degli elementi orfani** |
| `ElementiOrfaniDiAulaStudioRimossi` | scadenza, pochi minuti dopo `AulaStudioEliminata` | `AulaStudioId`, chiavi dei `FileArchiviato` rimossi, conteggio dei messaggi rimossi | **chiude la finestra di rischio** dichiarata negli invarianti |

#### I Permessi: due eventi, uno per gesto, mai un insieme

`PermessoConcessoAlPartecipante` e `PermessoRevocatoAlPartecipante` portano **un solo Permesso ciascuno**, scelto fra i tre. È la traduzione diretta di AS4: i Permessi si concedono e si revocano **uno per uno**, e il catalogo eventi non poteva contraddirla pubblicando un insieme.

La tentazione da respingere è precisa: un evento che porti l'insieme completo dei Permessi del Partecipante sarebbe **un evento generico travestito** — direbbe *com'è adesso*, non *cosa è successo*. Un consumatore dovrebbe confrontare due insiemi per capire che al Partecipante è stato tolto il Permesso di Parlare, cioè dovrebbe ricostruire il fatto invece di leggerlo. Con questi due eventi, invece, **il fatto è nel nome e nel payload**: a questo Partecipante, in questa Aula studio, è stato revocato Parlare.

Due conseguenze coerenti con gli invarianti:

- **la Sola lettura non ha un evento proprio.** È l'insieme vuoto di Permessi (AS4), quindi si raggiunge per revoche successive e non per assegnazione. Un evento `PartecipanteMessoInSolaLettura` reintrodurrebbe come fatto ciò che il linguaggio ubiquo ha eliminato come ruolo;
- **la revoca del Permesso di Parlare non ha altro nome.** Il termine «mutare» è escluso dal linguaggio: il fatto pubblicato è una revoca di Permesso, e chi lo consuma lo legge così.

Nessuno dei due eventi ha consumatori interni al dominio: i Permessi sono verificati **su dato fresco** sull'`AulaStudio` al momento in cui servono (AL4, MA2), non ricostruiti altrove da una sequenza di eventi.

#### Ammissione e rimozione: la causa fa parte del fatto

`PartecipanteAmmessoAllAulaStudio` porta **la causa dell'ammissione**, e `PartecipanteRimossoDallAulaStudio` porta **la causa della rimozione**. È l'unico punto del catalogo in cui un payload contiene un motivo, e non è un ornamento: senza la causa i due eventi sarebbero indistinguibili fra situazioni che il dominio tratta in modo diverso.

Per l'ammissione, le cause sono esattamente le due che IA4 dichiara: **Invito accettato** oppure **appartenenza al Gruppo**. Sono i due soli titoli di ammissione, e sapere quale dei due ha operato è ciò che permette di leggere l'evento successivo: se l'ammissione era per appartenenza, quel titolo può decadere; se era per Invito accettato, no.

Per la rimozione, le tre cause — **rimosso dal Moderatore**, **decaduta l'appartenenza al Gruppo**, **uscita volontaria** — descrivono tre accadimenti che nel dominio non sono affatto la stessa cosa, per quanto producano lo stesso effetto sull'insieme dei Partecipanti. In particolare **decaduta l'appartenenza al Gruppo** è il fatto che chiude E2: è il modo in cui il core registra, nella propria lingua, ciò che ha appreso da `MembroRimossoDalGruppo` dopo la traduzione dell'anti-corruption layer. Il termine «Membro» non compare: compare un Partecipante rimosso per una causa.

Si noti che AS2 continua a valere: l'ultimo Moderatore non si rimuove né si retrocede, quindi nessuna di queste tre cause può mai produrre un'Aula studio senza Moderatore.

#### Argomenti e Allegati: eliminare un contenitore non distrugge il contenuto

`ArgomentoEliminato` porta il solo `ArgomentoId` e la sua `AulaStudioId`, e la sua reazione è la più caratteristica del modello: gli Allegati che vi erano associati **tornano sciolti nell'Aula studio, senza essere cancellati** (E4, pochi minuti).

È possibile **solo perché l'`AllegatoDiAulaStudio` è aggregato autonomo** con collocazione facoltativa: l'assenza di `ArgomentoId` è uno stato normale, non un ripiego, e non serve alcun Argomento di default in cui parcheggiarli. Il contrasto con la Bacheca è netto e voluto: là `PostEliminato` porta via gli Allegati nella stessa transazione (B4) e ne pubblica le chiavi come ultimo atto; qui l'eliminazione di un contenitore **non tocca il materiale**. Stessa parola del linguaggio ubiquo, due cicli di vita, due comportamenti opposti alla cancellazione.

È la stessa filosofia di A6, dove l'eliminazione di una Cartella fa risalire le Collocazioni al genitore: **riorganizzare non distrugge mai**. Per un prodotto la cui ragione d'essere è che il materiale di studio non si perda, è la proprietà che più conta.

`AllegatoDiAulaStudioCaricato` porta nome, tipo e dimensione — non la chiave di archiviazione, che serve solo a ritrovare il file — più `CaricatoDa`, che registra chi ha portato il materiale nell'incontro e resta valido anche quando quel Partecipante non c'è più (AL2). Non ha consumatori interni al dominio.

#### Eliminazione dell'Aula studio: due eventi, perché la finestra di rischio è dichiarata

La coppia `AulaStudioEliminata` → `ElementiOrfaniDiAulaStudioRimossi` è il punto in cui il catalogo eventi dà corpo alla riclassificazione decisa negli invarianti.

La regola resta vincolante: **un'Aula studio si elimina solo se non contiene Allegati né messaggi di Chat testuale**. Ma `AllegatoDiAulaStudio` e `MessaggioDiChat` sono aggregati autonomi, fuori dal confine dell'`AulaStudio`: la condizione è verificata **al comando, su lettura fresca**, e resta una finestra di rischio sottilissima — un Allegato caricato nello stesso istante in cui l'eliminazione viene comandata.

- **`AulaStudioEliminata`** registra il fatto e ha due reazioni: la rimozione della Collocazione dall'`AlberoOrganizzativo` del Gruppo (E6, pochi minuti — il `GruppoId` è nel payload proprio perché opzionale, e la sua assenza dice che l'Aula studio era autonoma), e l'**avvio della riconciliazione**.
- **`ElementiOrfaniDiAulaStudioRimossi`** è il secondo fatto temporale del catalogo, dopo le scadenze degli Inviti, e **chiude esplicitamente la finestra di rischio**. Porta le **chiavi dei `FileArchiviato` rimossi** — stessa logica di `PostEliminato`: è l'ultima occasione per nominare file che nulla raggiungerà più — e il **conteggio dei messaggi rimossi**, non i messaggi, perché il volume è incompatibile e nessuno ne ha bisogno.

Pubblicare questo secondo evento invece di far sparire silenziosamente gli orfani è una scelta di metodo: **ciò che il modello non garantisce al commit lo dichiara, e ciò che chiude la dichiarazione ha un nome di dominio**. Nessuna pulizia anonima.

---

### Indice delle Aule studio nelle Cartelle

L'indice mantenuto nell'`AlberoOrganizzativo` è aggiornato **per propagazione, in consistenza eventuale**, da sei eventi del core: **creazione, rinomina, riprogrammazione, collocazione, scollocazione, eliminazione**. È la realizzazione, sul catalogo eventi, del **contratto d'indice** della partnership: l'Aula studio è a monte, e ciò che attraversa il confine è un'etichetta minima.

L'indice riceve esattamente due cose:

- il **titolo** dell'Aula studio;
- la **`DataOraDiInizio`**, con la convenzione dichiarata: **assente = estemporanea**.

E **mai un campo di stato del ciclo di vita**. È il vincolo più importante di questa sezione, e discende direttamente da AS8: l'`AulaStudio` non porta alcuno stato — non esiste «programmata», «in corso», «conclusa» — quindi non può pubblicarlo. La distinzione fra Aula studio programmata ed estemporanea è **derivata da chi consuma**: chi mostra l'indice guarda se la data c'è e la interpreta. Il produttore pubblica un dato, non una classificazione.

Da qui la conseguenza più netta dell'intero catalogo: **non esiste alcun evento al raggiungimento della `DataOraDiInizio`**. Nessun `AulaStudioIniziata`, nessun `AulaStudioConclusa`. La data **non apre né chiude nulla** (AS8), l'Aula studio resta consultabile con i suoi Argomenti e i suoi Allegati prima e dopo l'incontro, e il materiale di studio sopravvive **perché non c'è nulla che lo chiuda**. Un evento di inizio sarebbe la porta d'ingresso del termine «Sessione», già eliminato dal linguaggio ubiquo, e costringerebbe a modellare un intero meccanismo temporale che il dominio non ha chiesto.

Si noti anche la simmetria dei due contratti sull'indice: il core pubblica sei eventi verso l'Albero, e l'Albero pubblica `CollocazioneSpostataInCartella` che **non esce dal Gruppo**. Nessuno dei due verso trasporta il modello dell'altro, e non si forma alcun ciclo su uno stesso contratto.

---

### Esclusioni dichiarate

Ogni esclusione è una decisione con una motivazione, e va trattata come tale: una proposta futura di aggiungere uno di questi eventi è una modifica del modello, non un completamento.

**`MessaggioDiChatInviato`, sia in Gruppo sia in Aula studio.** Non è un evento di dominio persistito, per due ragioni che valgono entrambe da sole: **nessun consumatore di dominio** — MG2 e MA2 verificano il titolo a scrivere e il Permesso di Scrivere su dato fresco sull'aggregato dello spazio, non ricostruendo nulla da una sequenza di fatti — e **volume incompatibile** con un catalogo di fatti di dominio. La Chat testuale ha bisogno di essere trasportata, non di essere raccontata al dominio: il trasporto è una capacità generic dietro una porta sottile.

**Promozione e retrocessione a Moderatore.** È un **fatto interno all'aggregato `AulaStudio`**, e nessuno vi reagisce. La ragione è AS6: ruoli e Permessi sono definiti **solo** dentro l'Aula studio, e nessuna derivazione automatica dal Gruppo è ammessa. Se pubblicassimo la promozione, offriremmo a un consumatore l'occasione di derivarne qualcosa — precisamente ciò che l'invariante vieta. La promozione concede i tre Permessi (AS5), e se un giorno servisse osservarla dall'esterno andrebbe rimessa in discussione AS6, non aggiunto un evento.

**Spostamento di un Allegato tra Argomenti.** È una **scrittura sul solo Allegato** — è precisamente il motivo per cui `AllegatoDiAulaStudio` è aggregato autonomo — e **non ha consumatori**. Né l'Argomento di partenza né quello di arrivo né l'Aula studio hanno qualcosa da fare quando un Allegato cambia collocazione.

**Nessun evento sulle `ImpostazioniDiPrivacy`.** Sarebbe **pura replica dello stato, senza consumatori**: le decisioni di contattabilità e visibilità dei contenuti sono **interrogazioni sincrone risolte da Profilo nel momento in cui servono**, mai copie locali. Un evento le renderebbe replicabili, e una decisione di privacy replicata è una decisione presa su un dato vecchio. È inoltre coerente con IP4: nessun'altra operazione di dominio le modifica come effetto collaterale, quindi non c'è nulla da annunciare a nessuno.

Una precisazione che completa il quadro: **le `ImpostazioniDiPrivacy` nascono nella stessa transazione di `ProfiloCreato`, con il default più restrittivo** (IP1) — **non per reazione al completamento dell'Onboarding**. Non esiste quindi una policy che le crei ascoltando `OnboardingCompletato`, e non esiste alcuna finestra in cui un Utente esista privo di regole di privacy. È l'unico punto del modello in cui due aggregati distinti nascono nella stessa scrittura, ed è deliberato.

---

### Forma comune di ogni evento

Ogni evento del catalogo, senza eccezioni, porta sempre:

| Elemento | Perché
| --- | --- |
| **Identificativo univoco dell'evento** | rende riconoscibile il singolo fatto pubblicato, indipendentemente da quante volte viene consegnato |
| **Istante di accadimento** | il fatto è collocato nel tempo; è il momento in cui è accaduto, non quello in cui viene letto |
| **Identità dell'aggregato sorgente** | dice da quale confine di consistenza il fatto proviene |
| **Versione del contratto** | i contratti pubblicati sono versionati, e un consumatore deve sapere quale linguaggio sta leggendo |

Sulla **doppia consegna** vale una nota che chiude il cerchio con la sezione precedente: il caso più delicato è l'accettazione di un Invito, ed è **reso innocuo dagli invarianti già bloccati**. **G3** garantisce che un `UtenteId` compaia al massimo una volta fra i Membri; **AS3** garantisce lo stesso fra i Partecipanti. Una seconda aggiunta dello stesso Utente è quindi **un'operazione senza effetto**, non un errore da gestire. A questo si aggiunge la terminalità degli stati dell'Invito (IG2, IA1), che rende priva di effetto anche una seconda accettazione.

È un risultato che merita di essere reso esplicito: **la difesa contro la doppia consegna non è un meccanismo aggiuntivo, è una proprietà del modello.** Gli invarianti di unicità e la terminalità degli stati sono stati decisi per ragioni di dominio, e producono come conseguenza che nessun consumatore debba tenere traccia di ciò che ha già elaborato. È il tipo di economia che un progetto con una sola persona e poche ore di lavoro non può permettersi di non incassare.

## Appendice — trace link

| Da | Relazione | A |
|---|---|---|
| documento | derives_from | discovery_brief v1 |
