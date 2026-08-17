import { Injectable, Logger } from '@nestjs/common';
import type {
  CanaleEmail,
  InvitoAlGruppoDaRecapitare,
  InvitoDaRecapitare,
  NotificaDiCommentoDaRecapitare,
  RichiestaDiSupportoDaRecapitare,
  SegnalazioneDaRecapitare,
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

  /** Le richieste di supporto che sarebbero partite: le leggono i test. */
  private readonly richieste: RichiestaDiSupportoDaRecapitare[] = [];

  /** Ultimo invito per destinatario, con lo stesso scopo. */
  private readonly ultimiInviti = new Map<string, InvitoDaRecapitare>();

  /** Ultima notifica di commento per destinatario: la guardano i test. */
  private readonly ultimeNotificheCommento = new Map<string, NotificaDiCommentoDaRecapitare>();

  private readonly ultimiInvitiAlGruppo = new Map<string, InvitoAlGruppoDaRecapitare>();

  /**
   * Ad array e non per destinatario: le segnalazioni vanno tutte allo stesso
   * indirizzo di supporto, e i test le filtrano per soggetto.
   */
  private readonly segnalazioni: SegnalazioneDaRecapitare[] = [];

  inviaCodiceAccesso(destinatario: string, codice: string, lingua: string): Promise<void> {
    this.ultimiCodici.set(destinatario.toLowerCase(), codice);
    this.logger.warn(
      `[SVILUPPO] Codice di accesso per ${destinatario} (lingua ${lingua}): ${codice} — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  inviaNotificaCommento(
    destinatario: string,
    notifica: NotificaDiCommentoDaRecapitare,
    lingua: string,
  ): Promise<void> {
    this.ultimeNotificheCommento.set(destinatario.toLowerCase(), notifica);
    this.logger.warn(
      `[SVILUPPO] Notifica di commento per ${destinatario} (lingua ${lingua}): ${notifica.collegamento} — nessuna email inviata.`,
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

  inviaSegnalazione(
    destinatario: string,
    segnalazione: SegnalazioneDaRecapitare,
    lingua: string,
  ): Promise<void> {
    this.segnalazioni.push(segnalazione);
    // Nel log niente estratto: è contenuto di un utente, e i log non ne
    // portano mai. Chi sviluppa lo legge nell'anteprima email, non qui.
    this.logger.warn(
      `[SVILUPPO] Segnalazione ${segnalazione.tipo}/${segnalazione.motivo} su ${segnalazione.soggettoId} per ${destinatario} (lingua ${lingua}) — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  inviaRichiestaDiSupporto(
    destinatario: string,
    richiesta: RichiestaDiSupportoDaRecapitare,
    lingua: string,
  ): Promise<void> {
    this.richieste.push(richiesta);
    // Nel log niente testo: lo scrive una persona, e i log non portano mai
    // ciò che scrive una persona.
    this.logger.warn(
      `[SVILUPPO] Richiesta di supporto ${richiesta.categoria} da ${richiesta.utenteId} per ${destinatario} (lingua ${lingua}) — nessuna email inviata.`,
    );
    return Promise.resolve();
  }

  /** Solo per i test: le richieste di supporto che sarebbero partite. */
  richiesteDiSupportoDi(utenteId: string): RichiestaDiSupportoDaRecapitare[] {
    return this.richieste.filter((r) => r.utenteId === utenteId);
  }

  /** Solo per i test: le segnalazioni che sarebbero partite per quel soggetto. */
  segnalazioniPer(soggettoId: string): SegnalazioneDaRecapitare[] {
    return this.segnalazioni.filter((s) => s.soggettoId === soggettoId);
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

  /** Solo per i test: l'ultima notifica di commento mandata a quell'indirizzo. */
  ultimaNotificaCommentoPer(destinatario: string): NotificaDiCommentoDaRecapitare | undefined {
    return this.ultimeNotificheCommento.get(destinatario.toLowerCase());
  }
}
