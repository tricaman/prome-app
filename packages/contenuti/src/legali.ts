/**
 * I documenti legali di Prome: privacy, termini, cookie, linee guida.
 *
 * Sono in italiano soltanto, e resteranno così finché non ci sarà una versione
 * inglese redatta: un documento legale tradotto a macchina è peggio di un
 * documento assente. Le pagine lo dichiarano a chi naviga in inglese.
 *
 * **Regola di questi testi: descrivono Prome com'è oggi, non come sarà.** Le
 * parole su cancellazione, anonimizzazione, segnalazione e blocco sono le
 * stesse usate nell'applicazione, e ciò che non esiste ancora — l'audio nelle
 * aule, la consegna delle notifiche, uno strumento di misurazione — è scritto
 * come mancante invece di essere promesso al futuro. Se il testo legale e il
 * prodotto si contraddicono, quello che resta all'utente è la sfiducia.
 */

/**
 * `attivo` significa «la pagina esiste ed è raggiungibile», non «è la pagina
 * corrente»: quale voce evidenziare lo decide chi disegna la nav, confrontando
 * l'href con la pagina in cui si trova (vedi `NavLegale`).
 */
export const DOCUMENTI_LEGALI = [
  { titolo: 'Privacy policy', href: '/privacy', attivo: true },
  { titolo: 'Termini di servizio', href: '/termini', attivo: true },
  { titolo: 'Cookie policy', href: '/cookie', attivo: true },
  { titolo: 'Linee guida della community', href: '/linee-guida', attivo: true },
] as const;

/**
 * Chi risponde: una persona sola, lo stesso indirizzo per ogni documento.
 *
 * Non è un indirizzo su `prome.app` di proposito: l'`MX` del dominio punta
 * alla macchina, che non ha un server di posta, quindi una casella lì
 * accetterebbe richieste di accesso e cancellazione e le perderebbe. Un
 * indirizzo che riceve davvero vale più di uno che sta bene sulla pagina.
 */
export const EMAIL_PRIVACY = 'trica.assistance.apps@gmail.com';

export interface SezioneLegale {
  id: string;
  titolo: string;
  corpo: string;
}

// --- Privacy policy ----------------------------------------------------------

export const PRIVACY_IN_BREVE = [
  'Per entrare serve solo un indirizzo email: nessuna password, nessun accesso con Google o Facebook.',
  'Non vendiamo i tuoi dati, non profiliamo per la pubblicità e non addestriamo modelli sui tuoi appunti.',
  'Nessuno strumento di statistiche di terze parti è attivo sul sito né nell’app.',
  'Server e backup stanno in Unione europea, in Germania.',
  'Puoi scaricare tutti i tuoi dati e cancellare l’account dall’app, in autonomia.',
] as const;

