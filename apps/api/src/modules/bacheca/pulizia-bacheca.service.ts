import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ARCHIVIO_DI_FILE,
  DURATA_PREAUTORIZZAZIONE_SECONDI,
  type ArchivioDiFile,
} from '../../infrastruttura/archivio-file/archivio-file';

/** Quanti record toccare per giro: un ciclo non deve mai diventare lungo. */
const PER_GIRO = 500;

/**
 * Le pulizie della Bacheca, eseguite dall'unità lavoratrice.
 *
 * Raccolgono ciò che il modello lascia deliberatamente indietro:
 *
 * 1. **I commenti di un post eliminato.** Il Commento è un aggregato autonomo
 *    e riferisce il post per identità, non per vincolo (C3): eliminarli nella
 *    stessa transazione del post significherebbe far dipendere la
 *    cancellazione dal numero di commenti. Nessuno li sta aspettando, quindi
 *    spariscono qui.
 * 2. **Le prenotazioni di caricamento mai adottate**, con i loro file. Chi
 *    apre il composer, sceglie un file e poi cambia idea lascia un file senza
 *    riferimenti: non è un allegato orfano — B4 resta intatta — ma è spazio
 *    occupato per niente.
 *
 * Quando arriverà il recapito dei fatti di dominio (E3), il primo dei due
 * diventerà la reazione a un fatto invece di una riconciliazione a tempo. Il
 * secondo resta comunque una pulizia periodica: nessun fatto viene emesso
 * quando qualcuno *non* fa qualcosa.
 */
@Injectable()
export class PuliziaBachecaService {
  private readonly logger = new Logger('PuliziaBacheca');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ARCHIVIO_DI_FILE) private readonly archivio: ArchivioDiFile,
  ) {}

  /** Un giro completo. Ritorna quanto ha raccolto, per il log e per i test. */
  async eseguiGiro(): Promise<{ commenti: number; prenotazioni: number }> {
    const commenti = await this.rimuoviCommentiSenzaPost();
    const prenotazioni = await this.rimuoviPrenotazioniScadute();

    if (commenti || prenotazioni) {
      this.logger.log(
        `Pulizia: ${commenti} commenti senza post, ${prenotazioni} caricamenti abbandonati`,
      );
    }
    return { commenti, prenotazioni };
  }

  /**
   * I commenti il cui post non esiste più.
   *
   * Si guardano i `postId` distinti e non i singoli commenti: un post con
   * duecento commenti è una domanda sola, non duecento.
   */
  private async rimuoviCommentiSenzaPost(): Promise<number> {
    const riferiti = await this.prisma.commento.findMany({
      distinct: ['postId'],
      select: { postId: true },
      take: PER_GIRO,
    });
    if (!riferiti.length) return 0;

    const postId = riferiti.map((r) => r.postId);
    const vivi = await this.prisma.post.findMany({
      where: { id: { in: postId } },
      select: { id: true },
    });

    const insiemeVivi = new Set(vivi.map((p) => p.id));
    const morti = postId.filter((id) => !insiemeVivi.has(id));
    if (!morti.length) return 0;

    const esito = await this.prisma.commento.deleteMany({ where: { postId: { in: morti } } });
    return esito.count;
  }

  /**
   * Le prenotazioni scadute, con i file che nessuno ha adottato.
   *
   * Si aspetta il doppio della durata dell'autorizzazione prima di toccarle:
   * una prenotazione appena emessa può avere un caricamento in corso, e
   * cancellarla mentre i byte salgono farebbe fallire una pubblicazione
   * legittima.
   */
  private async rimuoviPrenotazioniScadute(): Promise<number> {
    const soglia = new Date(Date.now() - DURATA_PREAUTORIZZAZIONE_SECONDI * 2 * 1000);
    const abbandonate = await this.prisma.allegatoInAttesa.findMany({
      where: { creatoIl: { lt: soglia } },
      take: PER_GIRO,
    });
    if (!abbandonate.length) return 0;

    for (const prenotazione of abbandonate) {
      // Un file che non si riesce a togliere non deve bloccare il giro: al
      // prossimo passaggio ci riproviamo.
      await this.archivio.rimuovi(prenotazione.chiave).catch(() => undefined);
    }

    const esito = await this.prisma.allegatoInAttesa.deleteMany({
      where: { id: { in: abbandonate.map((a) => a.id) } },
    });
    return esito.count;
  }
}
