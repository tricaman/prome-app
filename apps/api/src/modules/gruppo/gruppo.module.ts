import { Module } from '@nestjs/common';
import { GruppoService } from './gruppo.service';

/**
 * Bounded context GRUPPO — gruppi di studio e loro membri.
 *
 * Posizione nella Context Map:
 * - potrà importare Profilo (upstream condiviso);
 * - NON importa Bacheca né AulaStudio (i contesti pari non si importano tra loro).
 * Per ora nessun import incrociato: modulo vuoto, solo registrato in AppModule.
 */
@Module({
  providers: [GruppoService],
})
export class GruppoModule {}