export const PRIVACY_SEZIONI: readonly SezioneLegale[] = [
  {
    id: 'titolare',
    titolo: '1. Chi è il titolare del trattamento',
    corpo:
      'Prome è un progetto indipendente di Marius Trica, con sede a Brescia. Non c’è una società dietro e non c’è un team: chi decide cosa fare dei tuoi dati e chi scrive il codice che li tratta sono la stessa persona. Puoi scrivere in qualsiasi momento a trica.assistance.apps@gmail.com per esercitare i tuoi diritti o per chiedere chiarimenti su questo documento.',
  },
  {
    id: 'dati',
    titolo: '2. Quali dati raccogliamo',
    corpo:
      'Per entrare serve un solo dato: il tuo indirizzo email, a cui mandiamo un codice a sei cifre. Non c’è una password, quindi non ne conserviamo nessuna, e non esiste accesso tramite Google, Apple o altri servizi.\n\nAl primo accesso ti chiediamo nome, cognome, ateneo e corso di studi: l’ateneo non è un dato anagrafico qualsiasi, decide chi vede i tuoi contenuti e a quali aule sei ammesso, e per questo resta sempre correggibile da «Modifica profilo».\n\nPoi ci sono i contenuti che pubblichi — post, commenti, allegati, messaggi e materiali nelle aule studio — le tue impostazioni di privacy e di notifica, le eventuali segnalazioni che invii e le persone che blocchi, e i dati tecnici minimi necessari a far funzionare il servizio, come i log di accesso e degli errori.\n\nLe aule studio oggi sono testuali: non esiste una funzione audio, quindi non c’è alcuna voce da registrare o conservare.',
  },
  {
    id: 'perche',
    titolo: '3. Perché li usiamo, e su quale base',
    corpo:
      'Per erogare il servizio che ti abbiamo promesso: mostrarti la bacheca del tuo ateneo, farti entrare nelle aule studio e nei gruppi, gestire i permessi di Parlare, Scrivere e Caricare, mandarti l’email con il codice di accesso e quelle di invito. La base giuridica è il contratto con te (art. 6.1.b GDPR).\n\nPer tenere in piedi e in sicurezza la piattaforma — log tecnici, backup, difesa da abusi e trattamento delle segnalazioni — la base è il legittimo interesse (art. 6.1.f), che non prevale mai sul contenuto delle tue conversazioni: le segnalazioni le leggiamo, la bacheca no.\n\nNon esiste alcun trattamento a fini pubblicitari o di profilazione, e i tuoi contenuti non vengono usati per addestrare modelli di intelligenza artificiale, né da noi né da terzi.',
  },
  {
    id: 'condivisione',
    titolo: '4. Con chi li condividiamo',
    corpo:
      'Con due soli fornitori, entrambi nell’Unione europea e vincolati da un accordo sul trattamento dei dati: Hetzner, che ospita il server e il database a Norimberga, in Germania; e Brevo, che recapita le email transazionali — il codice di accesso e gli inviti. I file che carichi non escono da quel server: stanno su un volume della stessa macchina.\n\nNon c’è nessun altro. Nessuno strumento di statistiche o di misurazione di terze parti è attivo: gli eventi d’uso che il codice prevede — cinque, senza alcun dato personale oltre a un identificativo interno — non vengono inviati a nessun fornitore, perché nessuno è stato scelto. Nessun inserzionista, nessun broker di dati, nessun trasferimento fuori dallo Spazio economico europeo.\n\nAnche le notifiche push seguono la stessa regola: la piattaforma sa quando avvisarti, ma non c’è ancora un fornitore che consegni gli avvisi, quindi al momento non ne parte nessuno.',
  },
  {
    id: 'conservazione',
    titolo: '5. Dove stanno e per quanto tempo',
    corpo:
      'I dati restano finché il tuo account è attivo. I backup del database sono giornalieri e se ne conservano quattordici, quindi una copia di ciò che è stato eliminato può sopravvivere al più due settimane prima di uscire anche dalla rotazione.\n\nI codici di accesso durano pochi minuti e vengono cancellati poco dopo la scadenza: non restano indirizzi email in giro per il database in attesa di essere puliti. Le segnalazioni si conservano perché sono la memoria della moderazione; l’estratto del contenuto segnalato viaggia solo dentro l’email che ci avvisa e non viene mai salvato.',
  },
  {
    id: 'cancellazione',
    titolo: '6. Cosa succede quando elimini l’account',
    corpo:
      'La cancellazione si chiede dall’app e apre quattordici giorni di grazia: le sessioni vengono revocate subito e il profilo scompare subito, ma se rientri entro quel termine la richiesta si annulla e ritrovi tutto — te lo diciamo a schermo quando succede. Passati i quattordici giorni la cancellazione è definitiva.\n\nA quel punto profilo e account vengono eliminati, mentre post e commenti restano come «Utente rimosso», anonimizzati con un identificativo diverso per ogni contenuto: non esiste una tabella che permetta di ricollegarli fra loro o a te. Un materiale che hai caricato in un’aula resta accessibile a chi studiava con te, con il nome di chi lo ha portato reso anonimo: il contributo alla comunità sopravvive, il riferimento alla persona no.\n\nAl termine della catena il sistema verifica da sé che non sia rimasto nulla — zero record e zero file su ogni archivio censito — e conserva l’esito della verifica. Se un ripristino da backup dovesse riportare indietro qualcosa, la cancellazione viene riapplicata da sola.',
  },
  {
    id: 'diritti',
    titolo: '7. I tuoi diritti',
    corpo:
      'Puoi accedere ai tuoi dati, correggerli, chiederne la cancellazione o la portabilità, opporti a un trattamento e proporre reclamo al Garante per la protezione dei dati personali.\n\nDue di questi diritti non richiedono di scrivere a nessuno: «Scarica i tuoi dati», dall’app e dal sito, produce una copia completa e leggibile di tutto ciò che ti riguarda, e «Elimina account» avvia la cancellazione descritta sopra. Nome, cognome, ateneo e corso si correggono da «Modifica profilo». Per tutto il resto scrivi a trica.assistance.apps@gmail.com: rispondiamo entro trenta giorni, come prevede il GDPR.',
  },
  {
    id: 'sicurezza',
    titolo: '8. Sicurezza e minori',
    corpo:
      'Il traffico verso il sito e verso l’API è cifrato, l’accesso avviene con un codice a scadenza breve e la sessione si può revocare uscendo, da qualunque dispositivo. Non conserviamo password perché non ne esistono.\n\nProme è pensato per studenti universitari e non è destinato a minori di 16 anni. Se ci accorgiamo che un account appartiene a una persona più giovane, lo eliminiamo.',
  },
  {
    id: 'modifiche',
    titolo: '9. Modifiche a questo documento',
    corpo:
      'Prome è in costruzione e cambia spesso: quando cambia qualcosa che riguarda i tuoi dati, questo documento cambia con esso e la data in cima viene aggiornata. Se la modifica è rilevante — un fornitore nuovo, una finalità nuova — te lo diciamo per email prima che abbia effetto.',
  },
];

