import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { registrazioneI18n } from '../config/i18n';
import { PrismaModule } from '../database/prisma.module';
import { MisurazioniModule } from '../infrastruttura/misurazioni/misurazioni.module';
import { AulaStudioModule } from '../modules/aula-studio/aula-studio.module';
import { BachecaModule } from '../modules/bacheca/bacheca.module';
import { CancellazioneModule } from '../modules/cancellazione/cancellazione.module';
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
 * Oggi esegue le pulizie della Bacheca (i commenti dei post eliminati e i
 * caricamenti abbandonati) e la catena di cancellazione degli account (V5):
 * grazia, eliminazione, anonimizzazione e verifica del residuo. Il recapito
 * dei fatti arriverà con E3.
 */
@Module({
  imports: [
    // Il file .env sta alla ROOT del monorepo (cwd in dev = apps/api).
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    // Anche il worker traduce: manda email, e i testi seguono la stessa
    // regola del resto — tradotti dal server.
    registrazioneI18n,
    PrismaModule,
    // @Global vale solo se il modulo è importato dalla radice di QUESTO
    // contesto: senza, la catena non potrebbe contare i completamenti.
    MisurazioniModule,
    BachecaModule,
    AulaStudioModule,
    CancellazioneModule,
  ],
  providers: [WorkerService],
})
export class WorkerModule {}
