/**
 * Quello che il disegno prevede e il prodotto non ha ancora.
 *
 * Stanno tutti qui e non sparsi nelle schermate per una ragione sola: questo
 * file **è** l'elenco del debito. `rg SEGNAPOSTO_ apps/mobile/src` lo conta in
 * un comando, e quando l'endpoint arriva si cancella la riga da qui e il
 * compilatore indica ogni punto da sistemare.
 *
 * **Regola: un segnaposto non si vede mai come un dato.** O porta «—» al posto
 * del numero, o la riga è spenta e marcata «Presto». Questa tab mostrava
 * un'identità inventata e tre contatori costanti scritti nel file, e li ha
 * tolti a luglio proprio perché una riga che non fa nulla è una promessa
 * falsa: la struttura nuova si disegna intera, ma nulla di ciò che non
 * funziona può somigliare a qualcosa che funziona.
 *
 * La forma della riconciliazione l'ha già trovata questo repo con le
 * preferenze di notifica sul web: **la scheda dichiara il proprio stato**. Un
 * segnaposto che porta addosso «Presto» ed è inerte è la stessa soluzione.
 */

export interface Segnaposto {
  /** Cosa manca esattamente. Non è un'etichetta a schermo: è per chi legge il codice. */
  readonly manca: string;
}

const segnaposto = (manca: string): Segnaposto => ({ manca });

/**
 * Il gesto di un comando sospeso: nessuno.
 *
 * Serve dove il segnaposto non è una riga d'elenco — un bottone spento, una
 * scelta inerte — e senza di questo il legame fra il comando e il suo debito
 * vivrebbe solo in un commento, cioè in un posto che nessuno può cercare. Va
 * sempre insieme a `disabled`: questo dichiara *perché* non fa niente, non lo
 * rende toccabile.
 */
export const gestoSospeso =
  (debito: Segnaposto) =>
  (): void => {
    // Se questo parte, un comando sospeso è tornato premibile — qualcuno ha
    // tolto `disabled` e ha lasciato il gesto vuoto. In sviluppo lo si vede
    // subito; nell'app costruita non fa niente, che è l'unico comportamento
    // sicuro.
    if (__DEV__) console.warn(`[segnaposto] comando sospeso invocato — manca: ${debito.manca}`);
  };

// --- Contatori e attività ----------------------------------------------------

export const SEGNAPOSTO_POST_MIEI = segnaposto('GET /post non filtra per autore');
export const SEGNAPOSTO_AULE_CREATE = segnaposto('GET /aule-studio non filtra per creatore');
export const SEGNAPOSTO_MATERIALI_SALVATI = segnaposto(
  'nessun concetto di «materiale salvato» nel dominio',
);

// --- Profilo -----------------------------------------------------------------

export const SEGNAPOSTO_AVATAR = segnaposto(
  'nessuna foto nel profilo e nessun endpoint per caricarla',
);
export const SEGNAPOSTO_ANNO_CORSO = segnaposto("ProfiloDto non porta l'anno di corso");
export const SEGNAPOSTO_CONDIVIDI_PROFILO = segnaposto(
  "non esiste GET /profilo/:id: non c'è un profilo di terzi da aprire",
);

// --- Account -----------------------------------------------------------------

export const SEGNAPOSTO_EMAIL = segnaposto(
  "il profilo non espone l'email di proposito, e l'accesso è a codice: non c'è una password",
);
export const SEGNAPOSTO_DISPOSITIVI = segnaposto(
  'i dispositivi si registrano e si dimenticano, ma non esiste un GET che li elenchi',
);
export const SEGNAPOSTO_TEMA = segnaposto(
  'sul telefono il tema segue useColorScheme(): non è una scelta, è un riflesso del sistema',
);

// --- Privacy e avvisi --------------------------------------------------------

export const SEGNAPOSTO_CONTATTABILITA = segnaposto(
  'PUT /profilo/me/privacy la salva, ma nessuna regola la legge',
);
export const SEGNAPOSTO_PROMEMORIA = segnaposto(
  'PreferenzeDiNotificaDto ha due assi soli: commenti e inviti',
);
export const SEGNAPOSTO_PAUSA_NOTTURNA = segnaposto('nessuna fascia oraria nel modello');
export const SEGNAPOSTO_PERMESSO_PUSH = segnaposto(
  'E12.3: nessun modulo nativo di notifiche e nessun fornitore che le recapiti',
);

// --- Supporto ----------------------------------------------------------------

export const SEGNAPOSTO_AIUTO = segnaposto('nessuna schermata di aiuto e nessun canale di contatto');
