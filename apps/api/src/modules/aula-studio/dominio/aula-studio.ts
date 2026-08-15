import { HttpStatus } from '@nestjs/common';
import type { PermessoAulaStudio, VisibilitaAulaStudio } from '@prome/contracts';
import { AppException } from '../../../common/exceptions';
import type { ProvaOnboardingCompletato } from '../../profilo/prova-onboarding';
import { AulaStudioErrorCode } from '../constants/error-codes';

/**
 * Le invarianti dell'Aula studio, dove nessun DTO può aggirarle.
 *
 * La validazione dell'ingresso protegge dalla richiesta malformata, il
 * costruttore protegge l'aggregato: sono due cose diverse, e confonderle
 * lascerebbe l'aula scoperta quando nasce da un comando che non passa dalla
 * facciata.
 */

/** I tre permessi, e nessun altro (AS4). */
export const PERMESSI: readonly PermessoAulaStudio[] = ['parlare', 'scrivere', 'caricare'];

export interface Permessi {
  parlare: boolean;
  scrivere: boolean;
  caricare: boolean;
}

export const NESSUN_PERMESSO: Permessi = { parlare: false, scrivere: false, caricare: false };
export const TUTTI_I_PERMESSI: Permessi = { parlare: true, scrivere: true, caricare: true };

/** L'insieme vuoto è la Sola lettura: uno stato legittimo, non un errore. */
export const eSolaLettura = (permessi: Permessi): boolean =>
  !permessi.parlare && !permessi.scrivere && !permessi.caricare;

export interface AulaDaScrivere {
  titolo: string;
  visibilita: VisibilitaAulaStudio;
  ateneo: string | null;
  dataOraInizio: Date | null;
  creatoreId: string;
}

/**
 * Costruisce un'aula studio valida, o non la costruisce affatto.
 *
 * Come per il Post (B6), la **prova di onboarding** entra nel costruttore:
 * non si verifica un fatto che vive in un altro contesto, si esige che la
 * prova sia presente qui. Senza, non c'è aula — non un oggetto malformato da
 * correggere.
 */
export function costruisciAula(
  prova: ProvaOnboardingCompletato,
  dati: {
    titolo: string;
    visibilita?: VisibilitaAulaStudio;
    dataOraInizio?: Date | null;
    /** Università del creatore: diventa l'ateneo congelato dell'aula (AS7). */
    universitaDelCreatore: string | null;
  },
): AulaDaScrivere {
  const titolo = dati.titolo.trim();
  // AS1
  if (!titolo) {
    throw new AppException(
      AulaStudioErrorCode.TITOLO_VUOTO,
      'AULA_TITOLO_VUOTO',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  // AS8: se c'è una data, alla creazione deve essere futura. Il vincolo vale
  // qui e non oltre: una data che diventa passata non invalida l'aula, perché
  // la data non apre né chiude nulla.
  const dataOraInizio = dati.dataOraInizio ?? null;
  if (dataOraInizio && dataOraInizio.getTime() <= Date.now()) {
    throw new AppException(
      AulaStudioErrorCode.DATA_NEL_PASSATO,
      'AULA_DATA_NEL_PASSATO',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  const visibilita = dati.visibilita ?? 'PRIVATO';

  return {
    titolo,
    visibilita,
    // AS7: precompilato dall'università del creatore **alla creazione** e da lì
    // congelato. Se il creatore cambierà ateneo, lo spazio non cambierà
    // pubblico.
    //
    // Si salva **sempre**, anche per un'aula che nasce privata, ed è la lettura
    // fedele dell'invariante: il momento in cui si prende il valore è la
    // creazione, non il primo uso. Salvarlo solo per le aule già aperte
    // all'ateneo renderebbe impossibile aprirle dopo — la regola confronta
    // questo campo con l'università di chi legge, e un campo vuoto non
    // corrisponde a nessuno. L'aula diventerebbe «riservata all'ateneo» e
    // visibile a nessuno, in silenzio.
    //
    // Non cambia alcun comportamento: l'ateneo si consulta soltanto quando la
    // visibilità è ATENEO.
    ateneo: dati.universitaDelCreatore,
    dataOraInizio,
    creatoreId: prova.utenteId,
  };
}

/**
 * I permessi che un partecipante ha davvero.
 *
 * AS5 in un solo verso: un moderatore ha **sempre** i tre permessi, e finché
 * dura il ruolo non sono revocabili. Non vale il contrario — avere i tre
 * permessi non fa moderatore, e questa funzione non lo lascia nemmeno
 * sospettare: legge il ruolo, non lo deduce.
 */
export function permessiEffettivi(partecipante: {
  moderatore: boolean;
  parlare: boolean;
  scrivere: boolean;
  caricare: boolean;
}): Permessi {
  if (partecipante.moderatore) return { ...TUTTI_I_PERMESSI };
  return {
    parlare: partecipante.parlare,
    scrivere: partecipante.scrivere,
    caricare: partecipante.caricare,
  };
}

/**
 * AS2: l'ultimo moderatore non si rimuove né si retrocede.
 *
 * La verifica ha senso solo guardando **tutti** i partecipanti insieme, ed è
 * la ragione per cui il Partecipante è entità interna dell'aula. Il caso
 * concorrente — due moderatori che si retrocedono a vicenda, ciascuno vedendo
 * una situazione lecita — lo respinge il confronto di versione, non questa
 * funzione.
 */
export function verificaNonSiaLUltimoModeratore(
  moderatoriTotali: number,
  bersaglio: { moderatore: boolean },
): void {
  if (bersaglio.moderatore && moderatoriTotali <= 1) {
    throw new AppException(
      AulaStudioErrorCode.ULTIMO_MODERATORE,
      'AULA_ULTIMO_MODERATORE',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/** 25 MB, in byte: le stesse regole di B3, enunciate di nuovo qui (AL1). */
export const DIMENSIONE_MASSIMA_MATERIALE = 25 * 1024 * 1024;

/** AL1: il file dev'essere completo e utilizzabile, o non diventa materiale. */
export function verificaMateriale(file: { nome: string; dimensione: number }): void {
  if (!file.nome.trim() || file.dimensione <= 0 || file.dimensione > DIMENSIONE_MASSIMA_MATERIALE) {
    throw new AppException(
      AulaStudioErrorCode.FILE_NON_VALIDO,
      'AULA_FILE_NON_VALIDO',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { massimo: DIMENSIONE_MASSIMA_MATERIALE },
    );
  }
}