// --- Termini di servizio -----------------------------------------------------

export const TERMINI_IN_BREVE = [
  'Prome è gratis per gli studenti e non ha pubblicità.',
  'Quello che pubblichi resta tuo: ci autorizzi solo a mostrarlo dentro Prome.',
  'È un progetto indipendente in costruzione: le funzioni possono cambiare e il servizio può fermarsi.',
  'Chi rende il posto ostile viene rimosso: le regole sono nelle linee guida della community.',
] as const;

export const TERMINI_SEZIONI: readonly SezioneLegale[] = [
  {
    id: 'chi-offre',
    titolo: '1. Chi offre il servizio',
    corpo:
      'Prome è offerto da Marius Trica, con sede a Brescia, come progetto indipendente: non c’è una società, non c’è un team, e chi legge queste righe sta leggendo le condizioni scritte dalla stessa persona che sviluppa la piattaforma. Usando Prome accetti questi termini; se non li accetti, non usarlo.',
  },
  {
    id: 'cosa-e',
    titolo: '2. Cos’è Prome, e cosa non è',
    corpo:
      'Prome è una piattaforma di studio per universitari: una bacheca legata al tuo ateneo, aule studio con materiali condivisi e chat in tempo reale, gruppi che restano nel tempo. Serve a studiare insieme.\n\nNon è un archivio: i file che carichi stanno qui per essere condivisi con chi studia con te, non per essere conservati al posto tuo. Tieni sempre una copia di ciò a cui tieni. Non è nemmeno un servizio di comunicazione riservata: i messaggi delle aule sono leggibili da chi è nell’aula e non sono cifrati da un capo all’altro.',
  },
  {
    id: 'account',
    titolo: '3. L’account',
    corpo:
      'Serve un indirizzo email valido e avere almeno 16 anni. L’account è personale: la casella di posta è la tua chiave d’ingresso, perché chi riceve il codice entra — proteggila di conseguenza e avvisaci se pensi che qualcuno ci sia arrivato.\n\nUn account per persona, con dati veri: nome, cognome, ateneo e corso non sono decorazioni, decidono cosa vedi e chi vede te. Puoi correggerli quando vuoi.',
  },
  {
    id: 'contenuti',
    titolo: '4. I tuoi contenuti restano tuoi',
    corpo:
      'Quello che pubblichi — post, commenti, appunti, materiali — resta tuo. Ci concedi soltanto il permesso, non esclusivo e revocabile chiudendo l’account, di conservarlo e mostrarlo dentro Prome alle persone a cui l’hai destinato: è ciò che serve tecnicamente a far funzionare il servizio, e niente di più.\n\nNon vendiamo i tuoi contenuti, non li mostriamo fuori da Prome — il sito pubblico non espone nessun contenuto degli utenti, nemmeno quelli di un’aula «pubblica», che significa aperta agli iscritti e non al web — e non li usiamo per addestrare modelli di intelligenza artificiale.\n\nCarica solo ciò che hai il diritto di condividere. Le dispense e i libri protetti da copyright non lo sono, e caricarli è un problema tuo prima che nostro.',
  },
  {
    id: 'condotta',
    titolo: '5. Come ci si comporta',
    corpo:
      'Le regole della casa sono nelle linee guida della community e valgono come parte di questi termini: niente molestie, niente spam, niente contenuti sessualmente espliciti, violenti o discriminatori, niente dati personali di altri senza il loro consenso, niente materiale illegale.\n\nOgni post e ogni commento ha un’azione «Segnala», e puoi bloccare chiunque. Le segnalazioni le guardiamo entro 24 ore: se il contenuto viola le regole lo rimuoviamo, e chi le viola in modo grave o ripetuto perde l’account. Non ci sono eccezioni per nessuno, e non è previsto un appello formale: è un progetto di una persona sola, ma se pensi che ci sia stato un errore puoi scrivere e lo riguardiamo.',
  },
  {
    id: 'disponibilita',
    titolo: '6. Disponibilità del servizio',
    corpo:
      'Prome è gratuito e viene offerto «così com’è», senza garanzia di continuità. È un progetto indipendente in costruzione: le funzioni possono cambiare, essere aggiunte o sparire, il servizio può essere interrotto per manutenzione e in casi estremi può chiudere. Se dovesse chiudere, ti avviseremo per email con un preavviso ragionevole e potrai scaricare i tuoi dati prima che accada.\n\nAlcune cose non ci sono ancora e non vanno date per acquisite: l’audio nelle aule studio non esiste, e le notifiche push si possono configurare ma non vengono ancora recapitate. Quando esisteranno, saranno annunciate.',
  },
  {
    id: 'chiudere',
    titolo: '7. Chiudere l’account',
    corpo:
      'Puoi andartene quando vuoi, dall’app, senza scrivere a nessuno: «Elimina account» apre quattordici giorni durante i quali un nuovo accesso annulla la richiesta, poi la cancellazione è definitiva. Cosa resta e cosa sparisce è descritto nella privacy policy.\n\nPossiamo sospendere o chiudere un account che violi questi termini o le linee guida, e nei casi gravi farlo senza preavviso.',
  },
  {
    id: 'responsabilita',
    titolo: '8. Responsabilità',
    corpo:
      'I contenuti pubblicati su Prome sono di chi li pubblica: appunti, riassunti e risposte di altri studenti possono essere sbagliati, e non li verifichiamo. Studiare su un materiale trovato qui è una tua scelta.\n\nNei limiti consentiti dalla legge, e trattandosi di un servizio gratuito, non rispondiamo dei danni indiretti derivanti dall’uso o dall’indisponibilità del servizio, né della perdita di contenuti caricati. Nulla in questi termini limita le responsabilità che la legge non consente di escludere, né i diritti che ti spettano come consumatore.',
  },
  {
    id: 'modifiche',
    titolo: '9. Modifiche e legge applicabile',
    corpo:
      'Questi termini possono cambiare: la data in cima dice da quando vale la versione che stai leggendo, e le modifiche rilevanti vengono comunicate per email prima di avere effetto. Continuare a usare Prome dopo una modifica significa accettarla; se non la accetti, puoi chiudere l’account.\n\nSi applica la legge italiana. Se sei un consumatore, resta competente il giudice del luogo in cui risiedi o hai domicilio.',
  },
];

