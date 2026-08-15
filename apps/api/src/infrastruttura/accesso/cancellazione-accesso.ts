import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Oltre quest'ora una verifica OTP scaduta è solo un residuo: il codice vale
 * dieci minuti, il margine assorbe gli orologi non allineati.
 */
const MARGINE_PURGA_MS = 60 * 60 * 1000;

/**
 * La sorte dei dati del fornitore di identità quando un account si cancella.
 *
 * Sta in infrastruttura/accesso e non nel modulo di cancellazione per la
 * stessa ragione per cui esiste questa cartella: la conoscenza di Better Auth
 * — quali tabelle possiede, cosa contiene `identifier`, quali cascate ci sono
 * — si ferma qui, accanto a `better-auth.ts`, dove chi aggiorna la libreria
 * la troverà. Questo file è il SECONDO punto sancito che tocca lo schema
 * `accesso` (l'altro è PortaIdentitàUtente): non aggiungerne altri.
 *
 * Fatto non ovvio: l'`identifier` delle righe OTP non è l'email nuda ma
 * `sign-in-otp-<email>` (better-auth, `toOTPIdentifier`). Per questo le righe
 * si eliminano per `contains`, e nella STESSA transazione dell'utente: dopo
 * il delete l'email non è più nota a nessuno — il registro non può portarla —
 * e una riga OTP orfana resterebbe irraggiungibile per sempre.
 */
@Injectable()
export class CancellazioneAccesso {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Revoca immediata di tutte le sessioni, su ogni dispositivo.
   *
   * Direttamente sulle righe: con il plugin bearer e senza cookie-cache il
   * fornitore rilegge il database a ogni richiesta, quindi l'effetto è
   * immediato. L'API `revokeSessions` del fornitore vorrebbe le intestazioni
   * di una sessione viva, che nel worker non esiste.
   */
  async revocaSessioniDi(utenteId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId: utenteId } });
  }

  /**
   * Eliminazione dei dati personali presso il fornitore (V5).
   *
   * Una transazione sola: righe OTP (finché l'email è nota) e utente cadono
   * insieme o non cade nessuno dei due. Sessioni e credenziali seguono in
   * cascata. Idempotente: se l'utente non c'è più, non c'è niente da fare.
   */
  async eliminaUtente(utenteId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const utente = await tx.user.findUnique({ where: { id: utenteId } });
      if (!utente) return;
      await tx.verification.deleteMany({
        where: { identifier: { contains: utente.email } },
      });
      await tx.user.delete({ where: { id: utente.id } });
    });
  }

  /**
   * L'indirizzo dell'utente, finché esiste.
   *
   * Serve ai detentori che conservano un'email invece di un identificativo —
   * gli inviti sono rivolti a un indirizzo — e la lettura passa da qui perché
   * questo resta l'unico punto in cui la catena tocca lo schema del fornitore.
   */
  async indirizzoDi(utenteId: string): Promise<string | null> {
    const utente = await this.prisma.user.findUnique({
      where: { id: utenteId },
      select: { email: true },
    });
    return utente?.email.toLowerCase() ?? null;
  }

  /**
   * Purga delle verifiche OTP scadute, di chiunque siano.
   *
   * È la rete per il caso in cui l'email non è più nota: una riga risorta da
   * un ripristino (orizzonte: giorni) è per definizione scaduta (TTL: dieci
   * minuti), e la purga la raccoglie senza doverla attribuire a nessuno.
   */
  async purgaVerificheScadute(): Promise<number> {
    const esito = await this.prisma.verification.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - MARGINE_PURGA_MS) } },
    });
    return esito.count;
  }

  /**
   * Verifica del residuo (SE3) presso il fornitore.
   *
   * Le righe OTP si contano per email solo finché l'utente esiste: dopo, la
   * garanzia è strutturale — transazione unica più purga delle scadute.
   */
  async contaResiduiDi(utenteId: string): Promise<number> {
    const utente = await this.prisma.user.findUnique({ where: { id: utenteId } });
    const sessioni = await this.prisma.session.count({ where: { userId: utenteId } });
    const credenziali = await this.prisma.account.count({ where: { userId: utenteId } });
    const verifiche = utente
      ? await this.prisma.verification.count({
          where: { identifier: { contains: utente.email } },
        })
      : 0;
    return (utente ? 1 : 0) + sessioni + credenziali + verifiche;
  }
}
