import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Quanti fatti per ciclo: un arretrato non si consegna mai in un colpo solo. */
const PER_CICLO = 200;
/** Oltre questi, il fatto è dichiarato non consegnabile. */
const TENTATIVI_MASSIMI = 12;
/** I fatti consegnati si conservano sette giorni, poi si purgano. */
const CONSERVAZIONE_MS = 7 * 24 * 60 * 60 * 1000;

/** L'unico fatto pubblicato oggi da questo schema. */
export const INVITO_ACCETTATO = 'InvitoAllAulaStudioAccettato';

export interface PayloadInvitoAccettato {
  invitoId: string;
  aulaStudioId: string;
  utenteId: string;
}

/**
 * Chi elabora un fatto. L'implementazione la fornisce il modulo proprietario:
 * questo servizio trasporta e non interpreta.
 */
export interface ConsumatoreDiFatti {
  elabora(tipo: string, payload: unknown): Promise<void>;
}

/**
 * RecapitoDeiFattiDiDominio — il canale dei fatti in uscita da `aula_studio`.
 *
 * Trasporta, non interpreta: non conosce la differenza fra un fatto e l'altro
 * se non come corsia di consegna. Il fatto è scritto **nella stessa
 * transazione dell'aggregato che lo produce** (lo fa chi lo emette), e qui si
 * consegna soltanto ciò che è già stato scritto — è la condizione senza la
 * quale «nessun fatto si perde» non sarebbe dimostrabile.
 *
 * **at-least-once**: un fatto non si perde ma può arrivare più di una volta.
 * L'elaborazione è resa effectively-once dalla **deduplica sull'identificativo
 * dell'evento**, applicata sempre — anche dove un'invariante la renderebbe
 * superflua (AS3 rende già innocua una doppia ammissione). Un meccanismo solo
 * vale più di sei ragionamenti caso per caso: chi domani modificherà un
 * consumatore non dovrà ricordarsi quale invariante lo proteggeva.
 *
 * Gira sulla **corsia rapida (1 s)** perché il suo unico fatto ha qualcuno che
 * aspetta davanti allo schermo: ha appena accettato un invito.
 */
@Injectable()
export class RecapitoFattiService {
  private readonly logger = new Logger('RecapitoFatti');
  private readonly consumatori: ConsumatoreDiFatti[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /** I moduli si registrano all'avvio: il canale non li conosce per nome. */
  registra(consumatore: ConsumatoreDiFatti): void {
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
    return tx.fattoInUscita.create({ data: fatto });
  }

  /** Un giro della corsia. Ritorna i contatori, per il log e per i test. */
  async eseguiGiro(): Promise<{ consegnati: number; nonConsegnabili: number }> {
    const adesso = new Date();
    let consegnati = 0;
    let nonConsegnabili = 0;

    const daConsegnare = await this.prisma.fattoInUscita.findMany({
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
        await this.prisma.fattoInUscita.update({
          where: { id: fatto.id },
          data: { consegnatoIl: new Date() },
        });
        consegnati += 1;
      } catch (errore) {
        const tentativi = fatto.tentativi + 1;
        const esaurito = tentativi >= TENTATIVI_MASSIMI;
        if (esaurito) nonConsegnabili += 1;

        await this.prisma.fattoInUscita.update({
          where: { id: fatto.id },
          data: {
            tentativi,
            // Attesa crescente con jitter: due fatti falliti insieme non
            // tornano a bussare nello stesso istante.
            prossimoTentativoIl: new Date(Date.now() + attesaDopo(tentativi)),
            ...(esaurito ? { nonConsegnabileIl: new Date() } : {}),
          },
        });

        // Un fatto esaurito è l'unico caso in cui una mano umana è prevista.
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
   * I fatti consegnati si conservano sette giorni.
   *
   * Non è igiene di spazio: un payload può trasportare dati personali, e una
   * tabella conservata indefinitamente sarebbe una replica priva di percorso
   * di cancellazione. Le righe residue restano comunque raggiungibili dalla
   * catena di cancellazione, perché la purga limita la permanenza ma non la
   * garantisce.
   */
  private async purgaConsegnati(adesso: Date): Promise<number> {
    const esito = await this.prisma.fattoInUscita.deleteMany({
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
