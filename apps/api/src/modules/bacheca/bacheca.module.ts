import { Module } from '@nestjs/common';
import { BachecaService } from './bacheca.service';

/**
 * Bounded context BACHECA — annunci e contenuti condivisi tra studenti.
 *
 * Posizione nella Context Map:
 * - potrà importare Profilo (upstream condiviso);
 * - NON importa Gruppo né AulaStudio (i contesti pari non si importano tra loro).
 * Per ora nessun import incrociato: modulo vuoto, solo registrato in AppModule.
 */
@Module({
  providers: [BachecaService],
})
export class BachecaModule {}
