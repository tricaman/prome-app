import { Module } from '@nestjs/common';
import { AvvisiInUscitaModule } from '../../infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { SegnalazioneService } from './segnalazione.service';

/**
 * Il contesto delle segnalazioni.
 *
 * Non importa alcun contesto di dominio: la verifica che il soggetto esista e
 * sia visibile a chi segnala la fa il modulo proprietario, orchestrato dalla
 * facciata (lo stesso precedente dell'esportazione). Qui arriva solo ciò che
 * è già stato verificato.
 */
@Module({
  imports: [AvvisiInUscitaModule],
  providers: [SegnalazioneService],
  exports: [SegnalazioneService],
})
export class SegnalazioneModule {}
