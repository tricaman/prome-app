import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PuliziaAulaStudioService } from '../modules/aula-studio/pulizia-aula-studio.service';
import { RecapitoFattiService } from '../modules/aula-studio/recapito-fatti.service';
import { RecapitoFattiDelGruppoService } from '../modules/gruppo/recapito-fatti.service';
import { PuliziaBachecaService } from '../modules/bacheca/pulizia-bacheca.service';
import { CancellazioneService } from '../modules/cancellazione/cancellazione.service';

/** Ogni quanto girano le pulizie. */
const CADENZA_MS = 5 * 60 * 1000;

/**
 * La corsia rapida dei fatti, ogni secondo.
 *
 * È separata dalle pulizie perché serve una classe di finestre diversa:
 * qui c'è **qualcuno che aspetta davanti allo schermo** — ha appena accettato
 * un invito e sta guardando comparire l'aula. Un secondo di attesa consuma una
 * frazione della finestra promessa e lascia il resto alla consegna, senza
 * introdurre un canale di notifica immediata che sarebbe un guasto in più da
 * sorvegliare in un esercizio non presidiato.
 */
const CADENZA_FATTI_MS = 1000;

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
  private cadenzaFatti?: NodeJS.Timeout;
  /** Un giro dei fatti alla volta: un ciclo lento non deve accavallarsi. */
  private giroFattiInCorso = false;

  constructor(
    private readonly puliziaBacheca: PuliziaBachecaService,
    private readonly puliziaAule: PuliziaAulaStudioService,
    private readonly recapitoFatti: RecapitoFattiService,
    private readonly recapitoFattiDelGruppo: RecapitoFattiDelGruppoService,
    private readonly cancellazione: CancellazioneService,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log(`Worker attivo: meccanismi ricorrenti ogni ${CADENZA_MS / 1000} secondi`);
    this.cadenzaFatti = setInterval(() => void this.giroDeiFatti(), CADENZA_FATTI_MS);
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
    if (this.cadenzaFatti) clearInterval(this.cadenzaFatti);
  }

  /**
   * La corsia rapida. Non si accavalla con sé stessa: se un giro è ancora in
   * corso il successivo salta, e al giro dopo troverà semplicemente più righe.
   */
  private async giroDeiFatti(): Promise<void> {
    if (this.giroFattiInCorso) return;
    this.giroFattiInCorso = true;
    try {
      // Due canali, una corsia sola: sono outbox distinte per schema, ma
      // hanno la stessa urgenza — di là qualcuno aspetta davanti allo
      // schermo, di qua qualcuno sta leggendo ciò che non dovrebbe più.
      await this.recapitoFatti.eseguiGiro();
      await this.recapitoFattiDelGruppo.eseguiGiro();
    } catch (errore) {
      this.logger.error(
        'Il recapito dei fatti è fallito: si riprova al prossimo giro',
        errore instanceof Error ? errore.stack : undefined,
      );
    } finally {
      this.giroFattiInCorso = false;
    }
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
      await this.puliziaAule.eseguiGiro();
    } catch (errore) {
      this.logger.error(
        'La pulizia delle aule studio è fallita: si riprova al prossimo giro',
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
