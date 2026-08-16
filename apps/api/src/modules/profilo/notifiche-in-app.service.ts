import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, type Notifica, type RisorsaDiNotifica, type TipoDiNotifica } from '@prisma/client';
import type {
  ConteggioNotificheResponse,
  NotificaResponse,
  PaginatedResult,
} from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions';
import { ProfiloErrorCode } from './constants/error-codes';

/** Le lette si conservano trenta giorni: la campanella è un segnale, non un archivio. */
const CONSERVAZIONE_LETTE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * La casella delle notifiche: le righe che la campanella conta e l'elenco
 * mostra.
 *
 * Vive nel contesto Profilo per lo stesso motivo di dispositivi e preferenze:
 * è Profilo a possedere «l'Utente identificabile e contattabile», e la riga
 * cade in cascata con lui. Chi decide SE avvisare è `AvvisiService`; qui ci
 * sono solo la persistenza e i gesti di chi legge.
 *
 * **`registra` è la deduplica.** L'outbox consegna at-least-once: lo stesso
 * fatto può arrivare due volte, e la seconda deve trovare la riga e fermarsi.
 * L'unicità (destinatario, chiave) trasforma la corsa in un esito ordinato —
 * `nuova: false` — su cui chi chiama decide di non rimandare i canali.
 */
@Injectable()
export class NotificheInAppService {
  private readonly logger = new Logger('NotificheInApp');

  constructor(private readonly prisma: PrismaService) {}

  async registra(
    destinatarioId: string,
    dati: {
      tipo: TipoDiNotifica;
      risorsaTipo: RisorsaDiNotifica;
      risorsaId: string;
      chiaveDeduplicazione: string;
    },
  ): Promise<{ id: string; nuova: boolean }> {
    try {
      const riga = await this.prisma.notifica.create({
        data: { destinatarioId, ...dati },
      });
      return { id: riga.id, nuova: true };
    } catch (errore) {
      // P2002 = la riga c'è già: il fatto è stato consegnato una seconda
      // volta, e la risposta giusta è «già fatto», non un errore.
      if (errore instanceof Prisma.PrismaClientKnownRequestError && errore.code === 'P2002') {
        const esistente = await this.prisma.notifica.findUnique({
          where: {
            destinatarioId_chiaveDeduplicazione: {
              destinatarioId,
              chiaveDeduplicazione: dati.chiaveDeduplicazione,
            },
          },
          select: { id: true },
        });
        return { id: esistente?.id ?? '', nuova: false };
      }
      throw errore;
    }
  }

  async elenca(
    utenteId: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedResult<NotificaResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [notifiche, total] = await Promise.all([
      this.prisma.notifica.findMany({
        where: { destinatarioId: utenteId },
        orderBy: { creatoIl: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notifica.count({ where: { destinatarioId: utenteId } }),
    ]);

    return {
      data: notifiche.map((notifica) => this.perIlClient(notifica)),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async contaNonLette(utenteId: string): Promise<ConteggioNotificheResponse> {
    const nonLette = await this.prisma.notifica.count({
      where: { destinatarioId: utenteId, lettaIl: null },
    });
    return { nonLette };
  }

  /**
   * Idempotente: leggere una notifica già letta non è un errore, è la stessa
   * verità detta due volte. Il 404 copre in un colpo «non esiste» e «non è
   * tua»: distinguerli racconterebbe a chi indovina gli id che quella riga
   * esiste per qualcun altro.
   */
  async segnaLetta(utenteId: string, notificaId: string): Promise<NotificaResponse> {
    await this.prisma.notifica.updateMany({
      where: { id: notificaId, destinatarioId: utenteId, lettaIl: null },
      data: { lettaIl: new Date() },
    });

    const notifica = await this.prisma.notifica.findFirst({
      where: { id: notificaId, destinatarioId: utenteId },
    });
    if (!notifica) {
      throw new AppException(ProfiloErrorCode.NOTIFICA_NOT_FOUND, 'NOTIFICA_NOT_FOUND', HttpStatus.NOT_FOUND, {
        notificaId,
      });
    }
    return this.perIlClient(notifica);
  }

  async segnaTutteLette(utenteId: string): Promise<ConteggioNotificheResponse> {
    await this.prisma.notifica.updateMany({
      where: { destinatarioId: utenteId, lettaIl: null },
      data: { lettaIl: new Date() },
    });
    return { nonLette: 0 };
  }

  /**
   * Pulizia periodica: via le lette da più di trenta giorni. Le non lette
   * restano — non si butta ciò che nessuno ha ancora visto — e comunque
   * cadono in cascata con il profilo quando l'account si cancella.
   */
  async eseguiGiro(): Promise<{ eliminate: number }> {
    const soglia = new Date(Date.now() - CONSERVAZIONE_LETTE_MS);
    const esito = await this.prisma.notifica.deleteMany({
      where: { lettaIl: { lt: soglia } },
    });
    if (esito.count > 0) this.logger.log(`Pulite ${esito.count} notifiche lette da oltre 30 giorni`);
    return { eliminate: esito.count };
  }

  private perIlClient(notifica: Notifica): NotificaResponse {
    return {
      id: notifica.id,
      tipo: notifica.tipo,
      risorsaTipo: notifica.risorsaTipo,
      risorsaId: notifica.risorsaId,
      letta: notifica.lettaIl !== null,
      creatoIl: notifica.creatoIl.toISOString(),
    };
  }
}
