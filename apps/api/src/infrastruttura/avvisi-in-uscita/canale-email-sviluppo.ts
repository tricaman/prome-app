import { Injectable, Logger } from '@nestjs/common';
import type {
  CanaleEmail,
  InvitoAlGruppoDaRecapitare,
  InvitoDaRecapitare,
} from './canale-email';

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

  /** Ultimo invito per destinatario, con lo stesso scopo. */
  private readonly ultimiInviti = new Map<string, InvitoDaRecapitare>();

  private readonly ultimiInvitiAlGruppo = new Map<string, InvitoAlGruppoDaRecapitare>();

  inviaCodiceAccesso(destinatario: string, codice: string, lingua: string): Promise<void> {
    this.ultimiCodici.set(destinatario.toLowerCase(), codice);
    this.logger.warn(
      `[SVILUPPO] Codice di accesso per ${destinatario} (lingua ${lingua}): ${codice} — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  inviaInvitoAulaStudio(
    destinatario: string,
    invito: InvitoDaRecapitare,
    lingua: string,
  ): Promise<void> {
    this.ultimiInviti.set(destinatario.toLowerCase(), invito);
    this.logger.warn(
      `[SVILUPPO] Invito all'aula «${invito.titoloAula}» per ${destinatario} (lingua ${lingua}): ${invito.collegamento} — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  inviaInvitoAlGruppo(
    destinatario: string,
    invito: InvitoAlGruppoDaRecapitare,
    lingua: string,
  ): Promise<void> {
    this.ultimiInvitiAlGruppo.set(destinatario.toLowerCase(), invito);
    this.logger.warn(
      `[SVILUPPO] Invito al gruppo «${invito.nomeGruppo}» per ${destinatario} (lingua ${lingua}): ${invito.collegamento} — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  /** Solo per i test: l'ultimo codice mandato a quell'indirizzo. */
  ultimoCodicePer(destinatario: string): string | undefined {
    return this.ultimiCodici.get(destinatario.toLowerCase());
  }

  /** Solo per i test: l'ultimo invito mandato a quell'indirizzo. */
  ultimoInvitoPer(destinatario: string): InvitoDaRecapitare | undefined {
    return this.ultimiInviti.get(destinatario.toLowerCase());
  }

  /** Solo per i test: l'ultimo invito a un gruppo mandato a quell'indirizzo. */
  ultimoInvitoAlGruppoPer(destinatario: string): InvitoAlGruppoDaRecapitare | undefined {
    return this.ultimiInvitiAlGruppo.get(destinatario.toLowerCase());
  }
}
