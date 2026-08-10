import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

/**
 * Segnaposto del worker: tiene vivo il processo con un heartbeat ogni 30s.
 * Qui prenderanno posto CadenzaDeiMeccanismiRicorrenti e
 * RecapitoDeiFattiDiDominio (vedi worker.module.ts).
 */
@Injectable()
export class WorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Worker');
  private heartbeat?: NodeJS.Timeout;

  onApplicationBootstrap(): void {
    this.logger.log('Worker attivo: heartbeat ogni 30 secondi (segnaposto)');
    this.heartbeat = setInterval(() => {
      this.logger.log('heartbeat — il worker è vivo');
    }, 30_000);
  }

  onApplicationShutdown(): void {
    // Spegnimento pulito: senza clearInterval il processo non terminerebbe.
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
    }
  }
}
