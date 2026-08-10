import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkerService } from './worker.service';

/**
 * WorkerModule — modulo radice dell'unità di esecuzione "worker"
 * (APP_ROLE=worker): stessa codebase e stessa immagine dell'unità "app",
 * ma NESSUN listener HTTP (viene avviato come application context).
 *
 * Segnaposto per i due meccanismi previsti dall'architettura:
 * - CadenzaDeiMeccanismiRicorrenti: lo scheduler che dà il tempo ai
 *   meccanismi ricorrenti dei bounded context (scadenze, pulizie,
 *   aggregazioni periodiche);
 * - RecapitoDeiFattiDiDominio: il recapito affidabile dei fatti di dominio
 *   (pattern outbox) dai contesti che li producono a quelli che li ascoltano.
 *
 * Per ora: solo un log di heartbeat ogni 30 secondi (vedi WorkerService).
 */
@Module({
  imports: [
    // Il file .env sta alla ROOT del monorepo (cwd in dev = apps/api).
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
  ],
  providers: [WorkerService],
})
export class WorkerModule {}
