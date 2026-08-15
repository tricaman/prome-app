import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PuliziaBachecaService } from '../modules/bacheca/pulizia-bacheca.service';
import { CancellazioneService } from '../modules/cancellazione/cancellazione.service';

/** Ogni quanto girano le pulizie. */
const CADENZA_MS = 5 * 60 * 1000;

/**
 * L'unità lavoratrice: dà il tempo ai meccanismi ricorrenti dei contesti.
 *
 * Non decide nulla di dominio — chiede a ciascun contesto di fare il proprio
 * giro. È il posto dove prenderà forma anche RecapitoDeiFattiDiDominio, che
 * oggi non c'è: finché non c'è, le conseguenze differite sono
 * riconciliazioni a tempo (vedi PuliziaBachecaService).
 */
@Injectable()
export class WorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Worker');
  private cadenza?: NodeJS.Timeout;

  constructor(
    private readonly puliziaBacheca: PuliziaBachecaService,
    private readonly cancellazione: CancellazioneService,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log(`Worker attivo: meccanismi ricorrenti ogni ${CADENZA_MS / 1000} secondi`);
    // Un giro subito all'avvio: dopo un fermo lungo c'è già dell'arretrato, e
    // aspettare la prima cadenza vorrebbe dire lasciarlo lì per altri minuti.
    // Per la cancellazione questo giro d'avvio è anche la ri-applicazione
    // dopo un ripristino da backup: prima del rientro in servizio, il worker
    // riparte e ri-verifica il registro.
    void this.giro();
    this.cadenza = setInterval(() => void this.giro(), CADENZA_MS);
  }

  onApplicationShutdown(): void {
    // Spegnimento pulito: senza clearInterval il processo non terminerebbe.
    if (this.cadenza) clearInterval(this.cadenza);
  }

  /**
   * Un giro non deve mai far cadere il processo, e ogni meccanismo ha il SUO
   * recinto: un errore nella pulizia della bacheca non deve saltare la catena
   * di cancellazione, che ha obblighi con scadenza legale — né viceversa.
   */
  private async giro(): Promise<void> {
    try {
      await this.puliziaBacheca.eseguiGiro();
    } catch (errore) {
      this.logger.error(
        'La pulizia della bacheca è fallita: si riprova al prossimo giro',
        errore instanceof Error ? errore.stack : undefined,
      );
    }

    try {
      await this.cancellazione.eseguiGiro();
    } catch (errore) {
      this.logger.error(
        'Il giro della cancellazione account è fallito: si riprova al prossimo giro',
        errore instanceof Error ? errore.stack : undefined,
      );
    }
  }
}
