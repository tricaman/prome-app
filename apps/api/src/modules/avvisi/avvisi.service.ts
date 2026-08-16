import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RisorsaDiNotifica, TipoDiNotifica } from '@prisma/client';
import {
  CANALE_NOTIFICHE,
  type CanaleNotifiche,
  type TipoDiAvviso,
} from '../../infrastruttura/avvisi-in-uscita/canale-notifiche';
import {
  CANALE_EMAIL,
  type CanaleEmail,
} from '../../infrastruttura/avvisi-in-uscita/canale-email';
import {
  TRASPORTO_TEMPO_REALE,
  stanzaDiUtente,
  type TrasportoInTempoReale,
} from '../../infrastruttura/tempo-reale/trasporto';
import { env } from '../../config/env';
import { PortaIdentitaUtente } from '../profilo/porta-identita-utente';
import { ProfiloService } from '../profilo/profilo.service';
import { NotificheInAppService } from '../profilo/notifiche-in-app.service';

/**
 * Un avviso da emettere: la riga per la campanella e, per chi lo vuole, i
 * canali che interrompono.
 *
 * `titolo` e `corpo` restano CHIAVI i18n per il canale push (che ancora non
 * recapita): la riga in-app non li conserva nemmeno — il client traduce dal
 * `tipo`. Il `percorso` è interno all'app: serve al push di domani e alla CTA
 * dell'email di oggi, mai a trasportare un dato personale.
 */
export interface AvvisoDaEmettere {
  tipo: TipoDiNotifica;
  risorsaTipo: RisorsaDiNotifica;
  risorsaId: string;
  /** Una per fatto (commentoId, invitoId): è la deduplica dell'at-least-once. */
  chiaveDeduplicazione: string;
  percorso: string;
  titolo: string;
  corpo: string;
}

/** L'asse di preferenza che governa un tipo: due assi, tre tipi. */
const asseDi = (tipo: TipoDiNotifica): TipoDiAvviso =>
  tipo === 'COMMENTO' ? 'commento' : 'invito';

/**
 * Chi va avvisato, di che cosa, e su quali canali.
 *
 * Sta fra i contesti che **producono** gli avvisi — Bacheca, Aula studio,
 * Gruppo — e i canali che li recapitano, e possiede le decisioni che nessun
 * produttore saprebbe prendere da solo: se quella persona va avvisata, e se
 * vuole ancora essere interrotta.
 *
 * **Non è un contesto di dominio** e non ne importa più di uno: interroga
 * Profilo, che possiede la persona, la sua casella e le sue preferenze.
 *
 * Le regole, e il loro ordine:
 * - **mai a sé stessi** e **mai fra coppie bloccate** (letta all'istante):
 *   queste due spengono tutto, riga compresa;
 * - **la riga nasce sempre**, dopo quelle due: le preferenze significano
 *   «non interrompermi», non «nascondimi l'informazione» — chi apre la
 *   campanella trova tutto;
 * - **i canali partono solo se la riga è nuova**: l'outbox consegna
 *   at-least-once, e la seconda consegna trova la riga e si ferma lì —
 *   niente doppio push, niente doppia email;
 * - **la preferenza si legge nell'istante dell'invio** e governa i canali:
 *   push (oggi senza fornitore) ed email (solo il commento: gli inviti hanno
 *   già la loro email, che viaggia per indirizzo e serve ad accettare);
 * - **mai un dato personale in ciò che esce**: la riga porta tipo e
 *   riferimento, il push chiavi i18n, l'email il solo collegamento.
 */
@Injectable()
export class AvvisiService {
  private readonly logger = new Logger('Avvisi');

  constructor(
    private readonly profilo: ProfiloService,
    private readonly identita: PortaIdentitaUtente,
    private readonly notificheInApp: NotificheInAppService,
    @Inject(CANALE_NOTIFICHE) private readonly canale: CanaleNotifiche,
    @Inject(CANALE_EMAIL) private readonly email: CanaleEmail,
    @Inject(TRASPORTO_TEMPO_REALE) private readonly trasporto: TrasportoInTempoReale,
  ) {}

