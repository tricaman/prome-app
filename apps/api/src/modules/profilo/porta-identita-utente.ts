import { Inject, Injectable } from '@nestjs/common';
import { FORNITORE_IDENTITA } from '../../infrastruttura/accesso/accesso.module';
import type { FornitoreIdentita } from '../../infrastruttura/accesso/better-auth';
import { PrismaService } from '../../database/prisma.service';

/**
 * L'Utente come lo conosce il dominio: un identificativo, e nient'altro.
 *
 * Non ha email, non ha nome, non ha sessione. Chi ha bisogno del nome lo
 * chiede a Profilo; chi ha bisogno dell'email non dovrebbe averne bisogno.
 */
export interface UtenteDiDominio {
  readonly id: string;
}

/**
 * L'unica eccezione alla riga qui sopra, e va motivata.
 *
 * Un Invito è **rivolto a un indirizzo** — si invita anche chi non ha ancora
 * un account, e l'invito lo aspetta — quindi stabilire che chi lo accetta sia
 * davvero il destinatario richiede di confrontare quell'indirizzo. Il
 * confronto passa da qui e non dallo schema del fornitore, perché questa
 * resta l'unica riga in cui Accesso tocca il dominio.
 */
export interface IndirizzoDiUnUtente {
  indirizzoDi(utenteId: string): Promise<string | null>;
}

/**
 * PortaIdentitàUtente — l'unico punto in cui Accesso tocca il dominio.
 *
 * Converte una sessione autenticata nell'Utente di dominio. Due negazioni la
 * delimitano, e sono vincolanti:
 *
 * 1. **Non passano account, sessione, provider.** Esce `UtenteDiDominio` e
 *    basta: il vocabolario dell'autenticazione si ferma su questa riga.
 * 2. **Non si decide chi può fare cosa.** Questa porta dice *chi è*; se può
 *    fare qualcosa lo stabilisce il modulo che possiede quella regola, sul
 *    proprio dato, nel momento del gesto.
 *
 * È posseduta da Profilo perché è Profilo a pubblicare l'Utente verso gli
 * altri contesti: farla vivere altrove significherebbe avere due sorgenti
 * dell'identità.
 */
@Injectable()
export class PortaIdentitaUtente {
  constructor(
    @Inject(FORNITORE_IDENTITA) private readonly fornitore: FornitoreIdentita,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Traduce le intestazioni di una richiesta nell'Utente di dominio.
   * Ritorna `null` se non c'è una sessione valida: decidere cosa farne — un
   * 401, o proseguire come anonimo — spetta a chi chiama.
   */
  async utenteDellaRichiesta(intestazioni: Headers): Promise<UtenteDiDominio | null> {
    const sessione = await this.fornitore.api.getSession({ headers: intestazioni });
    if (!sessione?.user?.id) return null;
    return { id: sessione.user.id };
  }

  /**
   * L'indirizzo di un utente, per il solo confronto con il destinatario di un
   * Invito (vedi `IndirizzoDiUnUtente`). Non è un dato che il dominio
   * conserva: si chiede, si confronta e si dimentica.
   */
  async indirizzoDi(utenteId: string): Promise<string | null> {
    const utente = await this.prisma.user.findUnique({
      where: { id: utenteId },
      select: { email: true },
    });
    return utente?.email.toLowerCase() ?? null;
  }

  /**
   * La direzione inversa: chi c'è dietro un indirizzo, se c'è qualcuno.
   *
   * Serve a una cosa sola — **avvisare sul telefono chi è stato invitato** —
   * e la risposta non torna mai a chi ha invitato: né nel corpo, né nel
   * codice di stato, né nel tempo di risposta. Chi invita continua a non
   * poter sapere se quell'indirizzo ha un account su Prome, che è la stessa
   * ragione per cui `contattabilita` non è applicata agli inviti.
   *
   * `null` è una risposta normale: si invita chi non è ancora iscritto, ed è
   * il caso per cui l'invito viaggia per email invece che per identificativo.
   */
  async utenteIdPerIndirizzo(indirizzo: string): Promise<string | null> {
    const utente = await this.prisma.user.findFirst({
      where: { email: { equals: indirizzo.trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    return utente?.id ?? null;
  }
}
