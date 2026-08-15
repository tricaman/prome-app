import { Injectable, Logger } from '@nestjs/common';
import type { TrasportoInTempoReale } from './trasporto';

/**
 * Il trasporto che non consegna a nessuno.
 *
 * Non è un segnaposto da sostituire in fretta: è **la degradazione dichiarata
 * dell'epica**, resa eseguibile. Con questo adattatore attivo l'aula funziona
 * al 100% in tutto ciò che non è tempo reale — si scrive, si legge, la
 * cronologia sopravvive — e i messaggi semplicemente non compaiono da soli
 * sullo schermo di chi è già dentro.
 *
 * È il modo per provare dal vivo che una dipendenza non bloccante non è
 * diventata bloccante, cosa che accade per aggiunta di una singola attesa e
 * non produce alcun sintomo fino al giorno in cui il fornitore è indisponibile.
 */
@Injectable()
export class TrasportoAssente implements TrasportoInTempoReale {
  private readonly logger = new Logger('TempoReale');
  private readonly consegnati: Array<{ stanza: string; evento: string; dato: unknown }> = [];

  pubblicaInStanza(stanza: string, evento: string, dato: unknown): Promise<void> {
    this.consegnati.push({ stanza, evento, dato });
    if (this.consegnati.length > 200) this.consegnati.shift();
    this.logger.debug(`[assente] ${evento} in ${stanza}: nessuna consegna`);
    return Promise.resolve();
  }

  /** Solo per i test: cosa sarebbe stato consegnato. */
  pubblicati(): ReadonlyArray<{ stanza: string; evento: string; dato: unknown }> {
    return this.consegnati;
  }

  /** Solo per i test. */
  azzera(): void {
    this.consegnati.length = 0;
  }
}