// --- Cookie policy -----------------------------------------------------------

export const COOKIE_IN_BREVE = [
  'Un solo cookie, e serve a ricordare in che lingua vuoi il sito.',
  'Nessun cookie di profilazione, di pubblicità o di statistiche.',
  'Nessun cookie di terze parti: nessuno può seguirti da qui a un altro sito.',
  'Per questo non trovi un banner che ti chiede il consenso: non c’è nulla da consentire.',
] as const;

export const COOKIE_SEZIONI: readonly SezioneLegale[] = [
  {
    id: 'quali',
    titolo: '1. Quali cookie usiamo',
    corpo:
      'Uno solo, e si chiama «PROME_LINGUA». Conserva la lingua che hai scelto con il selettore in alto — italiano o inglese — e dura un anno, così alla visita successiva il sito si apre nella lingua giusta invece che in quella indovinata dal browser. Se non lo scegli, il cookie non viene nemmeno scritto.',
  },
  {
    id: 'cosa-non-ce',
    titolo: '2. Cosa non c’è',
    corpo:
      'Non ci sono cookie di profilazione, pubblicitari o di statistiche, né nostri né di nessun altro. Non c’è Google Analytics, non ci sono pixel di Meta, non ci sono pulsanti social che caricano codice esterno. Nessun dominio di terze parti riceve una richiesta dalle nostre pagine: non c’è modo, da qui, di essere seguiti altrove.',
  },
  {
    id: 'archivio',
    titolo: '3. Quello che il browser conserva senza cookie',
    corpo:
      'Due cose stanno nell’archivio locale del browser, che non è un cookie e non viene mai spedito al server: la tua preferenza di tema — chiaro, scuro o come il sistema — e il tuo token di sessione, cioè ciò che ti tiene dentro dopo l’accesso. Il token è tecnico e necessario: senza, ogni ricarica della pagina ti butterebbe fuori. Esce di lì appena premi «Esci».',
  },
  {
    id: 'consenso',
    titolo: '4. Perché non c’è un banner',
    corpo:
      'La legge chiede il consenso per i cookie non tecnici — quelli che misurano, profilano o seguono. Qui non ce n’è nessuno, e il solo cookie presente serve a ricordare una tua scelta esplicita, quindi non c’è niente da consentire e nessun banner da chiudere. Se un giorno servisse uno strumento di misurazione, il banner arriverebbe prima di lui, e questo documento lo direbbe.',
  },
  {
    id: 'gestire',
    titolo: '5. Come cancellarli',
    corpo:
      'Dalle impostazioni del browser puoi eliminare cookie e archivio locale di prome.app in qualunque momento. Perderai la lingua scelta, il tema scelto e la sessione: dovrai rientrare con un codice, e nient’altro succederà.',
  },
];

