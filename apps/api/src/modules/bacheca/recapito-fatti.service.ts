import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Quanti fatti per ciclo: un arretrato non si consegna mai in un colpo solo. */
const PER_CICLO = 200;
/** Oltre questi, il fatto è dichiarato non consegnabile. */
const TENTATIVI_MASSIMI = 12;
/** I fatti consegnati si conservano sette giorni, poi si purgano. */
const CONSERVAZIONE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * L'unico fatto di questo schema: qualcuno ha commentato il contenuto di
 * qualcun altro. Esiste perché l'avviso parta **fuori dal percorso della
 * richiesta**: chi scrive un commento non deve aspettare un fornitore di
 * notifiche per vedere il proprio commento comparire.
 */
export const COMMENTO_SCRITTO = 'CommentoScrittoSottoUnPost';

export interface PayloadCommentoScritto {
  commentoId: string;
  postId: string;
  /** Chi riceverà l'avviso: l'autore del post. */
  destinatarioId: string;
  /** Chi ha scritto: serve solo a non avvisare sé stessi, e non esce mai. */
  autoreId: string;
}

/**
 * Chi elabora un fatto. L'implementazione la fornisce il modulo proprietario:
 * questo servizio trasporta e non interpreta.
 */
export interface ConsumatoreDiFattiDellaBacheca {
  elabora(tipo: string, payload: unknown): Promise<void>;
}

/**
 * Il canale dei fatti in uscita da `bacheca`.
 *
 * **Una tabella per schema, mai una globale**, e questo è il gemello di quelli
 * dell'aula e del gruppo: stessa forma, stesse garanzie, dati diversi. Non è duplicazione
 * per distrazione — un canale condiviso fra schemi non potrebbe scrivere il
 * fatto nella stessa transazione dell'aggregato che lo produce, che è la
 * condizione senza cui «nessun fatto si perde» non è dimostrabile.
 *
 * **at-least-once**, e qui la ripetizione **non è innocua da sola**: un avviso
 * mandato due volte è la forma più fastidiosa di difetto, e nessuna invariante
 * lo rende inoffensivo come G3 rende inoffensiva una doppia ammissione. La
 * deduplica è quindi quella del canale — il fatto marcato consegnato non
 * rientra nel giro successivo — e il test la verifica facendo girare la corsia
 * due volte di seguito.
 *
 * **Resta una finestra, ed è dichiarata**: se il processo cade fra l'invio
 * dell'avviso e la scrittura del marcatore, quel fatto rientra nel giro dopo e
 * l'avviso parte una seconda volta. Chiuderla davvero vuole una chiave di
 * raggruppamento sul fornitore — che è la cosa che i sistemi operativi sanno
 * fare e noi no — ed è una decisione che si prende **con** il fornitore, non
 * prima. Nel frattempo il costo è un avviso doppio dopo un incidente, non un
 * avviso doppio ogni giorno.
 *
 * Gira sulla **corsia rapida (1 s)**: chi riceve un avviso lo riceve mentre la
 * cosa è ancora rilevante, e un avviso in ritardo di cinque minuti è un avviso
 * che arriva quando la conversazione è già altrove.
 */
@Injectable()
export class RecapitoFattiDellaBachecaService {
  private readonly logger = new Logger('RecapitoFattiDellaBacheca');
  private readonly consumatori: ConsumatoreDiFattiDellaBacheca[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /** I moduli si registrano all'avvio: il canale non li conosce per nome. */
  registra(consumatore: ConsumatoreDiFattiDellaBacheca): void {
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
    return tx.fattoInUscitaDellaBacheca.create({ data: fatto });
  }

  /** Un giro della corsia. Ritorna i contatori, per il log e per i test. */
  async eseguiGiro(): Promise<{ consegnati: number; nonConsegnabili: number }> {
    const adesso = new Date();
    let consegnati = 0;
    let nonConsegnabili = 0;

    const daConsegnare = await this.prisma.fattoInUscitaDellaBacheca.findMany({
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
        await this.prisma.fattoInUscitaDellaBacheca.update({
          where: { id: fatto.id },
          data: { consegnatoIl: new Date() },
        });
        consegnati += 1;
      } catch (errore) {
        const tentativi = fatto.tentativi + 1;
        const esaurito = tentativi >= TENTATIVI_MASSIMI;
        if (esaurito) nonConsegnabili += 1;

        await this.prisma.fattoInUscitaDellaBacheca.update({
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
        // Qui il danno è lieve — un avviso non partito — ed è il motivo per
        // cui il commento non aspetta questo canale per essere scritto.
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
    const esito = await this.prisma.fattoInUscitaDellaBacheca.deleteMany({
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
