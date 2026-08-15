/**
 * Ciò che entra nel messaggio non è tutto nostro.
 *
 * Il titolo di un'aula studio e il nome di chi invita li scrive una persona, e
 * finiscono dentro l'HTML di un'email e dentro il suo oggetto. Senza questo
 * file, un'aula chiamata `<a href=...>` diventa un collegamento vero nella
 * posta di qualcun altro, mandato dal nostro dominio, con la nostra
 * reputazione di mittente sotto. È il motivo per cui i blocchi non accettano
 * HTML: tutto passa di qui.
 */

const ENTITA: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Testo destinato al corpo del documento. */
export function testoSicuro(valore: string): string {
  return valore.replace(/[&<>"']/g, (carattere) => ENTITA[carattere]!);
}

/**
 * Indirizzo destinato a un attributo `href`.
 *
 * L'elenco degli schemi è chiuso e corto. `javascript:` in posta non esegue
 * quasi da nessuna parte, ma `data:` sì abbastanza da contare, e un elenco di
 * ciò che è permesso invecchia meglio di un elenco di ciò che è vietato: uno
 * schema inventato domani è già escluso. Ciò che non passa diventa `#`, cioè
 * un collegamento che non porta da nessuna parte invece di uno che porta dove
 * non vogliamo.
 */
export function indirizzoSicuro(valore: string): string {
  const ripulito = valore.trim();
  const ammesso = /^(https?:\/\/|mailto:)/i.test(ripulito);
  return ammesso ? testoSicuro(ripulito) : '#';
}

/** Il codice del primo carattere che una riga di intestazione non può contenere. */
const PRIMO_CARATTERE_STAMPABILE = 0x20;
const CARATTERE_CANCELLA = 0x7f;

/**
 * Testo destinato a un'intestazione del messaggio (l'oggetto).
 *
 * Un a capo dentro un'intestazione è, nel protocollo della posta, la fine di
 * quell'intestazione e l'inizio della successiva: da lì si aggiunge un
 * destinatario nascosto a un messaggio che parte dal nostro dominio. La
 * libreria di invio codifica già le intestazioni, quindi questa è la seconda
 * rete e non la prima — ma è quella che resta se un domani il fornitore cambia.
 *
 * Il controllo è per codice e non per espressione regolare: una regola scritta
 * con i caratteri di controllo dentro il sorgente è una regola che il primo
 * strumento che riformatta il file può rompere in silenzio.
 */
export function intestazioneSicura(valore: string): string {
  const stampabile = Array.from(valore)
    .map((carattere) => {
      const codice = carattere.codePointAt(0) ?? 0;
      return codice < PRIMO_CARATTERE_STAMPABILE || codice === CARATTERE_CANCELLA ? ' ' : carattere;
    })
    .join('');
  return stampabile.replace(/ {2,}/g, ' ').trim();
}
