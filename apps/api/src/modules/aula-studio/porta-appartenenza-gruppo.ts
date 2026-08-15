import { Injectable } from '@nestjs/common';
import { GruppoService } from '../gruppo/gruppo.service';

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
 * di saperlo, perché quell'informazione non passa di qui.
 *
 * La domanda si pone **adesso, su dato fresco** (IA4): chi chiede di entrare
 * sta chiedendo in questo istante, e nessuna copia locale dell'insieme dei
 * membri viene tenuta da questa parte del confine. Il verso opposto —
 * l'allontanamento di chi è già dentro — non passa di qui: quello arriva come
 * fatto, perché a quella persona l'informazione deve andare incontro.
 */
@Injectable()
export class PortaAppartenenzaGruppo {
  constructor(private readonly gruppi: GruppoService) {}

  async eAmmessoPerAppartenenza(utenteId: string, gruppoId: string): Promise<boolean> {
    return this.gruppi.eMembro(utenteId, gruppoId);
  }
}