// --- Linee guida della community --------------------------------------------

/**
 * Le regole della casa, nella lingua della casa. Le parole sono le stesse
 * dell'applicazione — la schermata di segnalazione promette «entro 24 ore», e
 * la promessa scritta qui è quella che l'operatore mantiene.
 */
export const LINEE_GUIDA_IN_BREVE = [
  'Prome è per studiare insieme: rispetto per le persone, sempre.',
  'Niente spam, molestie o contenuti che non c’entrano con lo studio.',
  'Puoi segnalare qualunque post o commento: lo guardiamo entro 24 ore.',
  'Puoi bloccare chiunque: non vedrete più i contenuti l’uno dell’altro.',
] as const;

export const LINEE_GUIDA_SEZIONI: readonly SezioneLegale[] = [
  {
    id: 'spirito',
    titolo: '1. Lo spirito del posto',
    corpo:
      'Prome esiste per studiare insieme: aule, gruppi e bacheca servono a scambiarsi materiali, domande e risposte. Tutto ciò che aiuta a studiare è benvenuto; tutto ciò che rende il posto ostile non lo è. Verso i contenuti che violano queste regole applichiamo una tolleranza zero.',
  },
  {
    id: 'vietato',
    titolo: '2. Cosa non è ammesso',
    corpo:
      'Molestie, insulti o attacchi personali verso altri studenti. Spam e pubblicità, inclusa la vendita insistente di materiali o servizi. Contenuti sessualmente espliciti, violenti o discriminatori. Condivisione di dati personali altrui senza consenso. Contenuti illegali, incluso materiale protetto da copyright caricato senza averne diritto.',
  },
  {
    id: 'segnalare',
    titolo: '3. Come segnalare un contenuto',
    corpo:
      'Ogni post e ogni commento ha un’azione «Segnala», con un motivo da scegliere. La segnalazione arriva direttamente a chi gestisce Prome: la guardiamo entro 24 ore e, se il contenuto viola queste regole, lo rimuoviamo ed espelliamo i responsabili. Chi segnala non viene mai rivelato all’autore del contenuto.',
  },
  {
    id: 'bloccare',
    titolo: '4. Bloccare una persona',
    corpo:
      'Da un suo post o commento puoi bloccare chiunque: da quel momento non vedrete più i contenuti l’uno dell’altro in bacheca, e i suoi inviti non ti manderanno notifiche. Nelle aule studio e nei gruppi che già condividete restano l’uscita e la moderazione dello spazio. L’elenco delle persone bloccate è nelle Impostazioni, e da lì puoi sempre tornare indietro.',
  },
  {
    id: 'conseguenze',
    titolo: '5. Cosa succede a chi viola le regole',
    corpo:
      'I contenuti segnalati che violano queste regole vengono rimossi entro 24 ore dalla segnalazione. In caso di violazioni gravi o ripetute l’account viene sospeso o eliminato. Non esistono eccezioni per nessuno.',
  },
  {
    id: 'contatti',
    titolo: '6. Contatti',
    corpo:
      'Per qualunque dubbio su queste linee guida o per segnalazioni che non riguardano un singolo contenuto puoi scriverci: i contatti sono nella pagina «Chi siamo» e nella privacy policy.',
  },
] as const;
