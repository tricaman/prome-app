import { Injectable, Logger } from '@nestjs/common';
import type { CanaleEmail } from './canale-email';

/**
 * Canale email di sviluppo: scrive il codice nei log e non manda niente.
 *
 * Serve a lavorare sull'accesso senza un fornitore email configurato — lo
 * spike Brevo/Resend è ancora aperto — e a provare il percorso completo nei
 * test, dove leggere il codice dal log è l'unico modo per proseguire.
 *
 * **In produzione è vietato** e la validazione dell'ambiente lo impedisce
 * all'avvio: un codice di accesso stampato nei log è un codice regalato a
 * chiunque possa leggerli.
 */
@Injectable()
export class CanaleEmailSviluppo implements CanaleEmail {
  private readonly logger = new Logger('AvvisiInUscita');

  /** Ultimo codice per destinatario: lo leggono i test, non il codice di produzione. */
  private readonly ultimiCodici = new Map<string, string>();

  inviaCodiceAccesso(destinatario: string, codice: string, lingua: string): Promise<void> {
    this.ultimiCodici.set(destinatario.toLowerCase(), codice);
    this.logger.warn(
      `[SVILUPPO] Codice di accesso per ${destinatario} (lingua ${lingua}): ${codice} — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  /** Solo per i test: l'ultimo codice mandato a quell'indirizzo. */
  ultimoCodicePer(destinatario: string): string | undefined {
    return this.ultimiCodici.get(destinatario.toLowerCase());
  }
}
