/**
 * Quello che il disegno prevede e il prodotto non ha ancora.
 *
 * Stanno tutti qui e non sparsi nelle pagine per una ragione sola: questo file
 * **è** l'elenco del debito. `rg SEGNAPOSTO_ apps/web/src` lo conta in un
 * comando, e quando l'endpoint arriva si cancella la riga da qui e il
 * compilatore indica ogni punto da sistemare. È lo stesso file, con la stessa
 * convenzione, di `apps/mobile/src/lib/segnaposto.ts`: le due superfici hanno
 * lo stesso debito e devono raccontarlo allo stesso modo.
 *
 * **Regola: un segnaposto non si vede mai come un dato.** O porta «—» al posto
 * del numero, o la riga è spenta e marcata «Presto». La pagina delle
 * impostazioni ha già una regola scritta in testa — «qui c'è solo ciò che
 * funziona», dopo che a luglio erano state tolte quattro righe che non facevano
 * niente — e questa convenzione non la contraddice: la struttura nuova si
 * disegna intera, ma nulla di ciò che non funziona può somigliare a qualcosa
 * che funziona. La forma l'aveva già trovata il pannello degli avvisi: **la
 * scheda dichiara il proprio stato**.
 */

export interface Segnaposto {
  /** Cosa manca esattamente. Non è un'etichetta a schermo: è per chi legge il codice. */
  readonly manca: string;
}

const segnaposto = (manca: string): Segnaposto => ({ manca });

// --- Contatori e contenuti propri --------------------------------------------

export const SEGNAPOSTO_POST_MIEI = segnaposto('ElencaPostParams non ha un filtro per autore');
export const SEGNAPOSTO_AULE_CREATE = segnaposto('gli elenchi non filtrano per creatore');
export const SEGNAPOSTO_MATERIALI_SALVATI = segnaposto(
  'nessun concetto di «materiale salvato» nel dominio',
);

// --- Profilo -----------------------------------------------------------------

export const SEGNAPOSTO_AVATAR = segnaposto(
  'ProfiloDto non ha una foto e non esiste un endpoint per caricarla',
);
export const SEGNAPOSTO_BIO = segnaposto('nessuna biografia nel modello di dominio');
export const SEGNAPOSTO_ANNO_CORSO = segnaposto("ProfiloDto non porta l'anno di corso");
export const SEGNAPOSTO_ISCRITTO_DA = segnaposto("ProfiloDto non espone la data d'iscrizione");

/**
 * La pagina pubblica del profilo su prome.app.
 *
 * Non è «non ancora implementata»: è **fuori dal prodotto per decisione
 * dichiarata**. `apps/web/CLAUDE.md` la chiama regola non negoziabile —
 * nessun contenuto degli utenti è visibile a chi non ha un account, profili
 * compresi — e vieta esplicitamente lo schema `ProfilePage`. Servirebbe anche
 * un `GET /profilo/:id` che non esiste e che, quando esisterà, dovrà passare
 * dalle regole di visibilità del contesto Profilo.
 *
 * Il bottone resta nel disegno perché la domanda che pone — «cosa vedono gli
 * altri di me?» — è giusta, e quando ci sarà una risposta andrà lì.
 */
export const SEGNAPOSTO_PROFILO_PUBBLICO = segnaposto(
  'nessuna pagina pubblica del profilo, per decisione dichiarata in CLAUDE.md',
);

// --- Account -----------------------------------------------------------------

export const SEGNAPOSTO_EMAIL = segnaposto(
  "il profilo non espone l'email di proposito, e l'accesso è a codice: non c'è una password",
);
export const SEGNAPOSTO_DISPOSITIVI = segnaposto(
  'i dispositivi si registrano e si dimenticano, ma non esiste un GET che li elenchi',
);

// --- Avvisi ------------------------------------------------------------------

export const SEGNAPOSTO_CONTATTABILITA = segnaposto(
  'PUT /profilo/me/privacy la salva, ma nessuna regola la legge',
);
export const SEGNAPOSTO_PROMEMORIA = segnaposto(
  'PreferenzeDiNotificaDto ha due assi soli: commenti e inviti',
);
export const SEGNAPOSTO_RIEPILOGO_MATERIALI = segnaposto(
  'nessun riepilogo periodico, e nessun asse per i materiali',
);

/**
 * Il gesto di un comando sospeso: nessuno.
 *
 * Serve dove il segnaposto non è una riga d'elenco — un bottone spento, una
 * scelta inerte — e senza di questo il legame fra il comando e il suo debito
 * vivrebbe solo in un commento, cioè in un posto che nessuno può cercare. Va
 * sempre insieme a `isDisabled`: questo dichiara *perché* non fa niente, non lo
 * rende premibile.
 */
export const gestoSospeso =
  (debito: Segnaposto) =>
  (): void => {
    // Se questo parte, un comando sospeso è tornato premibile — qualcuno ha
    // tolto `isDisabled` e ha lasciato il gesto vuoto. In sviluppo lo si vede
    // subito; in produzione non fa niente, che è l'unico comportamento sicuro.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[segnaposto] comando sospeso invocato — manca: ${debito.manca}`);
    }
  };
