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

export const DOCUMENTI_LEGALI = [
  { titolo: 'Privacy policy', href: '/privacy', attivo: true },
  { titolo: 'Termini di servizio', href: '/privacy', attivo: false },
  { titolo: 'Cookie policy', href: '/privacy', attivo: false },
  { titolo: 'Linee guida della community', href: '/privacy', attivo: false },
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
