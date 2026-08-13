import { Inject, Injectable } from '@nestjs/common';
import { FORNITORE_IDENTITA } from '../../infrastruttura/accesso/accesso.module';
import type { FornitoreIdentita } from '../../infrastruttura/accesso/better-auth';

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
}
