import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  MotivoDiSegnalazione,
  SegnalazioneResponse,
  TipoDiSoggettoSegnalato,
} from '@prome/contracts';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { env } from '../../config/env';
import {
  CANALE_EMAIL,
  type CanaleEmail,
} from '../../infrastruttura/avvisi-in-uscita/canale-email';

/** Quanto contenuto attraversa l'email al supporto: abbastanza per decidere. */
const LUNGHEZZA_ESTRATTO = 300;

/**
 * Bounded context SEGNALAZIONE — la coda che qualcuno guarda.
 *
 * È il contesto più piccolo del sistema, ed è giusto così: registra chi ha
 * segnalato cosa e perché, e inoltra al supporto. Non conosce i contenuti —
 * il soggetto è riferito per identità, la verifica che esista e sia visibile
 * la fa il modulo proprietario, orchestrato dalla facciata — e non decide
 * alcuna sorte: la rimozione di un contenuto è dell'operatore, via database,
 * come documentato in STORE.md.
 *
 * **Non lancia errori propri, e non è una dimenticanza**: il soggetto
 * invisibile risponde 404 dal contesto che lo possiede, l'input malformato è
 * V001 della pipe, e il doppione è un'operazione senza effetto. Il giorno in
 * cui servirà un errore suo, nascerà il prefisso SG.
 */
@Injectable()
export class SegnalazioneService {
  private readonly logger = new Logger('Segnalazione');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CANALE_EMAIL) private readonly email: CanaleEmail,
  ) {}

  /**
   * Registra una segnalazione e la inoltra al supporto.
   *
   * **La riga prima, l'email dopo**: la riga è la fonte di verità, l'email è
   * il campanello. Se l'email fallisce la segnalazione resta registrata e il
   * log dice `error` — è il caso sancito per la mano umana, come il fatto
   * non consegnabile dell'outbox.
   *
   * **Doppione = niente**: stessa persona, stesso soggetto → la riga c'è già
   * (vincolo unico, catturato come P2002) e **non parte una seconda email**.
   * Ringraziare di nuovo va bene, suonare di nuovo al supporto no.
   *
   * L'estratto è troncato QUI, prima di uscire, e non viene mai conservato:
   * una copia del contenuto altrui dentro questo schema sarebbe un detentore
   * di dati personali senza via di cancellazione.
   */
  async registra(
    segnalanteId: string,
    tipo: TipoDiSoggettoSegnalato,
    soggettoId: string,
    motivo: MotivoDiSegnalazione,
    contenuto: string,
  ): Promise<void> {
    try {
      await this.prisma.segnalazione.create({
        data: { segnalanteId, tipo, soggettoId, motivo },
      });
    } catch (errore) {
      if (errore instanceof Prisma.PrismaClientKnownRequestError && errore.code === 'P2002') {
        return;
      }
      throw errore;
    }

    if (!env.EMAIL_SUPPORTO) {
      // Fuori produzione può mancare (in produzione l'avvio si ferma): la
      // riga resta, il campanello no.
      this.logger.warn('EMAIL_SUPPORTO assente: segnalazione registrata ma non inoltrata.');
      return;
    }

    try {
      await this.email.inviaSegnalazione(
        env.EMAIL_SUPPORTO,
        {
          tipo,
          motivo,
          soggettoId,
          segnalanteId,
          estratto: contenuto.slice(0, LUNGHEZZA_ESTRATTO),
        },
        'it',
      );
    } catch (errore) {
      this.logger.error(
        `Segnalazione registrata ma non inoltrata al supporto: ${(errore as Error).message}`,
      );
    }
  }

  // --- Cancellazione dell'account (V5) --------------------------------------

  /** Le segnalazioni fatte dall'utente spariscono con lui. */
  async eliminaDi(utenteId: string): Promise<void> {
    await this.prisma.segnalazione.deleteMany({ where: { segnalanteId: utenteId } });
  }

  /** Verifica del residuo (SE3): quante righe portano ancora questo id. */
  async contaResiduiDi(utenteId: string): Promise<number> {
    return this.prisma.segnalazione.count({ where: { segnalanteId: utenteId } });
  }

  /** «Scarica i tuoi dati»: le proprie segnalazioni, senza i contenuti altrui. */
  async datiPersonaliDi(utenteId: string): Promise<SegnalazioneResponse[]> {
    const righe = await this.prisma.segnalazione.findMany({
      where: { segnalanteId: utenteId },
      orderBy: { creatoIl: 'desc' },
    });
    return righe.map((riga) => ({
      tipo: riga.tipo,
      soggettoId: riga.soggettoId,
      motivo: riga.motivo,
      creatoIl: riga.creatoIl.toISOString(),
    }));
  }
}
