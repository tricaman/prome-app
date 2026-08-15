import { Injectable } from '@nestjs/common';

/**
 * L'anti-corruption layer sul verso Gruppo → Aula studio.
 *
 * Attraversa il confine **un solo fatto booleano**: se un dato Utente è
 * ammesso per appartenenza a un dato Gruppo. Tradotto qui in titolo di
 * ammissione, e nient'altro — **la parola «Membro» non entra nel core**, che
 * non conosce e non deve conoscere il modello dei ruoli del Gruppo.
 *
 * È la ragione per cui essere moderatore di un Gruppo non produce alcun
 * permesso dentro un'aula collocata in quel gruppo (AS6): il core non ha modo
 * di saperlo, e non deve averlo.
 *
 * **Oggi risponde sempre di no**, perché il contesto Gruppo non esiste ancora
 * (arriverà con E7) e un'aula non può essere collocata da nessuna parte. Il
 * punto di innesto esiste già perché E7 possa attaccarsi qui senza tornare a
 * modificare l'ammissione, che a quel punto sarà codice chiuso e provato.
 *
 * Quando arriverà il Gruppo, questa porta avrà due implementazioni e nessuna
 * riga dell'aula cambierà: l'ammissione si risolve con questa interrogazione
 * su dato fresco (IA4), mentre l'uscita di chi è già dentro arriverà come
 * fatto sulla corsia rapida — l'informazione deve andargli incontro, perché
 * nessuna nuova richiesta la raggiungerebbe.
 */
@Injectable()
export class PortaAppartenenzaGruppo {
  async eAmmessoPerAppartenenza(_utenteId: string, _gruppoId: string): Promise<boolean> {
    return false;
  }
}
