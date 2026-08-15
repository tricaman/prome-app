import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ARCHIVIO_DI_FILE,
  type ArchivioDiFile,
} from '../../infrastruttura/archivio-file/archivio-file';

/**
 * Il prefisso della classe «autore rimosso». Identifica la classe, mai la
 * persona: il suffisso è un uuid casuale NUOVO PER RECORD, e nessuna mappa
 * id → pseudonimo esiste in alcun luogo (V5, esclusione 19).
 */
export const PREFISSO_AUTORE_ANONIMO = 'anonimo-';

/** Quante righe per lotto: un passo della catena non deve mai diventare lungo. */
const PER_GIRO = 500;

/**
 * La sorte dei dati di Bacheca quando un account si cancella (V5).
 *
 * QUESTO FILE È L'UNICO PERCORSO CHE SCRIVE `autore_id` (R12): per il dominio
 * quelle colonne sono immutabili, e il percorso privilegiato deve restare uno,
 * individuabile e ispezionabile. Non aggiungere scritture di `autore_id`
 * altrove, nemmeno «per fare prima».
 *
 * - Post e Commento si ANONIMIZZANO, mai eliminati: il contributo resta utile
 *   a chi studia, l'autore viene staccato. Ogni riga riceve un identificatore
 *   casuale diverso: uno pseudonimo condiviso permetterebbe di ricostruire il
 *   corpus di una persona e ri-identificarla per contenuto.
 * - Gli Allegati dei post seguono i post: righe e file CONSERVATI.
 * - Le prenotazioni (`AllegatoInAttesa`) si eliminano con i loro file: prima
 *   il file, poi la riga — la riga superstite è il segnalibro del ritentativo.
 */
@Injectable()
export class CancellazioneBachecaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ARCHIVIO_DI_FILE) private readonly archivio: ArchivioDiFile,
  ) {}

  /**
   * Anonimizzazione dei contributi (V5): id casuale nuovo per ogni riga.
   *
   * `gen_random_uuid()` è valutata PER RIGA dentro l'UPDATE: è ciò che rende
   * i contributi non collegabili fra loro. Un `updateMany` di Prisma non può
   * farlo — assegnerebbe lo stesso valore a tutte le righe. Idempotente per
   * costruzione: le righe già anonimizzate non corrispondono più al filtro.
   */
  async anonimizzaContributiDi(utenteId: string): Promise<number> {
    let toccati = 0;
    toccati += await this.aLotti(
      () => this.prisma.$executeRaw`
        UPDATE "bacheca"."post"
        SET "autoreId" = ${PREFISSO_AUTORE_ANONIMO} || gen_random_uuid()::text
        WHERE "id" IN (
          SELECT "id" FROM "bacheca"."post"
          WHERE "autoreId" = ${utenteId}
          LIMIT ${PER_GIRO}
        )`,
    );
    toccati += await this.aLotti(
      () => this.prisma.$executeRaw`
        UPDATE "bacheca"."commento"
        SET "autoreId" = ${PREFISSO_AUTORE_ANONIMO} || gen_random_uuid()::text
        WHERE "id" IN (
          SELECT "id" FROM "bacheca"."commento"
          WHERE "autoreId" = ${utenteId}
          LIMIT ${PER_GIRO}
        )`,
    );
    return toccati;
  }

  /** Ripete un lotto finché tocca righe: l'ultimo lotto parziale chiude. */
  private async aLotti(lotto: () => Promise<number>): Promise<number> {
    let totale = 0;
    for (;;) {
      const toccati = await lotto();
      totale += toccati;
      if (toccati < PER_GIRO) return totale;
    }
  }

  /**
   * Le prenotazioni di caricamento dell'utente, con i loro file.
   *
   * L'ordine è il contrario del solito «riga poi file»: qui la riga si
   * elimina SOLO se il file è uscito davvero. Così «zero righe ⇒ zero file
   * attribuibili» è un teorema — le chiavi non contengono mai l'utente, e la
   * verifica del residuo può solo derivare dal database.
   */
  async eliminaResiduiDi(utenteId: string): Promise<{ eliminati: number; rimasti: number }> {
    // Un lotto per giro: quello che non esce oggi lo riprende il giro dopo.
    const prenotazioni = await this.prisma.allegatoInAttesa.findMany({
      where: { autoreId: utenteId },
      take: PER_GIRO,
    });

    let eliminati = 0;
    let rimasti = 0;
    for (const prenotazione of prenotazioni) {
      try {
        await this.archivio.rimuovi(prenotazione.chiave);
      } catch {
        // Il file non è uscito: la riga resta come segnalibro, il prossimo
        // giro riprova. Non è un errore della catena, è il suo ritentativo.
        rimasti += 1;
        continue;
      }
      await this.prisma.allegatoInAttesa.delete({ where: { id: prenotazione.id } });
      eliminati += 1;
    }

    return { eliminati, rimasti };
  }

  /**
   * Verifica del residuo (SE3) per i detentori di Bacheca.
   *
   * I file: solo quelli delle prenotazioni residue dell'utente — i file degli
   * Allegati dei post anonimizzati NON compaiono, perché quei post non portano
   * più il suo id, e quei file DEVONO restare (V5).
   */
  async contaResiduiDi(utenteId: string): Promise<{ record: number; file: number }> {
    const [post, commenti, allegati, prenotazioni] = await Promise.all([
      this.prisma.post.count({ where: { autoreId: utenteId } }),
      this.prisma.commento.count({ where: { autoreId: utenteId } }),
      this.prisma.allegato.count({ where: { post: { autoreId: utenteId } } }),
      this.prisma.allegatoInAttesa.findMany({
        where: { autoreId: utenteId },
        select: { chiave: true },
      }),
    ]);

    let file = 0;
    for (const { chiave } of prenotazioni) {
      if (await this.archivio.eStatoCaricato(chiave)) file += 1;
    }

    return { record: post + commenti + allegati + prenotazioni.length, file };
  }
}
