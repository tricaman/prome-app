/**
 * PortaAudiochat — il canale audio dell'aula, e nient'altro.
 *
 * **Si esprime solo nei termini del dominio**: il canale audio di un'aula e la
 * persona che vi entra. Nessuna parola del fornitore attraversa questo
 * confine — non «stanza», non «traccia», non «token di LiveKit» — ed è ciò che
 * rende MA1 vera: sostituire il fornitore è riscrivere un adattatore, non
 * toccare l'aggregato AulaStudio.
 *
 * **AS8 in negativo, ed è la parte importante.** Il dominio possiede il solo
 * Permesso di Parlare: non esiste un aggregato «Audiochat», non esiste uno
 * stato del canale, e soprattutto **non esiste qui l'elenco di chi sta
 * parlando**. Quell'elenco vive nel client, che lo riceve dal fornitore: se lo
 * tenessimo noi avremmo uno stato da mantenere allineato a una realtà che
 * cambia dieci volte al secondo, e sarebbe sbagliato quasi sempre.
 *
 * **RE4** discende dalla firma: aprire il canale può non riuscire, e non
 * riuscire non è un guasto dell'aula. Chi chiama riceve `null` e continua —
 * l'aula resta operativa al 100% in tutto ciò che non è audio.
 */

/** Chi vuole entrare, e in quale canale. */
export interface CanaleAudioDellAulaStudio {
  aulaStudioId: string;
  utenteId: string;
}

/** Ciò che serve al client per collegarsi. Nient'altro. */
export interface AccessoAlCanaleAudio {
  /** Dove collegarsi. */
  url: string;
  /**
   * Il lasciapassare, già limitato a **questo** canale e a **questa** persona.
   * Non è una credenziale del prodotto: scade da sé, e non vale altrove.
   */
  lasciapassare: string;
  scadeIl: string;
}

export interface PortaAudiochat {
  /**
   * Apre il canale per chi ne ha titolo.
   *
   * **Il titolo lo verifica chi chiama, non questa porta**: il Permesso di
   * Parlare è del dominio, e una porta tecnica che decidesse un'ammissione
   * terrebbe la stessa regola in due posti — con la copia fuori dal contesto
   * che la possiede.
   *
   * `null` quando l'audio non è disponibile: è la degradazione dichiarata,
   * non un errore da gestire.
   */
  apriCanale(canale: CanaleAudioDellAulaStudio): Promise<AccessoAlCanaleAudio | null>;
}

export const PORTA_AUDIOCHAT = Symbol('PortaAudiochat');

/**
 * Quanto dura il lasciapassare.
 *
 * Non è la durata della conversazione: serve solo a collegarsi, e una volta
 * dentro la connessione resta. Corto di proposito — se finisce in un log o in
 * una cronologia del browser, smette di valere quasi subito.
 */
export const DURATA_LASCIAPASSARE_SECONDI = 15 * 60;
