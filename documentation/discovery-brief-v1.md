---
artifact: "discovery_brief"
title: "Discovery Brief"
project: "Prome"
client: "Myself"
version: 1
status: "approved"
created_at: "2026-08-08T22:13:19.834Z"
approved_at: "2026-08-08T22:16:17.499Z"
stage: "discovery"
attempt: 1
run_id: "069c86dc-5aea-44db-af22-008d4e9bab53"
version_id: "e5d47a5e-9236-48d9-846a-472690c39759"
generated_by: "documento generato da donumAI — le modifiche si fanno nella pipeline, non in questo file"
---

# Discovery Brief

## Problem

Prome è online su prome.app da circa cinque anni e mezzo e non lo usa nessuno. Il valore di partenza è zero su tutte le grandezze che contano: zero utenti attivi, zero aule studio create, zero sessioni audio, qualche visita e nessun utilizzo reale. I ~15 account registrati arrivano da campagne Instagram e volantinaggio dal vivo, sono tutti inattivi e nessuno di loro ha lasciato un motivo dell'abbandono: il feedback non è mai stato raccolto.

### Gli episodi concreti

- **Il cluster si è spento da solo.** MongoDB Atlas ha disattivato il cluster per inattività prolungata, cancellando i dati. Il fondatore l'ha ricreato ripartendo con meno dati. È l'evidenza più netta che il sistema non era usato da nessuno, nemmeno dal suo autore.
- **L'ultimo intervento risale a circa due anni fa**: miglioramento dei testi e della SEO dell'app web, circa una giornata di lavoro, nessun effetto sull'adozione. Dopo il lancio ci sono stati solo piccoli fix, nessuna nuova funzionalità.
- **Il ripasso avviene altrove.** Il fondatore e i suoi amici si organizzano su Telegram e soprattutto Discord: ognuno carica i propri materiali (PDF, MD, immagini) al momento del bisogno, e li ritrova scorrendo la sezione "file" di Telegram o la cronologia della chat. Organizzazione giudicata inadeguata rispetto all'importanza di quei materiali. Questo è l'unico comportamento reale osservato, e avviene fuori da Prome.

### Il percorso attuale sul sistema

Atterraggio su prome.app → CTA login → creazione nuova aula studio → invito amici tramite link inviato via email → dettaglio aula → interazione. L'invitato deve iscriversi per poter entrare: attrito che oggi non è mai stato messo alla prova su volumi reali.

### Cosa è costato finora

| Voce | Valore |
| --- | --- |
| Ore per la prima versione | ~700-900 (da junior, senza agenti AI, studiando in parallelo) |
| Infrastruttura | 0 €/mese (Vercel piano free, S3 sotto soglia di addebito) |
| Manutenzione negli ultimi anni | 0 ore |
| Spesa storica in advertising | mai quantificata |

Il costo non è in denaro: è in tempo già investito e in un asset fermo.

### Perché non si può tenere il sistema attuale

Il limite dichiarato **non è architetturale**: le API REST sono già separate e riusabili, e un client React Native potrebbe consumarle così come sono. Il limite è di **manutenibilità rispetto alle energie disponibili**: Next.js 12, versione di Node e librerie ferme a 5/6 anni fa, con documentazioni delle stesse librerie ormai divergenti dalle versioni installate; codice poco modulare, che rende costoso rimuovere le integrazioni da abbandonare (Twilio, 100ms).

Da segnalare con onestà: nessun tentativo recente di `install`/`build` è stato dichiarato, il repo non viene aperto da circa due anni e nessun blocco tecnico specifico ha impedito uno sviluppo. La decisione di rifare da zero nasce dallo stack e dalle energie, non da un fallimento tecnico documentato.

### Perché adesso

Nessun evento esterno: nessun servizio dismesso, nessuna fattura, nessun blocco store. Il driver dichiarato è la maturità professionale raggiunta dal fondatore — oggi più veloce e affidabile rispetto a cinque anni e mezzo fa, quando era troppo junior per tenere conto di aspetti di prodotto e business.

### Successo misurabile

| Metrica | Valore attuale | Obiettivo | Scadenza |
| --- | --- | --- | --- |
| Numero di utenti | 0 (zero attivi, zero aule, zero sessioni) | ~100 | novembre |

### Attenzione: il problema non è (solo) tecnico

La versione online aveva già l'essenziale funzionante — post, commenti, aule studio, chat testuale, audiochat, upload file — e non ha trattenuto nessuno. Riscrivere lo stack rimuove un ostacolo di manutenibilità, ma non è di per sé la causa dell'adozione nulla. L'obiettivo dei 100 utenti a novembre resta oggi l'unico numero **senza un piano di acquisizione definito**: i canali sono stati scelti (Google, Instagram, TikTok) ma non validati, con budget e resa non definiti.

## Assumptions

Il rifacimento poggia su alcune convinzioni non ancora verificate. Sono elencate qui perché, se una cade, cambia il piano — non perché siano state validate durante l'intervista.

