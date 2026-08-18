import { Module } from '@nestjs/common';
import { env } from '../../config/env';
import { AudiochatAssente } from './audiochat-assente';
import { AudiochatLiveKit } from './audiochat-livekit';
import { PORTA_AUDIOCHAT } from './audiochat';

/**
 * L'audiochat, con due adattatori e un interruttore.
 *
 * `AUDIOCHAT=assente` non è una configurazione di ripiego ed è il valore dei
 * test: è il modo di provare la degradazione dichiarata (RE4) senza spegnere
 * un fornitore vero. `AUDIOCHAT=livekit` parla con il nodo che gestiamo noi.
 *
 * Nessun altro file sa quale dei due sia in uso, ed è il punto: il giorno in
 * cui il nodo self-hosted diventasse un fornitore gestito, o viceversa,
 * cambierebbe questo file e un adattatore — non l'aula.
 */
@Module({
  providers: [
    AudiochatAssente,
    AudiochatLiveKit,
    {
      provide: PORTA_AUDIOCHAT,
      inject: [AudiochatAssente, AudiochatLiveKit],
      useFactory: (assente: AudiochatAssente, livekit: AudiochatLiveKit) =>
        env.AUDIOCHAT === 'livekit' ? livekit : assente,
    },
  ],
  exports: [PORTA_AUDIOCHAT, AudiochatAssente],
})
export class AudiochatModule {}
