import { Module } from '@nestjs/common';
import { AccessoModule } from '../../infrastruttura/accesso/accesso.module';
import { CatalogoService } from './catalogo/catalogo.service';
import { NotificheInAppService } from './notifiche-in-app.service';
import { PortaIdentitaUtente } from './porta-identita-utente';
import { ProfiloService } from './profilo.service';

/**
 * Bounded context PROFILO — identità accademica dell'utente
 * (dati anagrafici, corso di studi con il suo ateneo, stato dell'onboarding).
 *
 * Possiede anche il **catalogo accademico** (`CatalogoService`): Università e
 * Corso universitario sono dati del Profilo secondo il glossario, e tenerli
 * qui è ciò che permette le foreign key — un contesto a parte le perderebbe,
 * perché fra contesti non si attraversano gli schemi.
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
  providers: [ProfiloService, CatalogoService, NotificheInAppService, PortaIdentitaUtente],
  exports: [ProfiloService, CatalogoService, NotificheInAppService, PortaIdentitaUtente],
})
export class ProfiloModule {}
