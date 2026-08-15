import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type RichiestaDiCancellazione } from '@prisma/client';
import type { CancellazioneAccountResponse } from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { CancellazioneAccesso } from '../../infrastruttura/accesso/cancellazione-accesso';
import {
  MISURAZIONI,
  type MisurazioniDiUtilizzo,
} from '../../infrastruttura/misurazioni/misurazioni';
import { CancellazioneAulaStudioService } from '../aula-studio/cancellazione-aula-studio.service';
import { CancellazioneBachecaService } from '../bacheca/cancellazione-bacheca.service';
import { GruppoService } from '../gruppo/gruppo.service';
import { ProfiloService } from '../profilo/profilo.service';

export const GIORNI_DI_GRAZIA = 14;
export const GIORNI_TERMINE_V5 = 30;
export const GIORNI_ALLERTA = 25;

/** Le voci completate si ri-verificano ogni ora: è la ri-applicazione automatica. */
const RIVERIFICA_COMPLETATE_MS = 60 * 60 * 1000;

const GIORNO_MS = 24 * 60 * 60 * 1000;

/**
 * DETENTORI CENSITI — punto da aggiornare a ogni nuovo detentore di dati
 * personali (architecture-doc §7): un detentore non censito produce un residuo
 * che nessun sintomo rivela. La copia speculare vive nell'helper `residuoDi`
 * di test/cancellazione.spec.ts: si aggiornano insieme.
 *
 * Oggi: accesso.utente, accesso.sessione e accesso.credenziale (cascate),
 * accesso.verifica (per email finché nota, poi garanzia strutturale:
 * transazione unica + purga delle scadute), profilo.profilo,
 * profilo.impostazioni_di_privacy (cascata), bacheca.post.autoreId e
 * bacheca.commento.autoreId (anonimizzati), bacheca.allegato (segue il post,
 * file conservato), bacheca.allegato_in_attesa (+ file in archivio, eliminati),
 * aula_studio.partecipante (rimosso onorando AS2), aula_studio.invito
 * (eliminato), aula_studio.allegato_di_aula_studio (`caricatoDa` anonimizzato,
 * **file conservato**), aula_studio.messaggio_di_chat (anonimizzato),
 * aula_studio.fatto_in_uscita (payload con l'id).
 * Il registro stesso è l'eccezione sancita: conserva utente_id per progetto.
 *
 * Domani: gruppo.*, altre tabelle outbox, log solo se la loro conservazione
 * supererà i 14 giorni.
 */
const DETENTORI_CENSITI = ['accesso', 'profilo', 'bacheca', 'gruppo', 'aula_studio'] as const;

/**
 * CancellazioneDellAccount — componente TRASVERSALE, non un contesto di
 * dominio (architecture-doc: rivendica SE3). Orchestra la catena presso ogni
 * detentore e ne verifica l'esito, ma NON decide alcuna sorte: la sorte di
 * ciascun tipo la decide il modulo che possiede il dato — Bacheca sa che un
 * Post si anonimizza, Profilo sa che un Profilo si elimina.
 *
 * Non vive in Profilo perché lo renderebbe consumatore di Bacheca (la Context
 * Map vieta ogni dipendenza che risalga verso Profilo); non è distribuito nei
 * moduli perché la verifica del residuo deve essere TOTALE, e un esito totale
 * ha bisogno di un punto che conosca l'elenco dei detentori.
 */
