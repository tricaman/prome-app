import { Injectable, Logger } from '@nestjs/common';
import type { EventoDiProdotto, MisurazioniDiUtilizzo, ProprietaEvento } from './misurazioni';

/**
 * L'adattatore che non manda niente a nessuno.
 *
 * Scrive l'evento nei log e lo tiene in memoria per i test. Non è un
 * segnaposto da sostituire in fretta: è la posizione dichiarata dal piano —
 * i punti di emissione esistono e sono provati, il prodotto di analisi no,
 * finché non è dimostrabile dove finiscono i dati e come vengono trattati.
 *
 * Gli eventi restano in memoria con un tetto: un processo che gira per
 * settimane non deve accumulare misure che nessuno legge.
 */
const TETTO_IN_MEMORIA = 500;

@Injectable()
export class MisurazioniSenzaFornitore implements MisurazioniDiUtilizzo {
  private readonly logger = new Logger('Misurazioni');
  private readonly registrati: Array<{ evento: EventoDiProdotto; proprieta?: ProprietaEvento }> = [];

  registra(evento: EventoDiProdotto, proprieta?: ProprietaEvento): void {
    this.registrati.push({ evento, proprieta });
    if (this.registrati.length > TETTO_IN_MEMORIA) this.registrati.shift();

    // `debug` e non `log`: è un segnale, non un fatto operativo, e in
    // produzione non deve competere con ciò che si legge davvero.
    this.logger.debug(`${evento} ${proprieta ? JSON.stringify(proprieta) : ''}`.trim());
  }

  /** Solo per i test: cosa è stato emesso finora. */
  emessi(): ReadonlyArray<{ evento: EventoDiProdotto; proprieta?: ProprietaEvento }> {
    return this.registrati;
  }

  /** Solo per i test: riparte da zero. */
  azzera(): void {
    this.registrati.length = 0;
  }
}