### Vincoli reali

| Vincolo | Valore dichiarato | Nota |
| --- | --- | --- |
| Budget infrastruttura | ~10 €/mese di server + Cloudflare R2 per i file | Vercel non è più utilizzabile perché il backend è NestJS |
| Tempo disponibile | ~2 ore nelle ultime 4 settimane | Unico dato passato disponibile, non un'intenzione |
| Scadenza | ~100 utenti entro novembre | Nessun piano di acquisizione definito |
| Persone | Solo il fondatore: decide, paga e sviluppa | Nessun supporto su design, contenuti o test |

Il budget in denaro non è il vincolo: l'infrastruttura oggi costa 0 € e domani circa 10 €/mese. Il vincolo è il tempo, e il solo dato misurato — 2 ore in 4 settimane — è di due ordini di grandezza sotto le ~700-900 ore spese per la prima versione.

### Integrazioni: eredita, abbandona, nuova

| Ambito | Oggi | Nuova versione | Stato |
| --- | --- | --- | --- |
| Audiochat | 100ms | LiveKit self-hosted | abbandona → nuova |
| SMS/comunicazioni | Twilio | — | abbandona |
| Storage file | AWS S3 | Cloudflare R2 | sostituisce |
| Notifiche push | Firebase | Firebase Cloud Messaging, piano gratuito | eredita |
| Analytics | PostHog | PostHog | non confermata |
| Email | — | Brevo e/o Resend (eventualmente entrambi) | nuova, scelta aperta |
| Autenticazione | — | Better Auth (Google, Apple, email+password, email+OTP) | nuova |
| Chat testuale | Next.js monolite | Socket.IO | nuova |
| Database | MongoDB | Postgres | sostituisce |

Stack applicativo: NestJS + Fastify per il backend, Next.js App Router (React) per il web, React Native con Expo per il mobile.

### Accesso al sistema esistente

Accesso pieno: il repo è clonabile, le API REST sono già separate e riusabili, l'autore del sistema è il fondatore stesso e non c'è nessun fornitore terzo da coinvolgere. Due riserve fattuali: l'avvio in locale non è più verificato (Node e librerie di 5-6 anni fa, nessun `install`/`build` recente dichiarato) e il cluster MongoDB Atlas è quello ricreato dopo la cancellazione dei dati. Nulla da migrare: decine di record e pochi file, tutti da buttare.

### Assunzioni da mettere alla prova

1. **Che uno stack nuovo produca adozione.** La versione online aveva già post, commenti, aule studio, chat testuale, audiochat e upload file funzionanti, e non ha trattenuto nessuno dei ~15 iscritti. Nessun elemento raccolto lega l'obsolescenza tecnica all'utilizzo nullo.
2. **Che i corsi con sessioni ripetute siano la funzione mancante.** È l'unica novità di prodotto rilevante, decisa senza alcun feedback da utenti reali: nessuno dei 15 iscritti è stato intervistato, nessun test è stato fatto con studenti al di fuori del giro di amici.
3. **Che ~2 ore in 4 settimane bastino** per portare online parte pubblica, post, aule studio, impostazioni privacy e gruppi, e in più fare acquisizione, entro novembre.
4. **Che il bisogno osservato su Discord/Telegram si traduca in uso di Prome.** L'evidenza raccolta è che i materiali vengono caricati al momento e ritrovati male; non che gli studenti siano disposti a spostarsi su una piattaforma dedicata.
5. **Che le campagne su Google/Instagram/TikTok portino ~100 utenti attivi.** Il canale precedente (Instagram + volantinaggio) ha prodotto 15 iscritti poi tutti persi, con spesa mai quantificata.

### Rischi

**Ridimensionati da fatti concreti:**

- *Rifiuto o attrito sugli store*: escluso. Account Apple Developer e Google Play Console attivi, 3 app personali pubblicate e molte altre per lavoro.
- *Abbandono del progetto a metà*: ridimensionato. 4 progetti personali portati in produzione negli ultimi 6 mesi, nessuno lasciato incompiuto.

**Residui, non mitigati:**

- **Tempo disponibile minimo** (~2 ore in 4 settimane) contro l'obiettivo dei 100 utenti a novembre.
- **Adozione nulla nonostante un prodotto funzionante**: Prome è fermo da 2 anni con l'essenziale già online. È il rischio dominante e nessuna delle scelte tecniche lo affronta.
- **LiveKit self-hosted mai gestito prima**: nessuna esperienza in produzione, costi server e onere di manutenzione ignoti, su un budget di ~10 €/mese.

### Incognite dichiarate aperte

- Costi server e carico di manutenzione di LiveKit self-hosted (prima volta per il fondatore).
- Resa delle campagne su Google/Instagram/TikTok: canali scelti, budget e ritorno non definiti né validati.
- Spesa storica in advertising per i ~15 iscritti: mai quantificata, quindi nessun costo per utente di riferimento.
- Scelta finale del provider email tra Brevo e Resend.
- Conferma di PostHog come strumento di analytics.
- Come si misurano i "100 utenti": registrati, attivi o ricorrenti — la definizione non è stata fissata.

