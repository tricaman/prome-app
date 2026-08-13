import { Module } from '@nestjs/common';
import { AccessoModule } from '../../infrastruttura/accesso/accesso.module';
import { PortaIdentitaUtente } from './porta-identita-utente';
import { ProfiloService } from './profilo.service';

/**
 * Bounded context PROFILO — identità accademica dell'utente
 * (dati anagrafici, università, corso, stato dell'onboarding).
 *
 * Posizione nella Context Map: contesto UPSTREAM condiviso.
 * - PUÒ essere importato da Bacheca, Gruppo e AulaStudio;
 * - NON importa alcun altro contesto di dominio.
 *
 * Importa `AccessoModule`, che non è un contesto ma la configurazione di un
 * servizio generico: è la dipendenza `Accesso → Profilo` della Context Map, e
 * l'unica cosa che la attraversa è PortaIdentitàUtente, posseduta da qui.
 */
@Module({
  imports: [AccessoModule],
  providers: [ProfiloService, PortaIdentitaUtente],
  exports: [ProfiloService, PortaIdentitaUtente],
})
export class ProfiloModule {}
