import { Module } from '@nestjs/common';
import { ArchivioFileModule } from '../../infrastruttura/archivio-file/archivio-file.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { BachecaService } from './bacheca.service';
import { PuliziaBachecaService } from './pulizia-bacheca.service';

/**
 * Bounded context BACHECA — post, commenti e allegati.
 *
 * Importa Profilo, come la Context Map consente: gli servono la prova di
 * onboarding (B6) e le impostazioni di privacy per risolvere chi vede cosa in
 * lettura (B5). **Non importa Gruppo né Aula studio**: con quei due il
 * rapporto è separate ways.
 */
@Module({
  imports: [ProfiloModule, ArchivioFileModule],
  providers: [BachecaService, PuliziaBachecaService],
  exports: [BachecaService, PuliziaBachecaService],
})
export class BachecaModule {}