## Scope

Il perimetro è definito dal fondatore come prima release da pubblicare su prome.app. Il sistema oggi in produzione è **contesto**, non specifica: post e aule studio esistenti servono da riferimento funzionale, tutto il resto è deciso ex novo.

### Dentro la prima release

| Blocco | Contenuto |
| --- | --- |
| Parte pubblica | Homepage, privacy policy e pagine informative |
| Post | Creazione post completa, con commenti e allegati PDF/immagini |
| Aule studio | Creazione e gestione complete: moderatori, partecipanti, chat testuale, audiochat, upload file |
| Impostazioni privacy | Complete: chi può contattare l'utente e chi può vedere i suoi contenuti |
| Gruppi | Inclusi nella prima release |

### Fetta minima autonoma

Il flusso più piccolo che sta in piedi da solo e può essere messo online per primo, anche mentre il vecchio prome.app è ancora su Vercel:

**Registrazione (Better Auth) → onboarding (nome, cognome, università, corso) → creazione di un post con allegato.**

È la fetta che il fondatore farebbe provare ai suoi amici di Discord la settimana successiva. Aule studio, impostazioni privacy e gruppi arrivano dopo. L'onboarding non era emerso prima della fase di perimetro ed è considerato parte non negoziabile della base.

### Linea di parità

**Deve comportarsi come prima (livello funzionale):**

- **Post**: post classici con commenti sotto e caricamento di file PDF e immagini.
- **Aule studio**: moderatori, partecipanti, chat testuale e chat audio; aule pubbliche o private su invito.

**Cambia deliberatamente:**

- **Modulo tecnico dell'audiochat**: da 100ms a LiveKit self-hosted. È l'unico cambiamento dichiarato sulla parità funzionale.
- **Stack sottostante**: NestJS + Fastify, Next.js App Router, React Native con Expo, Postgres al posto di MongoDB, Cloudflare R2 al posto di S3, Better Auth per l'accesso, Socket.IO per la chat testuale. Invisibile all'utente, ma è il motivo del rifacimento.

### Fuori dalla prima release

- **Corsi con sessioni ripetute** (materiale + sessioni multiple per corso): rinviati esplicitamente a dopo, benché siano la principale novità di prodotto.
- **Eventi** e **board**: rinviati in via eventuale, non pianificati.
- Qualsiasi funzione di monetizzazione: la piattaforma resta gratuita e senza modello di ricavo.

### Cosa viene lasciato indietro

- **Twilio** e **100ms**: abbandonati, nessuna sostituzione per Twilio.
- **MongoDB**: il database vecchio viene buttato via.
- **I ~15 account e i loro dati**: cancellati, senza migrazione né avviso dichiarato.
- **I file su S3**: pochi, nulla da portare avanti; si riparte con storage pulito.
- **Il repo Next.js 12**: non viene migrato; le API REST esistenti sono riusabili come riferimento ma non vengono riprese in produzione.

Sopravvive **solo il dominio prome.app**, di proprietà del fondatore. Nessun obbligo normativo, contrattuale o fiscale, nessun output o numerazione da preservare.

### Cutover e coesistenza

Passaggio **big bang sullo stesso dominio**: eliminazione del vecchio progetto da Vercel, cancellazione del database, pubblicazione del nuovo. Nessuna coesistenza, nessun sottodominio beta, nessuna finestra di doppio esercizio. Sono accettati **pochi minuti di downtime** e non c'è nessun lavoro in corso da migrare, perché non esiste utilizzo reale da preservare.

### Nota sul perimetro

Cinque blocchi (parte pubblica, post, aule studio, privacy, gruppi) sono molto per una persona sola con ~2 ore di disponibilità misurate nelle ultime 4 settimane, contro una scadenza di novembre. La fetta minima registrazione + onboarding + post è la sola porzione dichiaratamente pubblicabile da sola: usarla come primo rilascio reale — e non come tappa interna — è la scelta più coerente con il tempo disponibile.

### Domande aperte sul perimetro

- L'audiochat con LiveKit è dentro la prima release delle aule studio o può essere posticipata? La parità funzionale la include, ma LiveKit self-hosted è la componente più incerta per costi ed esperienza.
- I "gruppi" non sono stati descritti in dettaglio durante l'intervista: manca la definizione di cosa fanno e in cosa differiscono dalle aule studio.
- L'app mobile Expo fa parte della prima release o segue il web? Lo stack la prevede, il taglio del perimetro non la nomina.
- L'invito all'aula resta solo via link email con obbligo di iscrizione per entrare, oppure viene riprogettato? Non è stato dichiarato tra le cose che cambiano.

## Appendice — segnali di qualità

| Severità | Regola | Sezione | Messaggio |
|---|---|---|---|
| warning | scope.out.explicit | §scope | Scope does not state what is explicitly OUT of scope |
