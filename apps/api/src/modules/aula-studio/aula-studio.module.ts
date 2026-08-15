import { Module } from '@nestjs/common';
import { ArchivioFileModule } from '../../infrastruttura/archivio-file/archivio-file.module';
import { AvvisiInUscitaModule } from '../../infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { TempoRealeModule } from '../../infrastruttura/tempo-reale/tempo-reale.module';
import { GruppoModule } from '../gruppo/gruppo.module';
import { AvvisiModule } from '../avvisi/avvisi.module';
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
 * - importa **Gruppo**, e solo per due cose: il booleano di appartenenza, che
 *   passa da `PortaAppartenenzaGruppo`, e i fatti della decadenza, che
 *   arrivano dall'outbox del gruppo. La parola «Membro» non entra qui dentro.
 * - **NON importa Bacheca**: il rapporto è separate ways, e l'omonimia
 *   dell'Allegato è una somiglianza, non un modello condiviso.
 * - nessun altro contesto importa Aula studio, e in particolare **non lo
 *   importa Gruppo**: la dipendenza va in un verso solo, che è ciò che rende
 *   impossibile l'anello fra i due moduli.
 *
 * Il core ha quindi **due sole dipendenze di dominio** — Profilo e Gruppo — ed
 * è una proprietà da preservare: una terza andrebbe trattata come modifica
 * della Context Map, non come dettaglio interno.
 */
@Module({
  imports: [
    ProfiloModule,
    GruppoModule,
    ArchivioFileModule,
    AvvisiInUscitaModule,
    TempoRealeModule,
    AvvisiModule,
  ],
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
