import { HttpStatus } from '@nestjs/common';
import { LUNGHEZZA_MASSIMA_NOME_GRUPPO, type VisibilitaGruppo } from '@prome/contracts';
import { AppException } from '../../../common/exceptions';
import { GruppoErrorCode } from '../constants/error-codes';

/**
 * Le invarianti del Gruppo, dove devono stare: nel dominio.
 *
 * La validazione dell'ingresso protegge dalla richiesta malformata, il
 * costruttore protegge l'aggregato. Sono due cose diverse, e confonderle
 * lascerebbe il Gruppo scoperto quando nasce da un comando che non passa dalla
 * facciata.
 */

/** Un membro, per ciò che serve a decidere sull'insieme. */
export interface MembroDelGruppo {
  utenteId: string;
  moderatore: boolean;
}

/**
 * G1 e G5 al momento della nascita.
 *
 * L'ateneo è quello del creatore **al momento della creazione**, e da lì è
 * congelato (G5). L'università di chi chiederà di vederlo si leggerà invece
 * sempre fresca dal Profilo — dato anagrafico propagato, decisione di
 * autorizzazione interrogata.
 */
export function costruisciGruppo(dati: {
  nome: string;
  visibilita?: VisibilitaGruppo;
  /** Identificativo dell'ateneo, non il suo nome: la regola lo confronta. */
  universitaIdDelCreatore: string | null;
}): { nome: string; visibilita: VisibilitaGruppo; ateneoId: string | null } {
  const nome = dati.nome.trim();
  if (!nome || nome.length > LUNGHEZZA_MASSIMA_NOME_GRUPPO) {
    throw new AppException(
      GruppoErrorCode.NOME_VUOTO,
      'GRUPPO_NOME_VUOTO',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  const visibilita = dati.visibilita ?? 'PRIVATO';

  return {
    nome,
    visibilita,
    // Si salva **sempre**, anche per un gruppo che nasce privato: G5 dice «alla
    // creazione», e quello è il momento in cui il valore si prende. Salvarlo
    // solo per i gruppi già aperti all'ateneo renderebbe impossibile aprirli
    // dopo — la regola confronta questo campo con l'università di chi legge, e
    // un campo vuoto non corrisponde a nessuno. Non cambia alcun
    // comportamento: si consulta solo quando la visibilità è ATENEO.
    ateneoId: dati.universitaIdDelCreatore,
  };
}

/** G1 anche in modifica: un nome non diventa vuoto per via di un aggiornamento. */
export function verificaNome(nome: string): string {
  const pulito = nome.trim();
  if (!pulito || pulito.length > LUNGHEZZA_MASSIMA_NOME_GRUPPO) {
    throw new AppException(
      GruppoErrorCode.NOME_VUOTO,
      'GRUPPO_NOME_VUOTO',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  return pulito;
}

/**
 * G2 — non si resta senza moderatori.
 *
 * È un'affermazione sull'**insieme** dei membri, ed è il motivo per cui il
 * Membro è entità interna del Gruppo: nessun membro isolato può sapere se è
 * l'ultimo moderatore. La via d'uscita non è un'eccezione ma un verbo che il
 * dominio possiede già — **promuovere** qualcun altro.
 *
 * Il caso concorrente — due moderatori che si retrocedono a vicenda, ciascuno
 * vedendo una situazione lecita — non lo può fermare questa funzione, che
 * guarda un insieme già letto: lo ferma il blocco ottimistico sulla versione.
 */
export function verificaNonSiaLUltimoModeratore(
  membri: MembroDelGruppo[],
  utenteId: string,
): void {
  const bersaglio = membri.find((m) => m.utenteId === utenteId);
  if (!bersaglio?.moderatore) return;

  const altriModeratori = membri.filter((m) => m.moderatore && m.utenteId !== utenteId);
  if (altriModeratori.length === 0) {
    throw new AppException(
      GruppoErrorCode.ULTIMO_MODERATORE,
      'GRUPPO_ULTIMO_MODERATORE',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * Chi può vedere questo gruppo, deciso **al momento della lettura**.
 *
 * Un membro lo vede sempre, qualunque sia la visibilità: le regole dicono chi
 * *altro* lo vede. Per gli altri valgono i tre valori, con l'ateneo del gruppo
 * confrontato con l'università **fresca** di chi legge.
 */
export function puoVedere(
  gruppo: { visibilita: VisibilitaGruppo; ateneoId: string | null },
  lettore: { eMembro: boolean; universitaId: string | null },
): boolean {
  if (lettore.eMembro) return true;
  if (gruppo.visibilita === 'PUBBLICO') return true;
  if (gruppo.visibilita === 'ATENEO') {
    return Boolean(gruppo.ateneoId) && lettore.universitaId === gruppo.ateneoId;
  }
  return false;
}
