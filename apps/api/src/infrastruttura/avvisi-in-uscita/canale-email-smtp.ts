import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { I18nService } from 'nestjs-i18n';
import { env } from '../../config/env';
import { DURATA_CODICE_SECONDI } from '../accesso/better-auth';
import type { CanaleEmail } from './canale-email';

/**
 * Invio via SMTP.
 *
 * È **un adattatore solo per qualunque fornitore**: Brevo, Resend e chiunque
 * altro parlano SMTP, quindi lo spike che deve sceglierne uno non cambia una
 * riga di codice — cambia quattro valori nel file dei segreti. Era l'unico
 * modo per sbloccare la messa in esercizio senza decidere al posto di chi deve
 * scegliere.
 *
 * Il messaggio è in **testo semplice oltre che in HTML**: un codice di sei
 * cifre non ha bisogno di impaginazione, e le email di solo HTML finiscono
 * nello spam molto più spesso.
 */
@Injectable()
export class CanaleEmailSmtp implements CanaleEmail {
  private readonly logger = new Logger('AvvisiInUscita');
  private readonly trasporto: Transporter;

  constructor(private readonly i18n: I18nService) {
    this.trasporto = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // 465 è TLS implicito, 587 parte in chiaro e sale con STARTTLS: è la
      // convenzione universale, quindi si deduce dalla porta invece di
      // chiedere un'altra variabile che si può solo sbagliare.
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_UTENTE, pass: env.SMTP_PASSWORD },
    });
  }

  async inviaCodiceAccesso(destinatario: string, codice: string, lingua: string): Promise<void> {
    const minuti = Math.round(DURATA_CODICE_SECONDI / 60);
    const testi = {
      oggetto: this.traduci('email.codice.oggetto', lingua, { codice }),
      titolo: this.traduci('email.codice.titolo', lingua),
      istruzioni: this.traduci('email.codice.istruzioni', lingua, { minuti }),
      ignora: this.traduci('email.codice.ignora', lingua),
    };

    await this.trasporto.sendMail({
      from: env.SMTP_MITTENTE,
      to: destinatario,
      subject: testi.oggetto,
      text: `${testi.titolo}\n\n${codice}\n\n${testi.istruzioni}\n\n${testi.ignora}`,
      html: corpoHtml(codice, testi),
    });

    // Nel log finisce che è partita, mai il codice: chi legge i log non deve
    // poter entrare negli account altrui.
    this.logger.log(`Codice di accesso inviato (lingua ${lingua})`);
  }

  /**
   * Anche l'email è tradotta lato server, come tutto il resto: la lingua
   * arriva dalla richiesta che ha chiesto il codice.
   */
  private traduci(chiave: string, lingua: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(chiave, { lang: lingua, args }) as string;
  }
}

/** Corpo HTML: una tabella e nessun foglio di stile esterno, come vuole la posta. */
function corpoHtml(
  codice: string,
  testi: { titolo: string; istruzioni: string; ignora: string },
): string {
  return `<!doctype html><html><body style="margin:0;background:#F7F9FB;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:480px;background:#fff;border:1px solid #E6EAF0;border-radius:20px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:32px">
        <p style="margin:0 0 20px;font-size:20px;font-weight:800;color:#181D25">${testi.titolo}</p>
        <p style="margin:0 0 8px;font-size:34px;font-weight:800;letter-spacing:8px;color:#0A705F">${codice}</p>
        <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#5A6C87">${testi.istruzioni}</p>
        <p style="margin:16px 0 0;font-size:12.5px;line-height:1.6;color:#6C809D">${testi.ignora}</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
