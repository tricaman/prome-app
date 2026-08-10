import { Module } from '@nestjs/common';
import { AulaStudioService } from './aula-studio.service';

/**
 * Bounded context AULA STUDIO — sessioni di studio condivise in tempo reale.
 *
 * Posizione nella Context Map:
 * - potrà importare Profilo (upstream condiviso);
 * - NON importa Bacheca né Gruppo (i contesti pari non si importano tra loro).
 * Per ora nessun import incrociato: modulo vuoto, solo registrato in AppModule.
 */
@Module({
  providers: [AulaStudioService],
})
export class AulaStudioModule {}
