import { Module } from '@nestjs/common';
import { AccessoModule } from '../../infrastruttura/accesso/accesso.module';
import { AulaStudioModule } from '../aula-studio/aula-studio.module';
import { BachecaModule } from '../bacheca/bacheca.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { CancellazioneService } from './cancellazione.service';

/**
 * CANCELLAZIONE — componente trasversale, non un bounded context.
 *
 * Posizione nella Context Map: è il consumer a valle di TUTTI i moduli
 * (`moduli → CancellazioneDellAccount`, customer/supplier con i moduli a
 * monte). È l'unico modulo autorizzato a importare più contesti insieme,
 * perché orchestra la sorte che ciascuno decide per i propri dati. Nessun
 * modulo di dominio importa questo, e nessun modulo legge lo schema
 * `cancellazione`: lo importano solo Facciata (superficie di richiesta),
 * AppModule e WorkerModule (esecuzione).
 *
 * Forza sacrificata, dichiarata dall'architettura: questo componente conosce
 * l'elenco dei detentori di dati personali, ed è un punto da aggiornare a
 * ogni detentore nuovo (vedi DETENTORI_CENSITI nel service).
 */
@Module({
  imports: [ProfiloModule, BachecaModule, AulaStudioModule, AccessoModule],
  providers: [CancellazioneService],
  exports: [CancellazioneService],
})
export class CancellazioneModule {}
