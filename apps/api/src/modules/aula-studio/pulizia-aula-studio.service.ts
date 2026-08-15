import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/** Quanti record toccare per giro: un ciclo non deve mai diventare lungo. */
const PER_GIRO = 500;

/**
 * I meccanismi ricorrenti dell'Aula studio.
 *
 * Tutti e tre lavorano **per interrogazione dello stato**, non su una coda di
 * promemoria: dopo un'interruzione non hanno arretrati da recuperare, hanno
 * una query che al ciclo successivo trova più righe. Un invito con istante di
 * scadenza passato e stato non terminale è tale indipendentemente da quante
 * volte il giro è stato saltato.
 *
 * 1. **Gli inviti scaduti** si chiudono: nessun fatto viene emesso quando
 *    qualcuno *non* fa qualcosa, quindi la scadenza non può che essere una
 *    lettura periodica.
 * 2. **Gli allegati di un argomento eliminato tornano sciolti**, e nessun
 *    file viene cancellato: riorganizzare non distrugge, e il materiale di
 *    studio non si perde per un gesto di riordino.
 * 3. **Gli elementi orfani di un'aula eliminata** vengono rimossi: chiude la
 *    finestra sottilissima fra la verifica «l'aula è vuota» e l'eliminazione.
 */
@Injectable()
export class PuliziaAulaStudioService {
  private readonly logger = new Logger('PuliziaAulaStudio');

  constructor(private readonly prisma: PrismaService) {}

  async eseguiGiro(): Promise<{ invitiScaduti: number; allegatiSciolti: number; orfani: number }> {
    const invitiScaduti = await this.chiudiInvitiScaduti();
    const allegatiSciolti = await this.sciogliAllegatiSenzaArgomento();
    const orfani = await this.rimuoviOrfani();

    if (invitiScaduti || allegatiSciolti || orfani) {
      this.logger.log(
        `Pulizia aule: ${invitiScaduti} inviti scaduti, ${allegatiSciolti} materiali tornati sciolti, ${orfani} elementi orfani`,
      );
    }
    return { invitiScaduti, allegatiSciolti, orfani };
  }

  private async chiudiInvitiScaduti(): Promise<number> {
    const esito = await this.prisma.invito.updateMany({
      where: { stato: 'IN_ATTESA', scadeIl: { lt: new Date() } },
      data: { stato: 'SCADUTO', chiusoIl: new Date() },
    });
    return esito.count;
  }

  /**
   * Un allegato che punta a un argomento sparito torna sciolto: `argomentoId`
   * a null, **nessun file cancellato**. È l'esatto contrario di ciò che accade
   * agli allegati di un post, ed è la differenza da mostrare in demo.
   */
  private async sciogliAllegatiSenzaArgomento(): Promise<number> {
    const conArgomento = await this.prisma.allegatoDiAulaStudio.findMany({
      where: { argomentoId: { not: null } },
      select: { id: true, argomentoId: true },
      take: PER_GIRO,
    });
    if (!conArgomento.length) return 0;

    const argomentiVivi = await this.prisma.argomento.findMany({
      where: { id: { in: conArgomento.map((a) => a.argomentoId!) } },
      select: { id: true },
    });
    const vivi = new Set(argomentiVivi.map((a) => a.id));
    const daSciogliere = conArgomento.filter((a) => !vivi.has(a.argomentoId!)).map((a) => a.id);
    if (!daSciogliere.length) return 0;

    const esito = await this.prisma.allegatoDiAulaStudio.updateMany({
      where: { id: { in: daSciogliere } },
      data: { argomentoId: null },
    });
    return esito.count;
  }

  /**
   * Argomenti, allegati e inviti di un'aula che non c'è più.
   *
   * Nessuno di questi ha un vincolo verso l'aula — fra aggregati si riferisce
   * per identità, non per integrità — quindi la loro rimozione è differita e
   * nessuno la sta aspettando.
   */
  private async rimuoviOrfani(): Promise<number> {
    const aule = await this.prisma.aulaStudio.findMany({ select: { id: true } });
    const vive = aule.map((a) => a.id);

    const [argomenti, inviti] = await Promise.all([
      this.prisma.argomento.deleteMany({ where: { aulaStudioId: { notIn: vive } } }),
      this.prisma.invito.deleteMany({ where: { aulaStudioId: { notIn: vive } } }),
    ]);

    return argomenti.count + inviti.count;
  }
}
