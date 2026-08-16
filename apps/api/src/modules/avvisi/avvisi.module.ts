import { Module } from '@nestjs/common';
import { AvvisiInUscitaModule } from '../../infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { TempoRealeModule } from '../../infrastruttura/tempo-reale/tempo-reale.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { AvvisiService } from './avvisi.service';

/**
 * Il ponte fra chi produce un avviso e chi lo recapita.
 *
 * Importa Profilo — che possiede la persona, la sua casella di notifiche, i
 * suoi apparecchi e le sue preferenze — e le porte in uscita: notifiche push,
 * email, tempo reale. Non importa nessun altro contesto: i produttori
 * importano lui, non il contrario. (TempoReale importa a sua volta solo
 * Profilo: nessun anello.)
 */
@Module({
  imports: [ProfiloModule, AvvisiInUscitaModule, TempoRealeModule],
  providers: [AvvisiService],
  exports: [AvvisiService],
})
export class AvvisiModule {}
