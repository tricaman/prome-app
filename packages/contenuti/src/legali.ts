/**
 * Testo della privacy policy.
 *
 * È in italiano soltanto, e resterà così finché non ci sarà una versione
 * inglese redatta: un documento legale tradotto a macchina è peggio di un
 * documento assente. La pagina lo dichiara a chi naviga in inglese.
 *
 * Le parole su cancellazione e anonimizzazione sono le stesse usate
 * nell'applicazione: se il testo legale e l'interfaccia si contraddicono,
 * quello che resta all'utente è la sfiducia.
 */

/**
 * `attivo` significa «la pagina esiste ed è raggiungibile», non «è la pagina
 * corrente»: quale voce evidenziare lo decide chi disegna la nav, confrontando
 * l'href con la pagina in cui si trova (vedi `NavLegale`). I documenti non
 * ancora redatti puntano alla privacy e restano spenti.
 */
export const DOCUMENTI_LEGALI = [
  { titolo: 'Privacy policy', href: '/privacy', attivo: true },
  { titolo: 'Termini di servizio', href: '/privacy', attivo: false },
  { titolo: 'Cookie policy', href: '/privacy', attivo: false },
  { titolo: 'Linee guida della community', href: '/linee-guida', attivo: true },
] as const;

export const PRIVACY_IN_BREVE = [
  'Raccogliamo il minimo: nome, email dell’ateneo, università e corso.',
  'Non vendiamo i tuoi dati e non li usiamo per profilazione pubblicitaria.',
  'I tuoi appunti restano tuoi: non addestriamo modelli su di essi.',
  'Puoi eliminare l’account dall’app: i contenuti vengono anonimizzati e i dati cancellati entro 30 giorni.',
] as const;

export interface SezioneLegale {
  id: string;
  titolo: string;
  corpo: string;
}

export const PRIVACY_SEZIONI: readonly SezioneLegale[] = [
  {
    id: 'titolare',
    titolo: '1. Chi è il titolare del trattamento',
    corpo:
      'Il titolare è Prome, con sede in Bologna. Puoi contattarci in qualsiasi momento all’indirizzo privacy@prome.app per esercitare i tuoi diritti o chiedere chiarimenti su questo documento.',
  },
  {
    id: 'dati',
    titolo: '2. Quali dati raccogliamo',
    corpo:
      'Dati che ci fornisci al momento della registrazione (nome, cognome, indirizzo email universitario, ateneo e corso di studi), i contenuti che pubblichi (post, commenti, allegati, messaggi nelle aule studio e nei gruppi) e dati tecnici necessari al funzionamento del servizio, come il tipo di dispositivo e i log di accesso. L’audio delle aule studio non viene mai registrato né conservato.',
  },
  {
    id: 'perche',
    titolo: '3. Perché li usiamo',
    corpo:
      'Per erogare il servizio: mostrarti la bacheca del tuo ateneo, farti entrare nelle aule studio, gestire i permessi di Parlare, Scrivere e Caricare, inviarti le notifiche che hai scelto di ricevere. Trattiamo i dati sulla base del contratto con te e, per le comunicazioni facoltative, sulla base del tuo consenso, che puoi revocare in qualsiasi momento dalle impostazioni.',
  },
  {
    id: 'condivisione',
    titolo: '4. Con chi li condividiamo',
    corpo:
      'Solo con i fornitori tecnici necessari al funzionamento della piattaforma (hosting, invio di email transazionali, infrastruttura audio), tutti vincolati da accordi di trattamento dati e localizzati nello Spazio economico europeo. Non condividiamo dati con inserzionisti, broker di dati o piattaforme pubblicitarie.',
  },
  {
    id: 'conservazione',
    titolo: '5. Per quanto tempo li conserviamo',
    corpo:
      'Finché il tuo account è attivo. Quando elimini l’account, il profilo scompare immediatamente, i tuoi post e commenti vengono anonimizzati e attribuiti a “Utente rimosso”, e i dati personali sono rimossi anche dai backup entro 30 giorni. Un materiale che hai caricato in un’aula studio resta invece accessibile a chi studia con te, con il solo nome di chi lo ha caricato reso anonimo: il contributo alla comunità sopravvive, il riferimento alla persona no.',
  },
  {
    id: 'diritti',
    titolo: '6. I tuoi diritti',
    corpo:
      'Puoi accedere ai tuoi dati, correggerli, chiederne la cancellazione o la portabilità, opporti a un trattamento e proporre reclamo al Garante per la protezione dei dati personali. Dall’app trovi la funzione “Scarica i tuoi dati” per ottenere una copia completa in formato leggibile, e “Elimina account” per la cancellazione. Rispondiamo a ogni richiesta entro 30 giorni.',
  },
];

export const EMAIL_PRIVACY = 'privacy@prome.app';

// --- Linee guida della community --------------------------------------------

/**
 * Le regole della casa, nella lingua della casa. Come la privacy policy: solo
 * italiano finché non ci sarà una versione inglese redatta, e le parole sono
 * le stesse dell'applicazione — la schermata di segnalazione promette «entro
 * 24 ore», e la promessa scritta qui è quella che l'operatore mantiene.
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
