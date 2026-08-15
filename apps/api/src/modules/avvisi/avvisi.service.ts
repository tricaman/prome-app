import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CANALE_NOTIFICHE,
  type CanaleNotifiche,
  type TipoDiAvviso,
} from '../../infrastruttura/avvisi-in-uscita/canale-notifiche';
import { PortaIdentitaUtente } from '../profilo/porta-identita-utente';
import { ProfiloService } from '../profilo/profilo.service';

/**
 * Chi va avvisato, di che cosa, e con quali parole.
 *
 * Sta fra i contesti che **producono** gli avvisi — Bacheca e Aula studio — e
 * il canale che li recapita, e possiede la sola decisione che nessuno dei due
 * saprebbe prendere da solo: se quella persona vuole ancora essere
 * interrotta, e su quali apparecchi.
 *
 * **Non è un contesto di dominio** e non ne importa più di uno: interroga
 * Profilo, che possiede la persona e le sue preferenze, e parla con la porta.
 * I produttori restano produttori.
 *
 * Tre regole che vivono qui, e nei test:
 * - **mai a sé stessi**: nessuno vuole sapere di aver commentato il proprio
 *   post, e un avviso così non è un fastidio ma un errore visibile;
 * - **mai a chi l'ha spento**, e la preferenza si legge nell'istante
 *   dell'invio, non da una copia presa quando il fatto è nato;
 * - **mai un dato personale nel messaggio**: il titolo e il corpo sono frasi
 *   fisse e tradotte, e ciò che identifica il contenuto viaggia nel percorso,
 *   che si apre dentro l'app dove le regole di visibilità valgono ancora.
 */
@Injectable()
export class AvvisiService {
  private readonly logger = new Logger('Avvisi');

  constructor(
    private readonly profilo: ProfiloService,
    private readonly identita: PortaIdentitaUtente,
    @Inject(CANALE_NOTIFICHE) private readonly canale: CanaleNotifiche,
  ) {}

  /**
   * Recapita un avviso, se c'è ancora qualcuno da avvisare.
   *
   * Non ritorna nulla e non lancia: chi produce un fatto non deve poter
   * fallire perché un avviso non è partito. Un commento resta scritto, un
   * invito resta valido.
   */
  async avvisa(
    destinatarioId: string,
    tipo: TipoDiAvviso,
    avviso: { percorso: string; titolo: string; corpo: string },
    autoreId?: string,
  ): Promise<void> {
    // Mai a sé stessi. Il confronto sta qui e non nei produttori, perché è la
    // stessa regola per tutti e due, e due copie divergerebbero.
    if (autoreId && autoreId === destinatarioId) return;

    try {
      const dispositivi = await this.profilo.dispositiviDaAvvisare(destinatarioId, tipo);
      if (!dispositivi.length) return;
      await this.canale.recapita(dispositivi, avviso);
    } catch (errore) {
      // Il `catch` è la promessa scritta sopra, resa vera: senza, un errore
      // qui farebbe fallire la richiesta di chi invita, o rimetterebbe in
      // coda un fatto già consegnato. Un avviso perso è la degradazione
      // giusta — chi apre l'app trova comunque ciò che è successo.
      this.logger.warn(`Avviso non partito (${tipo}): ${(errore as Error).message}`);
    }
  }

  /**
   * Come sopra, ma partendo da un **indirizzo email**: è la forma in cui
   * viaggiano gli inviti, che si mandano anche a chi non è ancora iscritto.
   *
   * Se dietro quell'indirizzo non c'è nessuno non succede niente, e chi ha
   * invitato non se ne accorge in alcun modo: la risoluzione avviene qui e
   * non torna mai al chiamante.
   */
  async avvisaIndirizzo(
    indirizzo: string,
    tipo: TipoDiAvviso,
    avviso: { percorso: string; titolo: string; corpo: string },
    autoreId?: string,
  ): Promise<void> {
    try {
      const destinatarioId = await this.identita.utenteIdPerIndirizzo(indirizzo);
      if (!destinatarioId) return;
      await this.avvisa(destinatarioId, tipo, avviso, autoreId);
    } catch (errore) {
      this.logger.warn(`Avviso non partito (${tipo}): ${(errore as Error).message}`);
    }
  }
}
