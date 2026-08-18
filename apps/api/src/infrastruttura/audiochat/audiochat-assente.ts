import { Injectable, Logger } from '@nestjs/common';
import type { AccessoAlCanaleAudio, CanaleAudioDellAulaStudio, PortaAudiochat } from './audiochat';

/**
 * L'audiochat che non apre nessun canale.
 *
 * Non è un segnaposto da sostituire in fretta: è **RE4 reso eseguibile**, come
 * `TrasportoAssente` lo è per PE3. Con questo adattatore attivo l'aula funziona
 * al 100% in tutto ciò che non è audio — si entra, si scrive, si condividono
 * materiali, si moderano i permessi — e chi chiede di parlare riceve un rifiuto
 * spiegato invece di una schermata rotta.
 *
 * È anche la configurazione dei test, e per la stessa ragione di sempre: una
 * suite che passasse solo col fornitore acceso non direbbe nulla sul giorno in
 * cui quel fornitore è giù. Il giorno in cui qualcuno aggiungesse un'attesa
 * bloccante sull'audio dentro l'apertura della sala, è qui che si romperebbe.
 */
@Injectable()
export class AudiochatAssente implements PortaAudiochat {
  private readonly logger = new Logger('Audiochat');
  private readonly richieste: CanaleAudioDellAulaStudio[] = [];

  apriCanale(canale: CanaleAudioDellAulaStudio): Promise<AccessoAlCanaleAudio | null> {
    this.richieste.push(canale);
    if (this.richieste.length > 200) this.richieste.shift();
    this.logger.debug(`[assente] nessun canale aperto per l'aula ${canale.aulaStudioId}`);
    return Promise.resolve(null);
  }

  /** Solo per i test: chi avrebbe chiesto di parlare. */
  richiesti(): ReadonlyArray<CanaleAudioDellAulaStudio> {
    return this.richieste;
  }

  /** Solo per i test. */
  azzera(): void {
    this.richieste.length = 0;
  }
}
