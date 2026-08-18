import { Injectable, Logger } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../config/env';
import { stanzaDiAula } from '../tempo-reale/trasporto';
import {
  DURATA_LASCIAPASSARE_SECONDI,
  type AccessoAlCanaleAudio,
  type CanaleAudioDellAulaStudio,
  type PortaAudiochat,
} from './audiochat';

/**
 * L'audiochat servita da un nodo LiveKit nostro.
 *
 * **Non parla con nessuno per rilasciare l'accesso.** Il lasciapassare è un
 * gettone firmato: si conia qui, con la chiave che abbiamo, e il nodo lo
 * verifica da sé. Nessuna chiamata di rete dentro il percorso della richiesta,
 * quindi un nodo lento non rallenta l'apertura della sala — che è metà di RE4.
 *
 * **Il nome della stanza lo decide `stanzaDiAula`**, la stessa funzione del
 * trasporto in tempo reale. Un posto solo che lo sa: due formule diverse per
 * la stessa aula sarebbero due stanze, e nessuno se ne accorgerebbe finché
 * qualcuno non si trova da solo in una conversazione che gli altri hanno
 * altrove.
 */
@Injectable()
export class AudiochatLiveKit implements PortaAudiochat {
  private readonly logger = new Logger('Audiochat');

  // Presenti per certo: l'avvio si ferma senza. Si leggono una volta sola,
  // così il tipo dice ciò che la validazione ha già garantito.
  private readonly url = env.LIVEKIT_URL as string;
  private readonly chiave = env.LIVEKIT_API_KEY as string;
  private readonly segreto = env.LIVEKIT_API_SECRET as string;

  async apriCanale(canale: CanaleAudioDellAulaStudio): Promise<AccessoAlCanaleAudio | null> {
    try {
      const gettone = new AccessToken(this.chiave, this.segreto, {
        identity: canale.utenteId,
        ttl: DURATA_LASCIAPASSARE_SECONDI,
      });

      // I diritti sono i più stretti che permettano una conversazione:
      // entrare in **questa** stanza, pubblicare la propria voce, ascoltare
      // le altre. Niente amministrazione, niente elenco delle stanze, niente
      // dati condivisi — un gettone che sfugge non deve poter fare altro.
      gettone.addGrant({
        roomJoin: true,
        room: stanzaDiAula(canale.aulaStudioId),
        canPublish: true,
        canSubscribe: true,
        // A3: solo transito. Nessuna registrazione, e non si abilita per
        // sbaglio ciò che il vincolo esclude.
        recorder: false,
      });

      return {
        url: this.url,
        lasciapassare: await gettone.toJwt(),
        scadeIl: new Date(Date.now() + DURATA_LASCIAPASSARE_SECONDI * 1000).toISOString(),
      };
    } catch (errore) {
      // Coniare un gettone non dovrebbe fallire — è una firma, non una
      // chiamata. Se fallisce, l'aula non deve cadere con lui: si degrada
      // esattamente come con l'adattatore assente, e il perché resta nei log.
      this.logger.error(
        `Impossibile aprire il canale audio: ${errore instanceof Error ? errore.message : 'motivo ignoto'}`,
      );
      return null;
    }
  }
}
