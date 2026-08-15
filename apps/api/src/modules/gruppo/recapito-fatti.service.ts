import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Quanti fatti per ciclo: un arretrato non si consegna mai in un colpo solo. */
const PER_CICLO = 200;
/** Oltre questi, il fatto è dichiarato non consegnabile. */
const TENTATIVI_MASSIMI = 12;
/** I fatti consegnati si conservano sette giorni, poi si purgano. */
const CONSERVAZIONE_MS = 7 * 24 * 60 * 60 * 1000;

/** Un invito accettato: il membro nasce di qui, non nella stessa transazione (IG3). */
export const INVITO_AL_GRUPPO_ACCETTATO = 'InvitoAlGruppoAccettato';
/**
 * L'appartenenza è decaduta. È il fatto che deve **raggiungere** chi è già
 * dentro un'aula collocata: quella persona non farà alcuna nuova richiesta.
 */
export const MEMBRO_RIMOSSO = 'MembroRimossoDalGruppo';
/** Il gruppo non c'è più: le aule collocate tornano sciolte, e restano vive. */
export const GRUPPO_ELIMINATO = 'GruppoEliminato';

export interface PayloadInvitoAlGruppoAccettato {
  invitoId: string;
  gruppoId: string;
  utenteId: string;
}

export interface PayloadMembroRimosso {
  gruppoId: string;
  utenteId: string;
}

export interface PayloadGruppoEliminato {
  gruppoId: string;
}

/**
 * Chi elabora un fatto. L'implementazione la fornisce il modulo proprietario:
 * questo servizio trasporta e non interpreta.
 */
export interface ConsumatoreDiFattiDelGruppo {
  elabora(tipo: string, payload: unknown): Promise<void>;
}

/**
 * Il canale dei fatti in uscita da `gruppo`.
 *
 * **Una tabella per schema, mai una globale**, e questo è il gemello di quello
 * dell'aula: stessa forma, stesse garanzie, dati diversi. Non è duplicazione
 * per distrazione — un canale condiviso fra schemi non potrebbe scrivere il
 * fatto nella stessa transazione dell'aggregato che lo produce, che è la
 * condizione senza cui «nessun fatto si perde» non è dimostrabile.
 *
 * **at-least-once**: un fatto non si perde ma può arrivare più di una volta.
 * Qui la ripetizione è innocua per costruzione: G3 rende la seconda aggiunta
 * di un membro un'operazione senza effetto, e la rimozione di chi è già stato
 * rimosso non trova nulla da fare.
 *
 * Gira sulla **corsia rapida (1 s)**, e per due ragioni diverse: chi ha appena
 * accettato un invito aspetta davanti allo schermo, e chi ha appena perso
 * l'appartenenza deve smettere di leggere una conversazione a cui non ha più
 * diritto entro pochi secondi (SE1).
 */
@Injectable()
export class RecapitoFattiDelGruppoService {
  private readonly logger = new Logger('RecapitoFattiDelGruppo');
  private readonly consumatori: ConsumatoreDiFattiDelGruppo[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /** I moduli si registrano all'avvio: il canale non li conosce per nome. */
  registra(consumatore: ConsumatoreDiFattiDelGruppo): void {
    this.consumatori.push(consumatore);
  }

  /**
   * Scrive un fatto **dentro una transazione già aperta**: la firma esige la
   * transazione proprio per rendere impossibile pubblicare fuori da essa.
   */
  pubblica(
    tx: Prisma.TransactionClient,
    fatto: { tipo: string; aggregatoId: string; payload: Prisma.InputJsonValue },
  ) {
    return tx.fattoInUscitaDelGruppo.create({ data: fatto });
  }

  /** Un giro della corsia. Ritorna i contatori, per il log e per i test. */
  async eseguiGiro(): Promise<{ consegnati: number; nonConsegnabili: number }> {
    const adesso = new Date();
    let consegnati = 0;
    let nonConsegnabili = 0;

    const daConsegnare = await this.prisma.fattoInUscitaDelGruppo.findMany({
      where: {
        consegnatoIl: null,
        nonConsegnabileIl: null,
        prossimoTentativoIl: { lte: adesso },
      },
      orderBy: { accadutoIl: 'asc' },
      take: PER_CICLO,
    });

    for (const fatto of daConsegnare) {
      try {
        for (const consumatore of this.consumatori) {
          await consumatore.elabora(fatto.tipo, fatto.payload);
        }
        await this.prisma.fattoInUscitaDelGruppo.update({
          where: { id: fatto.id },
          data: { consegnatoIl: new Date() },
        });
        consegnati += 1;
      } catch (errore) {
        const tentativi = fatto.tentativi + 1;
        const esaurito = tentativi >= TENTATIVI_MASSIMI;
        if (esaurito) nonConsegnabili += 1;

        await this.prisma.fattoInUscitaDelGruppo.update({
          where: { id: fatto.id },
          data: {
            tentativi,
            // Attesa crescente con jitter: due fatti falliti insieme non
            // tornano a bussare nello stesso istante.
            prossimoTentativoIl: new Date(Date.now() + attesaDopo(tentativi)),
            ...(esaurito ? { nonConsegnabileIl: new Date() } : {}),
          },
        });

        // Un fatto esaurito è l'unico caso in cui una mano umana è prevista —
        // e qui vale doppio: un `MembroRimossoDalGruppo` non consegnato è
        // qualcuno rimasto dentro un'aula a cui non ha più titolo.
        const messaggio = esaurito
          ? `Fatto ${fatto.tipo} non consegnabile dopo ${tentativi} tentativi: ${fatto.id}`
          : `Consegna del fatto ${fatto.tipo} fallita (tentativo ${tentativi}): si riprova`;
        this.logger.error(messaggio, errore instanceof Error ? errore.stack : undefined);
      }
    }

    await this.purgaConsegnati(adesso);
    return { consegnati, nonConsegnabili };
  }

  /**
   * I fatti consegnati si conservano sette giorni: non è igiene di spazio, è
   * che un payload può trasportare dati personali.
   */
  private async purgaConsegnati(adesso: Date): Promise<number> {
    const esito = await this.prisma.fattoInUscitaDelGruppo.deleteMany({
      where: { consegnatoIl: { lt: new Date(adesso.getTime() - CONSERVAZIONE_MS) } },
    });
    return esito.count;
  }
}

/** Attesa crescente con jitter, entro un tetto di un'ora. */
function attesaDopo(tentativi: number): number {
  const base = Math.min(2 ** tentativi * 1000, 60 * 60 * 1000);
  return base + Math.floor(base * 0.2 * (tentativi % 5) * 0.1);
}
