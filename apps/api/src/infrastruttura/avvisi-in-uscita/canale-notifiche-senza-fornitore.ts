import { Injectable, Logger } from '@nestjs/common';
import type { AvvisoDaRecapitare, CanaleNotifiche } from './canale-notifiche';

/** Quanti avvisi tenere in memoria per i test: un processo lungo non accumula. */
const TETTO_IN_MEMORIA = 200;

/**
 * L'adattatore che non manda niente a nessuno.
 *
 * **Non è un segnaposto da sostituire in fretta**: è la posizione dichiarata
 * dal progetto, la stessa già presa per le misurazioni. I punti di emissione
 * esistono, le regole su chi riceve cosa sono scritte e provate, il fornitore
 * no — perché l'architettura esclude *ogni fornitore di notifica push privo di
 * regione UE selezionabile*, e quella verifica non è ancora stata fatta.
 *
 * Attaccare un fornitore sarà **un adattatore**, non una riscrittura: tutto
 * ciò che decide se, quando e a chi arriva un avviso vive dall'altra parte
 * della porta ed è già finito.
 *
 * Nel frattempo la degradazione è quella dichiarata: **niente arriva, e nulla
 * si rompe**. Un commento resta scritto, un invito resta valido, e chi apre
 * l'app trova comunque ciò che è successo.
 */
@Injectable()
export class CanaleNotificheSenzaFornitore implements CanaleNotifiche {
  private readonly logger = new Logger('AvvisiInUscita');
  private readonly recapitati: Array<{ token: readonly string[]; avviso: AvvisoDaRecapitare }> = [];

  recapita(token: readonly string[], avviso: AvvisoDaRecapitare): Promise<void> {
    this.recapitati.push({ token, avviso });
    if (this.recapitati.length > TETTO_IN_MEMORIA) this.recapitati.shift();

    // Nel log finiscono quanti dispositivi e verso cosa, mai il token — che
    // identifica un apparecchio — e mai il contenuto dell'avviso.
    this.logger.debug(`Avviso non recapitato (nessun fornitore): ${avviso.percorso}, ${token.length} dispositivi`);
    return Promise.resolve();
  }

  /** Solo per i test: gli avvisi che sarebbero partiti. */
  get ultimiAvvisi(): ReadonlyArray<{ token: readonly string[]; avviso: AvvisoDaRecapitare }> {
    return this.recapitati;
  }

  /** Solo per i test: azzera fra un caso e l'altro. */
  svuota(): void {
    this.recapitati.length = 0;
  }
}
