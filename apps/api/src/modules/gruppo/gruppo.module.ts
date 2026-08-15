import { Module } from '@nestjs/common';
import { AvvisiInUscitaModule } from '../../infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { AvvisiModule } from '../avvisi/avvisi.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { GruppoService } from './gruppo.service';
import { RecapitoFattiDelGruppoService } from './recapito-fatti.service';

/**
 * Bounded context GRUPPO — lo spazio che resta nel tempo.
 *
 * Posizione nella Context Map:
 * - importa Profilo (upstream condiviso): prova di onboarding, università su
 *   cui si congela l'ateneo alla creazione, nomi dei membri;
 * - **non importa Bacheca né Aula studio**. Verso l'aula pubblica due cose e
 *   solo quelle: un booleano di appartenenza, chiesto su dato fresco, e i
 *   fatti della decadenza — che l'aula consuma dal proprio lato.
 *
 * È **Aula studio a importare Gruppo**, non il contrario, ed è la direzione
 * che rende impossibile l'anello: il gruppo non conosce le aule, e infatti non
 * potrebbe elencarle nemmeno volendo.
 */
@Module({
  imports: [ProfiloModule, AvvisiInUscitaModule, AvvisiModule],
  providers: [GruppoService, RecapitoFattiDelGruppoService],
  exports: [GruppoService, RecapitoFattiDelGruppoService],
})
export class GruppoModule {}