@Injectable()
export class CancellazioneService {
  private readonly logger = new Logger('Cancellazione');

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilo: ProfiloService,
    private readonly bacheca: CancellazioneBachecaService,
    private readonly gruppi: GruppoService,
    private readonly aule: CancellazioneAulaStudioService,
    private readonly accesso: CancellazioneAccesso,
    @Inject(MISURAZIONI) private readonly misurazioni: MisurazioniDiUtilizzo,
  ) {}

  /**
   * La richiesta di cancellazione: apre la grazia di 14 giorni.
   *
   * Tre effetti, in quest'ordine: la voce nel registro (la fonte di verità),
   * il profilo nascosto (scompare subito dalle letture), la revoca di TUTTE
   * le sessioni — inclusa quella che sta facendo questa richiesta.
   *
   * Idempotente: una seconda richiesta ritorna la voce originale, date
   * comprese — il termine dei 30 giorni corre dalla prima. Trasformare un
   * doppio tap in un errore spaventerebbe senza proteggere niente.
   */
  async richiedi(utenteId: string): Promise<CancellazioneAccountResponse> {
    const voce = await this.apriVoce(utenteId);
    await this.profilo.segnaInCancellazione(utenteId);
    await this.accesso.revocaSessioniDi(utenteId);

    return {
      richiestaIl: voce.richiestaIl.toISOString(),
      riattivabileFinoAl: voce.eseguibileDal.toISOString(),
      scadenza: voce.scadenza.toISOString(),
    };
  }

  private async apriVoce(utenteId: string): Promise<RichiestaDiCancellazione> {
    const adesso = new Date();
    try {
      return await this.prisma.richiestaDiCancellazione.upsert({
        where: { utenteId },
        update: {},
        create: {
          utenteId,
          richiestaIl: adesso,
          eseguibileDal: new Date(adesso.getTime() + GIORNI_DI_GRAZIA * GIORNO_MS),
          scadenza: new Date(adesso.getTime() + GIORNI_TERMINE_V5 * GIORNO_MS),
        },
      });
    } catch (errore) {
      // Due richieste nello stesso istante: l'upsert può perdere la gara
      // sulla chiave primaria. La voce dell'altro va benissimo — è la stessa.
      if (errore instanceof Prisma.PrismaClientKnownRequestError && errore.code === 'P2002') {
        const voce = await this.prisma.richiestaDiCancellazione.findUnique({
          where: { utenteId },
        });
        if (voce) return voce;
      }
      throw errore;
    }
  }

  /**
   * L'annullamento al rientro, agganciato alla verifica del codice OTP.
   *
   * Il delete è CONDIZIONATO SUL TEMPO, in un solo statement: oltre la grazia
   * nessun annullamento può riuscire, prima della grazia nessuna catena può
   * partire — la gara fra rientro e worker si chiude qui, senza colonne di
   * stato. Oltre la grazia la sessione appena creata viene revocata:
   * nessuna sessione può esistere per un utente con richiesta oltre grazia.
   */
  async annullaSePendente(
    utenteId: string,
  ): Promise<'nessuna' | 'annullata' | 'oltre-grazia'> {
    const esito = await this.prisma.richiestaDiCancellazione.deleteMany({
      where: { utenteId, eseguibileDal: { gt: new Date() } },
    });

    if (esito.count === 1) {
      await this.profilo.annullaCancellazione(utenteId);
      return 'annullata';
    }

    const pendente = await this.prisma.richiestaDiCancellazione.findUnique({
      where: { utenteId },
    });
    if (!pendente) return 'nessuna';

    await this.accesso.revocaSessioniDi(utenteId);
    return 'oltre-grazia';
  }

  /**
   * Un giro completo, per l'unità lavoratrice (e per i test, a mano).
   *
   * Nell'ordine: purga delle verifiche OTP scadute; riconciliazione dei flag
   * di grazia (in entrambe le direzioni: sana i crash a metà richiesta o
   * annullamento, e i ripristini da backup); catena + verifica per le voci
   * eseguibili; ri-verifica oraria delle voci completate — è QUESTA la
   * ri-applicazione automatica dopo un ripristino: un residuo risorto viene
   * trovato e la catena ri-eseguita nello stesso giro; allerta oltre il 25°
   * giorno. Nei log SOLO utente_id e contatori, mai nomi o contenuti.
   */
  async eseguiGiro(): Promise<{
    catene: number;
    completate: number;
    residuiTrovati: number;
    inAllerta: number;
  }> {
    const adesso = new Date();
    let catene = 0;
    let completate = 0;
    let residuiTrovati = 0;

    await this.accesso.purgaVerificheScadute();
    await this.riconciliaFlagDiGrazia(adesso);

    // Le voci eseguibili: grazia finita, esito totale non ancora raggiunto.
    const eseguibili = await this.prisma.richiestaDiCancellazione.findMany({
      where: { eseguibileDal: { lte: adesso }, verificataATotaleIl: null },
    });
    for (const voce of eseguibili) {
      await this.eseguiCatena(voce.utenteId, voce);
      catene += 1;
      if (await this.verificaERegistra(voce.utenteId)) completate += 1;
    }

    // Le voci completate: la ri-verifica trova ciò che un ripristino ha fatto
    // risorgere, e lo rimuove di nuovo.
    const daRiverificare = await this.prisma.richiestaDiCancellazione.findMany({
      where: {
        verificataATotaleIl: { not: null },
        ultimaVerificaIl: { lt: new Date(adesso.getTime() - RIVERIFICA_COMPLETATE_MS) },
      },
    });
    for (const voce of daRiverificare) {
      const residuo = await this.contaResiduo(voce.utenteId);
      if (residuo.record + residuo.file === 0) {
        await this.registraEsito(voce.utenteId, residuo);
        continue;
      }
      residuiTrovati += 1;
      this.logger.warn(
        `Residuo risorto per l'utente ${voce.utenteId} (${residuo.record} record, ${residuo.file} file): ri-applico la catena`,
      );
      await this.eseguiCatena(voce.utenteId, voce);
      await this.verificaERegistra(voce.utenteId);
    }

    // L'allerta: al 25° giorno restano cinque giorni di margine — un avviso
    // al trentesimo informerebbe di una violazione anziché prevenirla.
    const inRitardo = await this.prisma.richiestaDiCancellazione.findMany({
      where: {
        verificataATotaleIl: null,
        richiestaIl: { lte: new Date(adesso.getTime() - GIORNI_ALLERTA * GIORNO_MS) },
      },
    });
    for (const voce of inRitardo) {
      this.logger.error(
        `Cancellazione oltre il ${GIORNI_ALLERTA}° giorno senza esito totale: utente ${voce.utenteId}, scadenza ${voce.scadenza.toISOString()}`,
      );
    }

    return { catene, completate, residuiTrovati, inAllerta: inRitardo.length };
  }

  /**
   * I flag di grazia sul Profilo, riconciliati in entrambe le direzioni:
   * una voce in grazia DEVE avere il flag (crash fra registro e flag, o
   * ripristino che ha resuscitato un profilo pulito), un profilo con il flag
   * ma senza voce NON deve averlo (crash fra annullamento e flag).
   */
  private async riconciliaFlagDiGrazia(adesso: Date): Promise<void> {
    const voci = await this.prisma.richiestaDiCancellazione.findMany({
      select: { utenteId: true, eseguibileDal: true },
    });

    for (const voce of voci) {
      if (voce.eseguibileDal > adesso) await this.profilo.segnaInCancellazione(voce.utenteId);
    }

    await this.prisma.profilo.updateMany({
      where: {
        inCancellazioneDal: { not: null },
        utenteId: { notIn: voci.map((v) => v.utenteId) },
      },
      data: { inCancellazioneDal: null },
    });
  }

  /**
   * La catena presso ogni detentore, nell'ordine che non espone mai un id
   * reale: PRIMA Bacheca (finché l'anonimizzazione è in corso il profilo
   * esiste ancora, nascosto dal flag, e i post non anonimizzati restano
   * invisibili), POI Profilo, POI Accesso. Ogni passo è idempotente e un
   * passo fallito non ferma gli altri che non dipendono da lui: il giro dopo
   * riprova.
   */
  private async eseguiCatena(
    utenteId: string,
    voce: RichiestaDiCancellazione,
  ): Promise<void> {
    const marca: Prisma.RichiestaDiCancellazioneUpdateInput = {};

    let bachecaCompleta = false;
    try {
      await this.bacheca.anonimizzaContributiDi(utenteId);
      bachecaCompleta = true;
      const residui = await this.bacheca.eliminaResiduiDi(utenteId);
      if (residui.rimasti === 0 && !voce.bachecaAnonimizzataIl) {
        marca.bachecaAnonimizzataIl = new Date();
      }
    } catch (errore) {
      this.logger.warn(
        `Passo bacheca fallito per l'utente ${utenteId}: si riprova al prossimo giro`,
        errore instanceof Error ? errore.stack : undefined,
      );
    }

    // Gruppo: si esce da tutti i gruppi, e dove si lascerebbe uno spazio
    // senza moderatori il ruolo passa al membro più anziano — un gruppo che
    // nessuno può amministrare sarebbe un danno agli altri, non a chi se ne va.
    try {
      await this.gruppi.rimuoviAppartenenzeDi(utenteId);
      if (!voce.gruppiLiberatiIl) marca.gruppiLiberatiIl = new Date();
    } catch (errore) {
      this.logger.warn(
        `Passo gruppo fallito per l'utente ${utenteId}: si riprova al prossimo giro`,
        errore instanceof Error ? errore.stack : undefined,
      );
    }

    // Aula studio: il partecipante esce onorando AS2, gli inviti spariscono, e
    // il materiale resta con il solo caricatore anonimizzato — è la sola
    // eccezione alla cancellazione, dichiarata nell'informativa.
    let auleComplete = false;
    try {
      const indirizzo = await this.accesso.indirizzoDi(utenteId);
      await this.aule.rimuoviPartecipazioniDi(utenteId);
      await this.aule.eliminaInvitiDi(utenteId, indirizzo);
      await this.aule.anonimizzaMaterialiDi(utenteId);
      await this.aule.anonimizzaMessaggiDi(utenteId);
      await this.aule.eliminaFattiDi(utenteId);
      auleComplete = true;
      if (!voce.auleStudioLiberateIl) marca.auleStudioLiberateIl = new Date();
    } catch (errore) {
      this.logger.warn(
        `Passo aula studio fallito per l'utente ${utenteId}: si riprova al prossimo giro`,
        errore instanceof Error ? errore.stack : undefined,
      );
    }
    void auleComplete;

    // Il profilo cade SOLO a bacheca anonimizzata: eliminarlo prima aprirebbe
    // la finestra in cui un post con l'id reale appare «senza profilo», cioè
    // visibile a tutti e collegabile.
    if (bachecaCompleta) {
      try {
        await this.profilo.eliminaDatiDi(utenteId);
        if (!voce.profiloEliminatoIl) marca.profiloEliminatoIl = new Date();
      } catch (errore) {
        this.logger.warn(
          `Passo profilo fallito per l'utente ${utenteId}: si riprova al prossimo giro`,
          errore instanceof Error ? errore.stack : undefined,
        );
      }
    }

    try {
      await this.accesso.eliminaUtente(utenteId);
      if (!voce.accessoEliminatoIl) marca.accessoEliminatoIl = new Date();
    } catch (errore) {
      this.logger.warn(
        `Passo accesso fallito per l'utente ${utenteId}: si riprova al prossimo giro`,
        errore instanceof Error ? errore.stack : undefined,
      );
    }

    if (Object.keys(marca).length) {
      await this.prisma.richiestaDiCancellazione.update({
        where: { utenteId },
        data: marca,
      });
    }
  }

  /**
   * Verifica del residuo (SE3): la scansione per utente_id presso TUTTI i
   * detentori censiti. «Totale» significa che ogni interrogazione è riuscita:
   * se una lancia, l'esito non si registra e si ritenta al giro dopo — un
   * esito parziale che si spaccia per totale è il difetto peggiore possibile.
   */
  private async contaResiduo(utenteId: string): Promise<{ record: number; file: number }> {
    // I proprietari, insieme: l'elenco è DETENTORI_CENSITI.
    void DETENTORI_CENSITI;
    const indirizzo = await this.accesso.indirizzoDi(utenteId);
    const [accesso, profilo, bacheca, gruppi, aule] = await Promise.all([
      this.accesso.contaResiduiDi(utenteId),
      this.profilo.contaResiduiDi(utenteId),
      this.bacheca.contaResiduiDi(utenteId),
      this.gruppi.contaResiduiDi(utenteId),
      this.aule.contaResiduiDi(utenteId, indirizzo),
    ]);
    return {
      record: accesso + profilo + bacheca.record + gruppi + aule,
      file: bacheca.file,
    };
  }

  private async registraEsito(
    utenteId: string,
    residuo: { record: number; file: number },
  ): Promise<boolean> {
    const adesso = new Date();
    const voce = await this.prisma.richiestaDiCancellazione.findUnique({
      where: { utenteId },
    });
    if (!voce) return false;

    const appenaCompletata =
      residuo.record === 0 && residuo.file === 0 && !voce.verificataATotaleIl;

    await this.prisma.richiestaDiCancellazione.update({
      where: { utenteId },
      data: {
        ultimaVerificaIl: adesso,
        ultimoResiduoRecord: residuo.record,
        ultimoResiduoFile: residuo.file,
        // La prova di SE3 si scrive una volta e non si azzera mai: la verità
        // corrente sta in ultimaVerificaIl / ultimoResiduo*.
        ...(appenaCompletata ? { verificataATotaleIl: adesso } : {}),
      },
    });

    if (appenaCompletata) {
      // Senza utenteId: il conteggio basta, e quell'id appena cancellato non
      // deve rinascere in una serie storica.
      this.misurazioni.registra('cancellazione_completata');
      this.logger.log(`Cancellazione completata: residuo zero per l'utente ${utenteId}`);
    }
    return appenaCompletata;
  }

  private async verificaERegistra(utenteId: string): Promise<boolean> {
    try {
      const residuo = await this.contaResiduo(utenteId);
      return await this.registraEsito(utenteId, residuo);
    } catch (errore) {
      this.logger.warn(
        `Verifica del residuo fallita per l'utente ${utenteId}: esito non registrato, si riprova`,
        errore instanceof Error ? errore.stack : undefined,
      );
      return false;
    }
  }
}
