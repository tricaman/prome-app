import { HttpStatus } from '@nestjs/common';
import {
  DIMENSIONE_MASSIMA_ALLEGATO,
  LUNGHEZZA_MASSIMA_POST,
  type TipoAllegato,
} from '@prome/contracts';
import { AppException } from '../../../common/exceptions';
import type { ProvaOnboardingCompletato } from '../../profilo/prova-onboarding';
import { BachecaErrorCode } from '../constants/error-codes';

/**
 * Il file, descritto in termini di dominio.
 *
 * Chiave, nome, tipo, dimensione — e nessun fornitore nominato. La chiave è
 * **opaca**: serve a ritrovare il file attraverso la capacità di
 * archiviazione, e null'altro. È immutabile e senza identità: due allegati con
 * lo stesso file archiviato restano due allegati distinti.
 */
export interface FileArchiviato {
  readonly chiave: string;
  readonly nome: string;
  readonly tipo: TipoAllegato;
  readonly dimensione: number;
}

/** Un Post appena costruito, pronto per essere scritto. */
export interface PostDaScrivere {
  readonly autoreId: string;
  readonly testo: string;
  readonly allegati: readonly FileArchiviato[];
}

/**
 * Costruisce un Post, o non lo costruisce affatto.
 *
 * Le invarianti della Bacheca vivono qui e non nei DTO: la validazione
 * dell'ingresso protegge dalla richiesta malformata, questa protegge
 * l'aggregato. Sono due cose diverse — un Post può nascere anche da un
 * comando interno — e confonderle lascerebbe l'aggregato scoperto proprio
 * dove non passa dalla facciata.
 *
 * - **B1** testo non vuoto dopo il trim, al massimo 5.000 caratteri;
 * - **B3** ogni allegato ha un file completo: chiave e nome non vuoti, tipo
 *   ammesso, dimensione > 0 e ≤ 25 MB;
 * - **B6** senza la prova che l'autore ha completato l'onboarding **non c'è
 *   Post**: non un oggetto da correggere, non uno stato intermedio. La prova
 *   è un valore che entra qui, e il suo tipo non è fabbricabile altrove.
 *
 * Il Post non riceve alcuna visibilità (**B5**), e non è una dimenticanza:
 * chi lo vede si decide leggendo le Impostazioni di privacy dell'autore, al
 * momento della lettura.
 */
export function costruisciPost(
  prova: ProvaOnboardingCompletato,
  dati: { testo: string; allegati: readonly FileArchiviato[] },
): PostDaScrivere {
  const testo = dati.testo.trim();

  if (!testo) {
    throw new AppException(
      BachecaErrorCode.TESTO_VUOTO,
      'POST_TESTO_VUOTO',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (testo.length > LUNGHEZZA_MASSIMA_POST) {
    throw new AppException(
      BachecaErrorCode.TESTO_TROPPO_LUNGO,
      'POST_TESTO_TROPPO_LUNGO',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { massimo: LUNGHEZZA_MASSIMA_POST },
    );
  }

  for (const file of dati.allegati) {
    verificaFileArchiviato(file);
  }

  return {
    autoreId: prova.utenteId,
    testo,
    allegati: dati.allegati,
  };
}

/**
 * B3, per un singolo file.
 *
 * È esportata perché la stessa regola serve **prima** di costruire il Post:
 * in pre-autorizzazione, per rifiutare un file troppo grande senza averlo
 * caricato. Riscriverla là vorrebbe dire tenerne due copie che prima o poi
 * divergono; fabbricare una prova di onboarding pur di richiamare il
 * costruttore sarebbe peggio, perché svuoterebbe B6.
 */
export function verificaFileArchiviato(file: FileArchiviato): void {
  if (!file.chiave.trim() || !file.nome.trim()) {
    throw new AppException(
      BachecaErrorCode.ALLEGATO_INCOMPLETO,
      'ALLEGATO_INCOMPLETO',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (file.dimensione <= 0 || file.dimensione > DIMENSIONE_MASSIMA_ALLEGATO) {
    throw new AppException(
      BachecaErrorCode.ALLEGATO_DIMENSIONE,
      'ALLEGATO_DIMENSIONE',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { massimoMb: Math.round(DIMENSIONE_MASSIMA_ALLEGATO / 1024 / 1024) },
    );
  }
}
