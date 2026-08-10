---
artifact: "estimate"
title: "Estimate"
project: "Prome"
client: "Myself"
version: 1
status: "approved"
created_at: "2026-08-08T22:19:26.131Z"
approved_at: "2026-08-09T08:55:26.900Z"
stage: "estimation"
attempt: 2
run_id: "76cbc5d0-33e7-4dde-91d0-9352b60167f0"
version_id: "d91c26ec-e508-4eee-a5c5-34d97a78aae6"
generated_by: "documento generato da donumAI — le modifiche si fanno nella pipeline, non in questo file"
---

# Estimate

## Summary

Il perimetro stimato è la riscrittura completa di Prome come prima release su prome.app, secondo i cinque blocchi dichiarati IN scope dal brief: parte pubblica (homepage, privacy policy, pagine informative), post con commenti e allegati PDF/immagini, aule studio complete (moderatori, partecipanti, chat testuale via Socket.IO, audiochat su LiveKit self-hosted, upload file su Cloudflare R2), impostazioni privacy (chi può contattare l'utente, chi vede i suoi contenuti) e gruppi. È inclusa la fetta minima autonoma dichiarata non negoziabile — registrazione con Better Auth, onboarding (nome, cognome, università, corso), creazione post con allegato — più il cutover big bang sullo stesso dominio (dismissione del progetto Vercel, cancellazione del database MongoDB, pubblicazione del nuovo stack NestJS+Fastify / Next.js App Router / Postgres). Su indicazione del committente il perimetro comprende anche il **client mobile React Native con Expo, sviluppato in parallelo al web**: gli stessi flussi in scope sono quindi realizzati due volte lato client (web e nativo), con in più il lavoro specifico di piattaforma (build, permessi microfono nativi, push FCM nativo, pubblicazione sugli store). Nessuna migrazione dati: i ~15 account e i file su S3 vengono cancellati. Tre aree del brief sono trattate come spike a timebox, perché non decomponibili con le informazioni disponibili: LiveKit self-hosted (mai gestito prima, costi e manutenzione ignoti), la definizione funzionale dei "gruppi" (mai descritti in intervista) e la scelta del provider email tra Brevo e Resend. Il lavoro a valle di questi spike è condizionato al loro esito: in particolare l'intera voce audiochat (web e mobile) può variare di segno se lo spike LiveKit rivela costi o onere operativo incompatibili con l'infrastruttura prevista, e i gruppi non sono stimabili oltre uno scheletro CRUD finché il loro comportamento non è definito.

Unit: ideal person-days · Convention: three-point P10/M/P90 · Totals: computed at P50/P80/P90 (an estimate, not a commitment)

#### Out of scope

- Corsi con sessioni ripetute (materiale + sessioni multiple): rinviati esplicitamente dal brief.
- Eventi e board: rinviati in via eventuale, non pianificati.
- Qualsiasi funzione di monetizzazione, pagamenti o modello di ricavo.
- Migrazione di dati, account, file o contenuti dal sistema esistente; nessun avviso agli utenti attuali.
- Recupero, riparazione o build del repo Next.js 12; le vecchie API REST valgono solo come riferimento di lettura.
- Sostituzione di Twilio: abbandonato senza rimpiazzo, nessun canale SMS.
- Piano di acquisizione, creatività e gestione campagne Google/Instagram/TikTok, e relativo budget advertising.
- Ridisegno del flusso di invito all'aula: resta link via email con obbligo di iscrizione, come oggi.
- Design system originale, branding, produzione di contenuti editoriali e testi di marketing oltre alle pagine informative minime.
- Impianto di analytics oltre l'inserimento dello snippet PostHog (non confermato): nessuna definizione di funnel o dashboard.
- Versione tablet/iPad ottimizzata e supporto offline dell'app mobile: il client Expo è pensato per telefono, online.

#### Assunzioni falsificabili

- L'app mobile Expo è in scope e viene sviluppata **in parallelo** al web sugli stessi flussi, condividendo le API NestJS senza endpoint dedicati al mobile; l'assunzione è che nessun flusso richieda un backend-for-frontend separato. Riguarda gli item WP-34…WP-42. Impact if violated: 8 days
- L'app mobile riusa la logica di dominio via API e una libreria di componenti Expo pronta, senza monorepo condiviso di UI né design system cross-platform: le schermate native sono riscritte, non riusate dal web. Riguarda gli item WP-34…WP-42. Impact if violated: 6 days
- Le pubblicazioni su App Store e Google Play passano in prima o seconda revisione: account developer già attivi e 3 app personali già pubblicate. Riguarda l'item di pubblicazione store. Impact if violated: 5 days
- LiveKit self-hosted gira su un singolo nodo gestito dal fondatore, senza requisiti di alta disponibilità, scaling automatico o registrazione delle sessioni, e lo spike conferma la fattibilità entro il budget infrastrutturale previsto; l'SDK LiveKit per React Native funziona su Expo con dev client senza eject completo. Riguarda gli item di spike LiveKit e audiochat web/mobile. Impact if violated: 10 days
- I "gruppi" sono un contenitore di utenti con appartenenza e visibilità sui contenuti (post e aule), non un secondo spazio sociale con propri feed, ruoli, moderazione e notifiche dedicate. Riguarda lo spike gruppi e gli item gruppi/privacy, web e mobile. Impact if violated: 12 days
- Le impostazioni privacy sono un insieme finito e chiuso di regole (chi può contattare / chi può vedere) applicate a un solo ruolo utente, senza motore di permessi generico né visibilità granulare per singolo contenuto. Riguarda gli item privacy, post, aule e gruppi. Impact if violated: 6 days
- L'autenticazione usa Better Auth con i suoi provider pronti (Google, Apple, email+password, email+OTP) senza estensioni custom del protocollo; l'account developer Apple e le credenziali OAuth sono già disponibili, e Sign in with Apple nativo è obbligatorio solo perché esistono altri social login. Riguarda gli item auth e onboarding, web e mobile. Impact if violated: 5 days
- Le vecchie API REST e le schermate esistenti sono leggibili come riferimento funzionale senza bisogno di far girare il progetto legacy in locale (avvio non più verificato). Riguarda gli item post e aule studio. Impact if violated: 3 days
- Il cutover è big bang, con pochi minuti di downtime accettati, nessuna coesistenza né rollback verso il vecchio sistema; le app mobili possono uscire dopo il web senza bloccare il cutover. Riguarda gli item di release e cutover. Impact if violated: 4 days

#### Target dichiarati vs stima

Il brief fissa come target ~100 utenti entro novembre, un'infrastruttura da ~10 €/mese e una disponibilità misurata di ~2 ore nelle ultime 4 settimane, con una sola persona che decide, paga e sviluppa. Questi sono obiettivi, non evidenze di sforzo: non hanno influenzato i valori a tre punti qui sotto. Il confronto va fatto in un senso solo — i giorni-persona ideali calcolati dal sistema vanno divisi per la capacità reale disponibile, e la disponibilità storica misurata (~0,25 giorni-persona in 4 settimane) è di due ordini di grandezza sotto il totale che emergerà. L'inclusione del client mobile in parallelo al web amplia ulteriormente il divario, perché raddoppia la superficie client di ogni flusso. La lettura onesta è che il perimetro completo dei cinque blocchi su due client non è compatibile con la scadenza dichiarata, mentre la sola fetta minima (registrazione + onboarding + post con allegato, su un solo client) lo è potenzialmente, se trattata come primo rilascio pubblico reale e non come tappa interna. Va inoltre notato che il target dei 100 utenti non è raggiungibile da nessun item di questo piano: non esiste lavoro di acquisizione in scope, e la definizione stessa di "utente" (registrato, attivo o ricorrente) non è fissata.

#### PLANNING ASSUMPTIONS

| Key | Value | Confidence | Impact |
| --- | --- | --- | --- |
| team_size | 1 (il fondatore: decide, paga e sviluppa); disponibilità misurata ~2 ore nelle ultime 4 settimane, nessuna intenzione futura dichiarata | stated | high |
| team_seniority | senior full-stack, nessun supporto su design, contenuti o test | stated | medium |
| deadline | novembre (target ~100 utenti), nessun vincolo esterno o contrattuale | stated | medium |
| budget_band | ~10 €/mese di infrastruttura; nessun budget di sviluppo, costo = tempo del fondatore | stated | low |
| deployment_model | server proprio (~10 €/mese) + Cloudflare R2; Vercel dismesso perché il backend è NestJS; app mobile distribuite via App Store e Google Play | stated | medium |
| mandated_stack | NestJS + Fastify, Next.js App Router, React Native + Expo, Postgres, Socket.IO, Better Auth, Cloudflare R2 | stated | high |
| mandated_integrations | LiveKit self-hosted, Firebase Cloud Messaging (piano gratuito), PostHog (non confermato), Brevo o Resend (scelta aperta) | stated | high |
| integration_count | 5 (LiveKit, R2, FCM, provider email, PostHog) + 2 canali di distribuzione store (Apple, Google) | inferred | high |
| data_migration | nessuna: MongoDB e file S3 cancellati, ~15 account buttati | stated | low |
| cutover_strategy | big bang sullo stesso dominio, pochi minuti di downtime accettati, nessuna coesistenza; app mobili pubblicate a valle | stated | medium |
| mobile_app_in_scope | sì: client React Native/Expo (iOS + Android) sviluppato in parallelo al web sugli stessi flussi | stated | high |
| client_count | 2 (web Next.js, mobile Expo su iOS e Android) | stated | high |
| architecture_style | monolite modulare NestJS + due client separati (Next.js, Expo), API condivise, singolo repo | default | medium |
| deployment_unit_count | 5 (API NestJS, web Next.js, nodo LiveKit, build iOS, build Android) | default | medium |
| environment_count | 2 (locale + produzione), nessuno staging; per il mobile un canale interno di test (TestFlight / internal testing) | default | medium |
| entity_count | ~9 (utente/profilo, post, commento, allegato, aula, partecipazione/ruolo, messaggio chat, gruppo, impostazione privacy) | inferred | high |
| screen_count | ~16 schermate web + ~14 schermate mobile native sugli stessi flussi | inferred | high |
| role_count | 3 (utente, moderatore d'aula, amministratore di fatto = il fondatore) | inferred | medium |
| compliance_requirements | nessun obbligo normativo, contrattuale o fiscale dichiarato; privacy policy come pagina statica; privacy nutrition label e data safety form richiesti dagli store | inferred | low |
| design_assets | nessuno: nessun design system, UI web e mobile costruite su librerie di componenti pronte; icone e splash mobile minimi | default | medium |
| test_strategy | test automatici solo sui flussi critici (auth, upload, permessi), resto manuale; mobile provato su un device iOS e uno Android | default | medium |
| observability | logging e health check di base, nessun APM né alerting strutturato; crash reporting mobile non previsto | default | low |
| localization | solo italiano, nessuna internazionalizzazione | default | low |

## Workplan

Decomposizione in fette verticali osservabili dall'utente, coerente con i cinque blocchi IN scope, con la fetta minima autonoma dichiarata e con il client mobile Expo sviluppato in parallelo al web. Gli item WP-01…WP-13 coprono backend e web fino alla fetta minima pubblicabile; WP-14…WP-33 coprono aule studio, privacy, gruppi, infrastruttura e cutover; WP-34…WP-42 coprono il client mobile React Native/Expo sugli stessi flussi. I tre spike (WP-04, WP-14, WP-24) condizionano il lavoro a valle indicato nelle Notes.

| ID | Item | Role | B | M | W | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| WP-01 | Setup repo, monolite modulare NestJS+Fastify, Postgres, migrazioni, config ambienti | BE | 1.0 | 2.0 | 4.0 | Fondazione: scheletro API, ORM, seed. Nessun CI qui (vedi uplift) |
| WP-02 | Setup app Next.js App Router + libreria componenti pronta, layout e navigazione base | FE | 1.0 | 2.0 | 4.0 | Nessun design system originale; tema minimo |
| WP-03 | Registrazione e login con Better Auth: email+password, email+OTP | BE | 1.0 | 2.0 | 4.0 | Include schema utente, sessioni, reset password; API condivise con il mobile |
| WP-04 | Spike provider email: scelta Brevo vs Resend, invio transazionale OTP/inviti | BE | 0.5 | 1.0 | 2.0 | spike — timebox 1 giorno; sblocca WP-03, WP-05, WP-17 |
| WP-05 | Login social Google e Apple (config OAuth, callback, collegamento account) | BE | 1.0 | 2.0 | 5.0 | Apple review/config storicamente lenta; dipendenza esterna |
| WP-06 | Schermate auth web: registrazione, login, OTP, recupero password | FE | 1.0 | 2.0 | 3.5 | Stati di errore e messaggi inclusi |
| WP-07 | Onboarding profilo: nome, cognome, università, corso — API + flusso guidato web | BE, FE | 1.0 | 2.0 | 3.5 | Parte non negoziabile della base; include gate post-registrazione |
| WP-08 | Entità Post: modello, migrazione, CRUD, validazioni, permessi autore | BE | 1.0 | 2.0 | 3.5 | Base della fetta minima |
| WP-09 | Upload allegati PDF/immagini su Cloudflare R2: presigned URL, limiti, antivirus/mime check | BE | 1.0 | 2.5 | 5.0 | Prima volta su R2; include gestione errori upload |
| WP-10 | Composer post con allegati (web): schermata creazione ed editing | FE | 1.0 | 2.0 | 3.5 | Preview allegati, upload progress |
| WP-11 | Feed e dettaglio post (web): lista paginata, dettaglio, visualizzazione allegati | FE | 1.0 | 2.0 | 3.5 | Lista semplice, nessun ranking |
| WP-12 | Commenti sotto i post: modello, API, thread piatto, moderazione autore + UI web | BE, FE | 1.0 | 2.0 | 4.0 | Parità funzionale con il vecchio sistema |
| WP-13 | Parte pubblica: homepage, privacy policy, pagine informative, SEO base | FE | 1.0 | 2.0 | 4.0 | Testi minimi a carico del fondatore; nessun contenuto editoriale |
| WP-14 | Spike LiveKit self-hosted: deploy nodo, TURN/STUN, costi, prova a 3-4 utenti web e mobile | BE | 1.0 | 2.5 | 6.0 | spike — timebox 2.5 giorni; mai gestito prima. Condiziona WP-21, WP-22, WP-40 |
| WP-15 | Entità Aula studio: modello, CRUD, pubblica/privata, stati | BE | 1.0 | 2.0 | 3.5 | |
| WP-16 | Ruoli d'aula: moderatori e partecipanti, join/leave, permessi per azione | BE | 1.0 | 2.5 | 5.0 | Costo cresce con le combinazioni ruolo×azione |
| WP-17 | Invito all'aula via link email con obbligo di iscrizione: generazione, validazione, redirect post-signup | BE, FE | 1.0 | 2.0 | 3.5 | Flusso invariato rispetto a oggi; deep link mobile in WP-42 |
| WP-18 | Schermate aula (web): lista aule, creazione, dettaglio con pannello partecipanti | FE | 1.0 | 2.5 | 4.5 | Schermata composita: la più densa del web |
| WP-19 | Chat testuale realtime con Socket.IO: gateway, stanze, persistenza, riconnessione | BE | 1.5 | 3.0 | 6.0 | Prima implementazione su NestJS+Fastify; serve entrambi i client |
| WP-20 | UI chat testuale in aula (web): lista messaggi, invio, stati di connessione | FE | 1.0 | 2.0 | 3.5 | |
| WP-21 | Audiochat in aula lato backend: token LiveKit, gestione stanze, ingresso/uscita | BE | 1.0 | 2.5 | 6.0 | Condizionato all'esito di WP-14 |
| WP-22 | Audiochat in aula lato web: join, mute, lista parlanti, permessi microfono | FE | 1.0 | 2.5 | 5.0 | Condizionato a WP-14; test cross-browser |
| WP-23 | Upload e listing file in aula (materiali condivisi su R2) — API + UI web | BE, FE | 1.0 | 2.0 | 4.0 | Riusa WP-09; permessi per ruolo d'aula |
| WP-24 | Spike definizione funzionale "Gruppi": comportamento, differenze dalle aule, modello dati | BE | 0.5 | 1.0 | 2.5 | spike — timebox 1 giorno; mai descritti in intervista. Condiziona WP-25, WP-26, WP-41 |
| WP-25 | Entità Gruppo: modello, CRUD, appartenenza, inviti | BE | 1.0 | 2.5 | 5.0 | Condizionato a WP-24; stimato come contenitore di utenti |
| WP-26 | Schermate gruppi (web): lista, dettaglio, gestione membri | FE | 1.0 | 2.0 | 4.0 | Condizionato a WP-24 |
| WP-27 | Impostazioni privacy — modello regole: chi può contattarmi, chi vede i miei contenuti | BE | 1.0 | 2.5 | 5.0 | Insieme finito di regole, nessun motore generico |
| WP-28 | Applicazione delle regole privacy su post, commenti, aule e gruppi | BE | 1.0 | 2.5 | 5.0 | Attraversa tutte le query di lettura: rischio di regressioni |
| WP-29 | Schermata impostazioni privacy e profilo utente (web) | FE | 1.0 | 2.0 | 3.5 | |
| WP-30 | Notifiche push Firebase Cloud Messaging lato backend: registrazione token, invio su eventi chiave | BE | 1.0 | 2.0 | 4.5 | Serve sia web push sia token nativi del client Expo |
| WP-31 | Inserimento snippet PostHog e eventi base web (signup, post creato, join aula) | FE | 0.5 | 1.0 | 2.0 | Strumento non ancora confermato |
| WP-32 | Provisioning server produzione: API, web, Postgres gestito/self-hosted, R2, dominio, TLS | BE | 1.0 | 2.5 | 5.0 | Budget infrastruttura ~10 €/mese come vincolo di progetto |
| WP-33 | Cutover big bang: dismissione progetto Vercel, cancellazione DB MongoDB, pubblicazione nuova release su prome.app | BE | 0.5 | 1.0 | 3.0 | Pochi minuti di downtime accettati, nessun rollback |
| WP-34 | Setup app Expo: progetto, dev client, navigazione, libreria componenti, client API condiviso | Mobile | 1.0 | 2.5 | 5.0 | Fondazione del secondo client; include gestione sessione/token |
| WP-35 | Auth mobile: registrazione, login, OTP, recupero password su schermate native | Mobile | 1.0 | 2.5 | 4.5 | Riusa le API di WP-03; storage sicuro del token |
| WP-36 | Login social nativo Google e Apple su Expo (Sign in with Apple obbligatorio) | Mobile | 1.0 | 2.5 | 6.0 | Config nativa e certificati: dipendenza esterna, alta dispersione |
| WP-37 | Onboarding profilo mobile: nome, cognome, università, corso | Mobile | 0.5 | 1.5 | 3.0 | Stesso gate post-registrazione del web |
| WP-38 | Post su mobile: feed, dettaglio, composer con allegati da galleria/file, commenti | Mobile | 1.5 | 3.5 | 7.0 | Upload diretto su R2 da device; permessi galleria/fotocamera |
| WP-39 | Aule studio su mobile: lista, creazione, dettaglio, partecipanti, chat testuale Socket.IO | Mobile | 1.5 | 3.5 | 7.0 | Gestione riconnessione con app in background |
| WP-40 | Audiochat mobile con SDK LiveKit su Expo: join, mute, parlanti, permessi microfono, audio in background | Mobile | 1.5 | 3.5 | 9.0 | Condizionato a WP-14; SDK nativo su Expo dev client, area più incerta del mobile |
| WP-41 | Gruppi e impostazioni privacy su mobile: schermate lista/dettaglio/membri e pannello privacy | Mobile | 1.0 | 2.5 | 5.0 | Condizionato a WP-24 |
| WP-42 | Push notification native + deep link inviti su iOS e Android | Mobile | 1.0 | 2.5 | 5.5 | Token FCM/APNs, permessi notifica, apertura da link invito |
| WP-43 | Build e pubblicazione store: EAS build, icone/splash, schede store, data safety e privacy label, prima submission iOS e Android | Mobile | 1.0 | 2.5 | 6.0 | Account già attivi e 3 app pubblicate; resta il rischio revisione |

## Uplifts & Invisible Work

Le percentuali qui sotto si applicano al totale della decomposizione (WP-01…WP-43) e coprono il lavoro reale che non compare come fetta verticale. Nessuna di queste voci è stata spalmata dentro i valori a tre punti degli item: B, M e W del workplan sono giorni di costruzione della fetta, con il collaudo dello sviluppatore incluso e nient'altro. Il contesto che governa questi numeri è dichiarato: una sola persona che decide, paga e sviluppa, nessun supporto su design, contenuti o test, nessun cliente esterno da cui attendere approvazioni — e ora due client da portare avanti in parallelo, web e mobile.

| Uplift | % | Rationale |
| --- | --- | --- |
| qa | 22% | Nessun tester dedicato: il collaudo lo fa la stessa persona che scrive il codice, con il rischio di cecità che ne deriva. Il perimetro concentra molte aree difficili da verificare a mano — realtime Socket.IO, audiochat LiveKit con permessi microfono, upload su R2, e soprattutto le regole privacy di WP-28 che attraversano ogni query di lettura e sono la superficie di regressione più ampia del piano. L'inclusione del client mobile alza la quota rispetto a un perimetro solo web: ogni flusso va provato anche su un device iOS e uno Android, con casi propri della piattaforma (permessi, background, riconnessione, deep link) che non hanno equivalente nel browser. Include i test automatici sui flussi critici dichiarati (auth, upload, permessi) e i cicli manuali sul resto. |
| review | 20% | Non esiste revisione tra pari con un team da una persona: questa voce copre il rework, cioè il ritorno sugli item già chiusi quando emergono difetti o quando una scelta iniziale non regge. Il piano ne ha diversi innesti prevedibili: gli spike WP-14, WP-24 e WP-04 producono decisioni che ricadono su item già stimati, i ruoli d'aula (WP-16) e le regole privacy (WP-27/WP-28) sono aree dove le combinazioni si scoprono in corso d'opera, e ogni modifica di comportamento scoperta su un client va riportata sull'altro. Il valore è alto rispetto a un contesto di squadra proprio perché manca il controllo esterno che intercetterebbe prima gli errori. |
| pm | 7% | Nessun coordinamento tra persone, nessuno stakeholder da allineare, nessun rituale: il decisore e l'esecutore coincidono. Resta un costo reale di ordinamento del lavoro su un perimetro di cinque blocchi, due client e 43 item, di ripresa del contesto dopo ogni interruzione — particolarmente pesante con una disponibilità frammentata — di allineamento fra web e mobile sugli stessi flussi, e di decisione sulle incognite ancora aperte (definizione di "utente", conferma PostHog, taglio finale del perimetro). Percentuale bassa e deliberatamente tale. |
| waits | 8% | Non c'è un committente da cui attendere risposte, quindi le attese sono tutte verso terzi tecnici, e il mobile ne aggiunge le più lunghe: revisione App Store e Google Play sulla prima submission (WP-43), generazione di certificati e provisioning profile Apple, configurazione OAuth nativo Google/Apple (WP-05, WP-36), propagazione DNS e rilascio TLS sul dominio prome.app (WP-32), verifica del dominio mittente e uscita dalla sandbox presso il provider email scelto in WP-04, attivazione del progetto Firebase per FCM e APNs. Sono attese bloccanti, perché ciascuna sta a monte di un flusso utente osservabile. |
| release | 12% | Copre il lavoro di messa in esercizio che nessun item verticale contiene: pipeline CI e automazione del deploy, gestione dei segreti, backup e ripristino di Postgres, health check e logging di base, hardening del server e l'onere operativo del nodo LiveKit self-hosted, mai gestito prima. Con il mobile si aggiungono una catena di build separata (EAS), la gestione di versioni e credenziali di firma per due store, i canali di test interni (TestFlight / internal testing) e il ciclo di rilascio delle build successive alla prima. Include la preparazione e le prove del cutover big bang di WP-33: rimozione da Vercel, cancellazione del database e pubblicazione, senza rollback previsto. Nessuna formazione utente da erogare, il prodotto è autoesplicativo e gli utenti sono zero. |
| contingency | 30% | Riserva visibile e separata, non nascosta dentro gli item. Quattro motivi la giustificano. Primo: tre item sono spike a timebox e il lavoro a valle è condizionato al loro esito — LiveKit può rivelare costi o carico operativo incompatibili con l'infrastruttura prevista, e i gruppi non hanno ancora una definizione funzionale, quindi WP-25, WP-26 e WP-41 sono stimati su un'ipotesi. Secondo: diverse tecnologie sono al primo utilizzo per chi le implementa (LiveKit self-hosted e il suo SDK React Native, Cloudflare R2, Better Auth, Socket.IO su NestJS+Fastify), condizione in cui la dispersione degli esiti è strutturalmente più ampia. Terzo: lo sviluppo in parallelo di due client con una sola persona introduce un costo di sincronizzazione e di scoperte tardive che non è imputabile a un singolo item. Quarto: restano domande di perimetro aperte — audiochat dentro o fuori la prima release, riprogettazione dell'invito all'aula, quale client esce per primo — e ognuna può spostare il contenuto della release senza cambiare il numero di blocchi. |

**Nota di lettura.** Il totale che il sistema calcola resta espresso in giorni-persona ideali: non è un calendario. La conversione in date richiede di dividerlo per la capacità effettivamente disponibile, e il solo dato misurato nel brief (~2 ore in 4 settimane) rende quel rapporto il fattore dominante di qualsiasi previsione temporale, molto più di qualunque percentuale in questa tabella. Con web e mobile in parallelo su una sola persona, "parallelo" significa alternanza, non simultaneità: il tempo si somma.

## Estimate

Unit: ideal person-days · Three-point convention: P10 / mode / P90 (σ = (W−B)/2.56) · Computed by the worker from the workplan — the numbers below cannot be edited directly, change the workplan/uplift tables instead.

**Per-item expected effort**

| ID | Item | Role | E | σ | Var% |
| --- | --- | --- | --- | --- | --- |
| WP-01 | Setup repo, monolite modulare NestJS+Fastify, Postgres, migrazioni, config ambienti | BE | 2.2 | 1.2 | 2% |
| WP-02 | Setup app Next.js App Router + libreria componenti pronta, layout e navigazione base | FE | 2.2 | 1.2 | 2% |
| WP-03 | Registrazione e login con Better Auth: email+password, email+OTP | BE | 2.2 | 1.2 | 2% |
| WP-04 | Spike provider email: scelta Brevo vs Resend, invio transazionale OTP/inviti | BE | 1.1 | 0.6 | 0% |
| WP-05 | Login social Google e Apple (config OAuth, callback, collegamento account) | BE | 2.3 | 1.6 | 3% |
| WP-06 | Schermate auth web: registrazione, login, OTP, recupero password | FE | 2.1 | 1 | 1% |
| WP-07 | Onboarding profilo: nome, cognome, università, corso — API + flusso guidato web | BE, FE | 2.1 | 1 | 1% |
| WP-08 | Entità Post: modello, migrazione, CRUD, validazioni, permessi autore | BE | 2.1 | 1 | 1% |
| WP-09 | Upload allegati PDF/immagini su Cloudflare R2: presigned URL, limiti, antivirus/mime check | BE | 2.7 | 1.6 | 3% |
| WP-10 | Composer post con allegati (web): schermata creazione ed editing | FE | 2.1 | 1 | 1% |
| WP-11 | Feed e dettaglio post (web): lista paginata, dettaglio, visualizzazione allegati | FE | 2.1 | 1 | 1% |
| WP-12 | Commenti sotto i post: modello, API, thread piatto, moderazione autore + UI web | BE, FE | 2.2 | 1.2 | 2% |
| WP-13 | Parte pubblica: homepage, privacy policy, pagine informative, SEO base | FE | 2.2 | 1.2 | 2% |
| WP-14 | Spike LiveKit self-hosted: deploy nodo, TURN/STUN, costi, prova a 3-4 utenti web e mobile | BE | 2.8 | 2 | 4% |
| WP-15 | Entità Aula studio: modello, CRUD, pubblica/privata, stati | BE | 2.1 | 1 | 1% |
| WP-16 | Ruoli d'aula: moderatori e partecipanti, join/leave, permessi per azione | BE | 2.7 | 1.6 | 3% |
| WP-17 | Invito all'aula via link email con obbligo di iscrizione: generazione, validazione, redirect post-signup | BE, FE | 2.1 | 1 | 1% |
| WP-18 | Schermate aula (web): lista aule, creazione, dettaglio con pannello partecipanti | FE | 2.6 | 1.4 | 2% |
| WP-19 | Chat testuale realtime con Socket.IO: gateway, stanze, persistenza, riconnessione | BE | 3.3 | 1.8 | 3% |
| WP-20 | UI chat testuale in aula (web): lista messaggi, invio, stati di connessione | FE | 2.1 | 1 | 1% |
| WP-21 | Audiochat in aula lato backend: token LiveKit, gestione stanze, ingresso/uscita | BE | 2.8 | 2 | 4% |
| WP-22 | Audiochat in aula lato web: join, mute, lista parlanti, permessi microfono | FE | 2.7 | 1.6 | 3% |
| WP-23 | Upload e listing file in aula (materiali condivisi su R2) — API + UI web | BE, FE | 2.2 | 1.2 | 2% |
| WP-24 | Spike definizione funzionale "Gruppi": comportamento, differenze dalle aule, modello dati | BE | 1.2 | 0.8 | 1% |
| WP-25 | Entità Gruppo: modello, CRUD, appartenenza, inviti | BE | 2.7 | 1.6 | 3% |
| WP-26 | Schermate gruppi (web): lista, dettaglio, gestione membri | FE | 2.2 | 1.2 | 2% |
| WP-27 | Impostazioni privacy — modello regole: chi può contattarmi, chi vede i miei contenuti | BE | 2.7 | 1.6 | 3% |
| WP-28 | Applicazione delle regole privacy su post, commenti, aule e gruppi | BE | 2.7 | 1.6 | 3% |
| WP-29 | Schermata impostazioni privacy e profilo utente (web) | FE | 2.1 | 1 | 1% |
| WP-30 | Notifiche push Firebase Cloud Messaging lato backend: registrazione token, invio su eventi chiave | BE | 2.3 | 1.4 | 2% |
| WP-31 | Inserimento snippet PostHog e eventi base web (signup, post creato, join aula) | FE | 1.1 | 0.6 | 0% |
| WP-32 | Provisioning server produzione: API, web, Postgres gestito/self-hosted, R2, dominio, TLS | BE | 2.7 | 1.6 | 3% |
| WP-33 | Cutover big bang: dismissione progetto Vercel, cancellazione DB MongoDB, pubblicazione nuova release su prome.app | BE | 1.3 | 1 | 1% |
| WP-34 | Setup app Expo: progetto, dev client, navigazione, libreria componenti, client API condiviso | Mobile | 2.7 | 1.6 | 3% |
| WP-35 | Auth mobile: registrazione, login, OTP, recupero password su schermate native | Mobile | 2.6 | 1.4 | 2% |
| WP-36 | Login social nativo Google e Apple su Expo (Sign in with Apple obbligatorio) | Mobile | 2.8 | 2 | 4% |
| WP-37 | Onboarding profilo mobile: nome, cognome, università, corso | Mobile | 1.6 | 1 | 1% |
| WP-38 | Post su mobile: feed, dettaglio, composer con allegati da galleria/file, commenti | Mobile | 3.8 | 2.1 | 5% |
| WP-39 | Aule studio su mobile: lista, creazione, dettaglio, partecipanti, chat testuale Socket.IO | Mobile | 3.8 | 2.1 | 5% |
| WP-40 | Audiochat mobile con SDK LiveKit su Expo: join, mute, parlanti, permessi microfono, audio in background | Mobile | 4.1 | 2.9 | 9% |
| WP-41 | Gruppi e impostazioni privacy su mobile: schermate lista/dettaglio/membri e pannello privacy | Mobile | 2.7 | 1.6 | 3% |
| WP-42 | Push notification native + deep link inviti su iOS e Android | Mobile | 2.8 | 1.8 | 3% |
| WP-43 | Build e pubblicazione store: EAS build, icone/splash, schede store, data safety e privacy label, prima submission iOS e Android | Mobile | 2.8 | 2 | 4% |

Development total: **E = 102.7** ideal person-days, **σ = 9.5** (deviations added in quadrature).

**Top variance drivers** — where this estimate can explode; negotiate or de-risk these first:

- WP-40 Audiochat mobile con SDK LiveKit su Expo: join, mute, parlanti, permessi microfono, audio in background — 9% of total variance
- WP-38 Post su mobile: feed, dettaglio, composer con allegati da galleria/file, commenti — 5% of total variance
- WP-39 Aule studio su mobile: lista, creazione, dettaglio, partecipanti, chat testuale Socket.IO — 5% of total variance

**Uplift cascade** (invisible work, applied to the development total):

| Uplift | % | Days |
| --- | --- | --- |
| qa | 22% | +22.6 |
| review | 20% | +20.5 |
| pm | 7% | +7.2 |
| waits | 8% | +8.2 |
| release | 12% | +12.3 |
| subtotal | | 173.5 |
| contingency | 30% | +52.1 |
| **total (expected)** | | **225.6** |

**Exposure** — the percentile is a business decision made at the gate, not by the estimator:

| Percentile | Ideal person-days | Reading |
| --- | --- | --- |
| P50 | 225.6 | 50% chance of overrun — never a commitment |
| P80 | 243.3 | reasonable default for a commercial quote |
| P90 | 252.5 | fixed-price contracts, penalties, new clients |

**Role | Days** (expected total, uplifts included):

| Role | Days |
| --- | --- |
| BE | 91.2 |
| FE | 51.1 |
| BE, FE | 18.7 |
| Mobile | 64.8 |
| **Total** | **225.8** |

## Appendice — trace link

| Da | Relazione | A |
|---|---|---|
| documento | derives_from | discovery_brief v1 |
| §workplan | justifies | discovery_brief v1 §scope |

## Appendice — segnali di qualità

| Severità | Regola | Sezione | Messaggio |
|---|---|---|---|
| error | assumptions.keys.canonical | §summary | Planning assumption key "data_migration" is outside the canonical vocabulary — the estimate/architecture comparison only works on shared keys |
| warning | granularity.vertical | §workplan | Diversi item sono strati tecnici e non fette verificabili dall'utente (es. WP-01 setup repo/Postgres, WP-02 setup Next.js, WP-15/WP-25/WP-27 modelli ed entità, WP-21/WP-28 solo backend separati dalla UI). |
