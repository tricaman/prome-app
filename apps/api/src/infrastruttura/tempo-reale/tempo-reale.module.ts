import { Module } from '@nestjs/common';
import { env } from '../../config/env';
import { ProfiloModule } from '../../modules/profilo/profilo.module';
import { GatewaySocketIo } from './gateway-socket-io';
import { TrasportoAssente } from './trasporto-assente';
import { TRASPORTO_TEMPO_REALE } from './trasporto';

/** Con il trasporto assente il gateway non viene nemmeno costruito. */
const conSocketIo = env.TRASPORTO_TEMPO_REALE === 'socket-io';

/**
 * Il trasporto in tempo reale, con due adattatori e un interruttore.
 *
 * `TRASPORTO_TEMPO_REALE=assente` non è una configurazione di ripiego: è il
 * modo per **provare la degradazione dichiarata** — l'aula resta operativa in
 * tutto ciò che non è tempo reale — senza dover spegnere un fornitore vero. È
 * anche la configurazione dei test, perché un test che passasse solo col
 * fornitore acceso non direbbe nulla sul giorno in cui quel fornitore cade.
 *
 * Il modulo importa Profilo per la sola identificazione di chi si connette:
 * stabilire **chi è** con lo stesso token delle richieste ordinarie, e
 * nient'altro. Chi può fare cosa lo decide il modulo proprietario.
 */
@Module({
  imports: [ProfiloModule],
  providers: [
    TrasportoAssente,
    ...(conSocketIo ? [GatewaySocketIo] : []),
    {
      provide: TRASPORTO_TEMPO_REALE,
      inject: conSocketIo ? [GatewaySocketIo] : [TrasportoAssente],
      useFactory: (adattatore: GatewaySocketIo | TrasportoAssente) => adattatore,
    },
  ],
  exports: [TRASPORTO_TEMPO_REALE],
})
export class TempoRealeModule {}
