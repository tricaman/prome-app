import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessoModule } from '../../infrastruttura/accesso/accesso.module';
import { ArchivioFileModule } from '../../infrastruttura/archivio-file/archivio-file.module';
import { BachecaModule } from '../bacheca/bacheca.module';
import { CancellazioneModule } from '../cancellazione/cancellazione.module';
import { ProfiloModule } from '../profilo/profilo.module';
import { AccessoController } from './accesso.controller';
import { ArchivioController } from './archivio.controller';
import { BachecaController } from './bacheca.controller';
import { CancellazioneController } from './cancellazione.controller';
import { GuardiaAccesso } from './guardia-accesso';
import { HealthController } from './health.controller';
import { ProfiloController } from './profilo.controller';

/**
 * FACCIATA — la facciata REST versionata: unico punto d'ingresso HTTP del
 * monolite. Traduce il contratto client (@prome/contracts, evoluzione solo
 * additiva dentro una versione) nelle operazioni dei bounded context.
 * Nessuna logica di dominio qui: la facciata orchestra, i contesti decidono.
 *
 * La guardia è registrata come guardia **globale**: ogni endpoint nasce
 * protetto e va aperto di proposito con `@SenzaAccesso()`. Il contrario —
 * aperto per difetto — lascerebbe scoperto tutto ciò che ci si dimentica di
 * proteggere, e ciò che si dimentica non si vede.
 */
@Module({
  imports: [AccessoModule, ProfiloModule, BachecaModule, ArchivioFileModule, CancellazioneModule],
  controllers: [
    HealthController,
    AccessoController,
    ProfiloController,
    BachecaController,
    ArchivioController,
    CancellazioneController,
  ],
  providers: [{ provide: APP_GUARD, useClass: GuardiaAccesso }],
})
export class FacciataModule {}
