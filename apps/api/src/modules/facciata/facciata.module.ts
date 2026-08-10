import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * FACCIATA — la facciata REST versionata: unico punto d'ingresso HTTP del
 * monolite. Traduce il contratto client (@prome/contracts, evoluzione solo
 * additiva dentro una versione) nelle operazioni dei bounded context.
 * Nessuna logica di dominio qui: in futuro importerà i moduli di contesto
 * per orchestrare comandi e letture. Per ora espone solo la sonda di salute.
 */
@Module({
  controllers: [HealthController],
})
export class FacciataModule {}
