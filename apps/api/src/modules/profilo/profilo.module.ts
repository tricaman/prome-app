import { Module } from '@nestjs/common';
import { ProfiloService } from './profilo.service';

/**
 * Bounded context PROFILO — identità accademica dell'utente
 * (dati anagrafici, università, corso, stato dell'onboarding).
 *
 * Posizione nella Context Map: contesto UPSTREAM condiviso.
 * - PUÒ essere importato da Bacheca, Gruppo e AulaStudio;
 * - NON importa alcun altro contesto di dominio.
 * Esporta il service proprio perché gli altri tre potranno dipenderne.
 */
@Module({
  providers: [ProfiloService],
  exports: [ProfiloService],
})
export class ProfiloModule {}
