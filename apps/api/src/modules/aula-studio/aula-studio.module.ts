import { Module } from '@nestjs/common';
import { ArchivioFileModule } from '../../infrastruttura/archivio-file/archivio-file.module';
import { AvvisiInUscitaModule } from '../../infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { AulaStudioService } from './aula-studio.service';
import { CancellazioneAulaStudioService } from './cancellazione-aula-studio.service';
import { PortaAppartenenzaGruppo } from './porta-appartenenza-gruppo';
import { PuliziaAulaStudioService } from './pulizia-aula-studio.service';
import { RecapitoFattiService } from './recapito-fatti.service';

/**
 * Bounded context AULA STUDIO — il core: l'incontro di studio.
 *
 * Posizione nella Context Map:
 * - importa Profilo (upstream condiviso): prova di onboarding, università su
 *   cui si decide l'ammissione all'ateneo, nomi dei partecipanti;
 * - **NON importa Bacheca né Gruppo**. Con Bacheca il rapporto è separate
 *   ways — l'omonimia dell'Allegato è una somiglianza, non un modello
 *   condiviso. Con Gruppo passa un solo fatto booleano, e passa da
 *   `PortaAppartenenzaGruppo`.
 * - nessun altro contesto importa Aula studio.
 *
 * Il core ha quindi **due sole dipendenze di dominio**, ed è una proprietà da
 * preservare: una terza andrebbe trattata come modifica della Context Map,
 * non come dettaglio interno.
 */
@Module({
  imports: [ProfiloModule, ArchivioFileModule, AvvisiInUscitaModule],
  providers: [
    AulaStudioService,
    PuliziaAulaStudioService,
    RecapitoFattiService,
    CancellazioneAulaStudioService,
    PortaAppartenenzaGruppo,
  ],
  exports: [
    AulaStudioService,
    PuliziaAulaStudioService,
    RecapitoFattiService,
    CancellazioneAulaStudioService,
  ],
})
export class AulaStudioModule {}
