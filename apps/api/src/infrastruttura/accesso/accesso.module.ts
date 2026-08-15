import { Module } from '@nestjs/common';
import { AvvisiInUscitaModule } from '../avvisi-in-uscita/avvisi-in-uscita.module';
import { CANALE_EMAIL, type CanaleEmail } from '../avvisi-in-uscita/canale-email';
import { PrismaService } from '../../database/prisma.service';
import { creaFornitoreIdentita, type FornitoreIdentita } from './better-auth';
import { CancellazioneAccesso } from './cancellazione-accesso';

/** Gettone di iniezione del fornitore di identità. */
export const FORNITORE_IDENTITA = Symbol('FornitoreIdentita');

/**
 * Il fornitore di identità come dipendenza iniettabile.
 *
 * **Non è un modulo di dominio.** L'architettura dice che Accesso non si
 * modella: qui c'è solo la configurazione di un servizio generico, e nessun
 * bounded context importa questo modulo. L'unico consumatore è la porta di
 * traduzione posseduta da Profilo, più i controller della facciata che
 * chiedono e verificano il codice.
 */
@Module({
  imports: [AvvisiInUscitaModule],
  providers: [
    {
      provide: FORNITORE_IDENTITA,
      inject: [PrismaService, CANALE_EMAIL],
      useFactory: (prisma: PrismaService, canaleEmail: CanaleEmail): FornitoreIdentita =>
        creaFornitoreIdentita(prisma, canaleEmail),
    },
    CancellazioneAccesso,
  ],
  exports: [FORNITORE_IDENTITA, CancellazioneAccesso],
})
export class AccessoModule {}