  /**
   * Emette un avviso, se c'è ancora qualcuno da avvisare.
   *
   * Non ritorna nulla e non lancia: chi produce un fatto non deve poter
   * fallire perché un avviso non è partito. Un commento resta scritto, un
   * invito resta valido — e la riga, se è nata, resta nella campanella.
   */
  async avvisa(
    destinatarioId: string,
    avviso: AvvisoDaEmettere,
    autoreId?: string,
  ): Promise<void> {
    // Mai a sé stessi. Il confronto sta qui e non nei produttori, perché è la
    // stessa regola per tutti, e le copie divergerebbero.
    if (autoreId && autoreId === destinatarioId) return;

    try {
      // Mai fra persone in coppia bloccata, in nessuna direzione — letta
      // **all'istante dell'invio**: un commento nato visibile e consegnato
      // dopo il blocco non deve più suonare, né comparire in campanella.
      if (autoreId && (await this.profilo.esisteBloccoFra(destinatarioId, autoreId))) return;

      // La riga, sempre: è la fonte di verità della campanella. Se non è
      // nuova, il fatto è già stato elaborato una volta e i canali sono già
      // partiti (o già decisi): rimandarli sarebbe il doppio avviso che la
      // deduplica esiste per impedire.
      const { id, nuova } = await this.notificheInApp.registra(destinatarioId, {
        tipo: avviso.tipo,
        risorsaTipo: avviso.risorsaTipo,
        risorsaId: avviso.risorsaId,
        chiaveDeduplicazione: avviso.chiaveDeduplicazione,
      });
      if (!nuova) return;

      // Il badge, subito: nel dato viaggia il solo id della riga — il client
      // non lo legge nemmeno, invalida e richiede. Dal worker (i commenti via
      // outbox) il server WS non c'è e questo degrada in niente: copre il
      // polling del client.
      await this.trasporto.pubblicaInStanza(stanzaDiUtente(destinatarioId), 'notifica', { id });

      // I canali che interrompono, secondo la preferenza letta adesso.
      const dispositivi = await this.profilo.dispositiviDaAvvisare(
        destinatarioId,
        asseDi(avviso.tipo),
      );
      if (dispositivi.length) {
        await this.canale.recapita(dispositivi, {
          percorso: avviso.percorso,
          titolo: avviso.titolo,
          corpo: avviso.corpo,
        });
      }

      // L'email accompagna il solo commento: gli inviti hanno già la loro,
      // che viaggia per indirizzo e serve ad accettare. La lingua è quella
      // degli inviti — 'it' — finché una lingua per persona non esiste.
      if (avviso.tipo === 'COMMENTO' && (await this.profilo.preferenzaAccesa(destinatarioId, 'commento'))) {
        const indirizzo = await this.identita.indirizzoDi(destinatarioId);
        if (indirizzo) {
          await this.email.inviaNotificaCommento(
            indirizzo,
            { collegamento: `${env.URL_APP_WEB}${avviso.percorso}` },
            'it',
          );
        }
      }
    } catch (errore) {
      // Il `catch` è la promessa del metodo, resa vera: senza, un errore qui
      // farebbe fallire la richiesta di chi invita, o rimetterebbe in coda un
      // fatto già consegnato. Un avviso perso è la degradazione giusta — chi
      // apre l'app trova comunque ciò che è successo.
      this.logger.warn(`Avviso non partito (${avviso.tipo}): ${(errore as Error).message}`);
    }
  }

  /**
   * Come sopra, ma partendo da un **indirizzo email**: è la forma in cui
   * viaggiano gli inviti, che si mandano anche a chi non è ancora iscritto.
   *
   * Se dietro quell'indirizzo non c'è nessuno non succede niente — nemmeno la
   * riga, perché non c'è una casella in cui metterla — e chi ha invitato non
   * se ne accorge in alcun modo: la risoluzione avviene qui e non torna mai
   * al chiamante.
   */
  async avvisaIndirizzo(
    indirizzo: string,
    avviso: AvvisoDaEmettere,
    autoreId?: string,
  ): Promise<void> {
    try {
      const destinatarioId = await this.identita.utenteIdPerIndirizzo(indirizzo);
      if (!destinatarioId) return;
      await this.avvisa(destinatarioId, avviso, autoreId);
    } catch (errore) {
      this.logger.warn(`Avviso non partito (${avviso.tipo}): ${(errore as Error).message}`);
    }
  }
}
