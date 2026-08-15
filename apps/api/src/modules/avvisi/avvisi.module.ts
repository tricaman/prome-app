import { Module } from '@nestjs/common';
import { AvvisiInUscitaModule } from '../../infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { AvvisiService } from './avvisi.service';

/**
 * Il ponte fra chi produce un avviso e chi lo recapita.
 *
 * Importa Profilo — che possiede la persona, i suoi apparecchi e le sue
 * preferenze — e la porta delle notifiche. Non importa nessun altro contesto:
 * i produttori importano lui, non il contrario.
 */
@Module({
  imports: [ProfiloModule, AvvisiInUscitaModule],
  providers: [AvvisiService],
  exports: [AvvisiService],
})
export class AvvisiModule {}
