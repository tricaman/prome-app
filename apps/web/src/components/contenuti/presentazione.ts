import type { StatoAulaStudio, TipoAllegato } from '@/content';
import type { TonoChip } from '@/components/ui';

/**
 * Come si presentano i concetti del dominio.
 *
 * Un solo posto decide che "in corso" è menta e "programmata" è ambra, che un
 * PDF è rosa e un'immagine è blu. Senza questo, la stessa aula studio
 * finirebbe con colori diversi da una pagina all'altra.
 */

export const TONO_STATO_AULA: Record<StatoAulaStudio, TonoChip> = {
  'in-corso': 'menta',
  programmata: 'ambra',
  terminata: 'neutro',
};

/** Chiave dentro `pagine.aula` per l'etichetta dello stato. */
export const ETICHETTA_STATO_AULA: Record<StatoAulaStudio, 'inCorso' | 'programmata'> = {
  'in-corso': 'inCorso',
  programmata: 'programmata',
  terminata: 'programmata',
};

export const TONO_ALLEGATO: Record<TipoAllegato, TonoChip> = {
  pdf: 'rosa',
  immagine: 'blu',
  testo: 'menta',
};

/** Sigla mostrata sulla targhetta del file. */
export const SIGLA_ALLEGATO: Record<TipoAllegato, string> = {
  pdf: 'PDF',
  immagine: 'IMG',
  testo: 'TXT',
};

/** Numeri con i separatori italiani: 3240 → "3.240". */
export const numero = (valore: number): string => valore.toLocaleString('it-IT');
