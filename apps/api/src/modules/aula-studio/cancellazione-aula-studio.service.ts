import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PREFISSO_AUTORE_ANONIMO } from '../bacheca/cancellazione-bacheca.service';

/** Quante righe per lotto: un passo della catena non deve mai diventare lungo. */
const PER_GIRO = 500;

/**
 * La sorte dei dati dell'Aula studio quando un account si cancella (V5).
 *
 * Tre sorti diverse, e la differenza è tutta nel bene che proteggono:
 *
 * - il **Partecipante è rimosso** dagli insiemi, ma **onorando AS2**: se è
 *   l'ultimo moderatore, prima si promuove qualcun altro. La cancellazione non
 *   può lasciare dietro di sé uno spazio che nessuno può più governare;
 * - l'**Invito** rivolto a chi se ne va è eliminato: porta il suo indirizzo;
 * - il **materiale caricato resta, con `caricatoDa` anonimizzato e il file
 *   conservato**. È la sola eccezione alla cancellazione, ed è dichiarata
 *   nell'informativa prima della raccolta: il contributo a chi studia
 *   sopravvive, il riferimento alla persona no.
 *
 * Come per la Bacheca, questo file è l'unico percorso che scrive `caricatoDa`.
 */
@Injectable()
export class CancellazioneAulaStudioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rimuove il partecipante da ogni aula, promuovendo qualcun altro dove
   * altrimenti resterebbe senza moderatori.
   */
  async rimuoviPartecipazioniDi(utenteId: string): Promise<number> {
    const partecipazioni = await this.prisma.partecipante.findMany({
      where: { utenteId },
      take: PER_GIRO,
    });

    for (const partecipazione of partecipazioni) {
      if (partecipazione.moderatore) await this.onoraAS2(partecipazione.aulaStudioId, utenteId);
      await this.prisma.partecipante.delete({
        where: {
          aulaStudioId_utenteId: { aulaStudioId: partecipazione.aulaStudioId, utenteId },
        },
      });
    }
    return partecipazioni.length;
  }

  /**
   * AS2 non si viola nemmeno qui: se chi se ne va è l'ultimo moderatore, il
   * ruolo passa al partecipante più anziano. Se non c'è nessun altro, l'aula
   * resta senza partecipanti e la raccoglie la riconciliazione: uno spazio
   * vuoto non è uno spazio ingovernabile.
   */
  private async onoraAS2(aulaStudioId: string, uscente: string): Promise<void> {
    const moderatori = await this.prisma.partecipante.count({
      where: { aulaStudioId, moderatore: true },
    });
    if (moderatori > 1) return;

    const erede = await this.prisma.partecipante.findFirst({
      where: { aulaStudioId, utenteId: { not: uscente } },
      orderBy: { ammessoIl: 'asc' },
    });
    if (!erede) return;

    await this.prisma.partecipante.update({
      where: { aulaStudioId_utenteId: { aulaStudioId, utenteId: erede.utenteId } },
      data: { moderatore: true, parlare: true, scrivere: true, caricare: true },
    });
  }

  /** Gli inviti che portano il suo indirizzo, o che ha emesso lui. */
  async eliminaInvitiDi(utenteId: string, indirizzo: string | null): Promise<number> {
    const esito = await this.prisma.invito.deleteMany({
      where: {
        OR: [{ invitatoDa: utenteId }, ...(indirizzo ? [{ destinatario: indirizzo }] : [])],
      },
    });
    return esito.count;
  }

  /**
   * Il materiale resta; a sparire è solo il riferimento a chi lo ha portato.
   * Un identificatore casuale nuovo per riga, come per i post: due materiali
   * anonimizzati non devono restare collegabili fra loro.
   */
  async anonimizzaMaterialiDi(utenteId: string): Promise<number> {
    return this.prisma.$executeRaw`
      UPDATE "aula_studio"."allegato_di_aula_studio"
      SET "caricatoDa" = ${PREFISSO_AUTORE_ANONIMO} || gen_random_uuid()::text
      WHERE "id" IN (
        SELECT "id" FROM "aula_studio"."allegato_di_aula_studio"
        WHERE "caricatoDa" = ${utenteId}
        LIMIT ${PER_GIRO}
      )`;
  }

  /**
   * Verifica del residuo (SE3) per i detentori dell'aula studio.
   *
   * I file NON si contano: quelli dei materiali restano per progetto, e le
   * chiavi non contengono l'identificativo dell'utente proprio perché
   * sopravvivano senza essere un dato personale.
   */
  async contaResiduiDi(utenteId: string, indirizzo: string | null): Promise<number> {
    const [partecipazioni, materiali, inviti, fatti] = await Promise.all([
      this.prisma.partecipante.count({ where: { utenteId } }),
      this.prisma.allegatoDiAulaStudio.count({ where: { caricatoDa: utenteId } }),
      this.prisma.invito.count({
        where: {
          OR: [{ invitatoDa: utenteId }, ...(indirizzo ? [{ destinatario: indirizzo }] : [])],
        },
      }),
      // La tabella dei fatti in uscita è un detentore come gli altri: i
      // payload portano identificativi, e la purga a 7 giorni ne limita la
      // permanenza senza garantirla.
      this.prisma.fattoInUscita.count({
        where: { payload: { path: ['utenteId'], equals: utenteId } },
      }),
    ]);

    return partecipazioni + materiali + inviti + fatti;
  }

  /** I fatti che portano il suo identificativo, ovunque siano nel payload. */
  async eliminaFattiDi(utenteId: string): Promise<number> {
    const esito = await this.prisma.fattoInUscita.deleteMany({
      where: { payload: { path: ['utenteId'], equals: utenteId } },
    });
    return esito.count;
  }
}
