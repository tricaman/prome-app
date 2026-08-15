import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { I18nService } from 'nestjs-i18n';
import { env } from '../../config/env';
import { DURATA_CODICE_SECONDI } from '../accesso/better-auth';
import type {
  CanaleEmail,
  InvitoAlGruppoDaRecapitare,
  InvitoDaRecapitare,
} from './canale-email';
import {
  azione,
  codice as bloccoCodice,
  componiEmail,
  nota,
  paragrafo,
  separatore,
  titolo,
  type ContenutoEmail,
  type EmailComposta,
  type TestiInvolucro,
} from './modello-email';

/**
 * Invio via SMTP.
 *
 * È **un adattatore solo per qualunque fornitore**: Brevo, Resend e chiunque
 * altro parlano SMTP, quindi lo spike che deve sceglierne uno non cambia una
 * riga di codice — cambia quattro valori nel file dei segreti. Era l'unico
 * modo per sbloccare la messa in esercizio senza decidere al posto di chi deve
 * scegliere.
 *
 * **Qui non si scrive HTML.** Ogni messaggio si dichiara come una sequenza di
 * blocchi e passa da `componiEmail`, che gli dà l'involucro comune: stessa
 * scheda, stesso marchio, stesso piè di pagina, stessa parte in testo semplice
 * ricavata dagli stessi blocchi. È il motivo per cui questa classe è corta e
 * per cui la ventesima email somiglierà alla prima.
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
    const t = (chiave: string, args?: Record<string, unknown>) =>
      this.traduci(`email.codice.${chiave}`, lingua, args);

    await this.recapita(destinatario, lingua, {
      oggetto: t('oggetto', { codice }),
      anteprima: t('anteprima', { minuti }),
      blocchi: [
        titolo(t('titolo')),
        bloccoCodice(codice),
        paragrafo(t('istruzioni', { minuti })),
        separatore(),
        nota(t('ignora')),
      ],
    });

    // Nel log finisce che è partita, mai il codice: chi legge i log non deve
    // poter entrare negli account altrui.
    this.logger.log(`Codice di accesso inviato (lingua ${lingua})`);
  }

  async inviaInvitoAulaStudio(
    destinatario: string,
    invito: InvitoDaRecapitare,
    lingua: string,
  ): Promise<void> {
    const scadenza = invito.scadeIl.toLocaleDateString(lingua === 'en' ? 'en-GB' : 'it-IT', {
      day: 'numeric',
      month: 'long',
    });
    const argomenti = {
      invitante: invito.invitatoDa,
      titoloAula: invito.titoloAula,
      scadenza,
    };
    const t = (chiave: string) => this.traduci(`email.invitoAula.${chiave}`, lingua, argomenti);

    await this.recapita(destinatario, lingua, {
      oggetto: t('oggetto'),
      anteprima: t('anteprima'),
      blocchi: [
        titolo(t('titolo')),
        paragrafo(t('istruzioni')),
        azione(t('azione'), invito.collegamento),
        nota(t('scadenza')),
        separatore(),
        nota(t('ignora')),
      ],
    });

    // Nel log finisce che è partito, mai chi ha invitato chi.
    this.logger.log(`Invito all'aula studio inviato (lingua ${lingua})`);
  }

  async inviaInvitoAlGruppo(
    destinatario: string,
    invito: InvitoAlGruppoDaRecapitare,
    lingua: string,
  ): Promise<void> {
    const scadenza = invito.scadeIl.toLocaleDateString(lingua === 'en' ? 'en-GB' : 'it-IT', {
      day: 'numeric',
      month: 'long',
    });
    const argomenti = {
      invitante: invito.invitatoDa,
      nomeGruppo: invito.nomeGruppo,
      scadenza,
    };
    const t = (chiave: string) => this.traduci(`email.invitoGruppo.${chiave}`, lingua, argomenti);

    await this.recapita(destinatario, lingua, {
      oggetto: t('oggetto'),
      anteprima: t('anteprima'),
      blocchi: [
        titolo(t('titolo')),
        paragrafo(t('istruzioni')),
        azione(t('azione'), invito.collegamento),
        nota(t('scadenza')),
        separatore(),
        nota(t('ignora')),
      ],
    });

    this.logger.log(`Invito al gruppo inviato (lingua ${lingua})`);
  }

  /**
   * L'unico punto che parla con il trasporto.
   *
   * Ogni email esce da qui, quindi ogni email ha il marchio in linea e le due
   * parti — HTML e testo semplice — coerenti fra loro: non c'è una seconda
   * strada da cui possa uscirne una senza.
   */
  private async recapita(
    destinatario: string,
    lingua: string,
    contenuto: ContenutoEmail,
  ): Promise<void> {
    const messaggio: EmailComposta = componiEmail(contenuto, lingua, this.testiInvolucro(lingua));

    await this.trasporto.sendMail({
      from: env.SMTP_MITTENTE,
      to: destinatario,
      subject: messaggio.oggetto,
      text: messaggio.testo,
      html: messaggio.html,
      attachments: [...messaggio.allegati],
    });
  }

  /** I testi fissi dell'involucro, nella lingua della richiesta. */
  private testiInvolucro(lingua: string): TestiInvolucro {
    return {
      marchio: this.traduci('email.involucro.marchio', lingua),
      piedeMarchio: this.traduci('email.involucro.piedeMarchio', lingua),
      piedeNota: this.traduci('email.involucro.piedeNota', lingua),
    };
  }

  /**
   * Anche l'email è tradotta lato server, come tutto il resto: la lingua
   * arriva dalla richiesta che ha chiesto il codice.
   */
  private traduci(chiave: string, lingua: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(chiave, { lang: lingua, args }) as string;
  }
}
