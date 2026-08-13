import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

/**
 * Ciò che serve davvero per riportare gli errori del server su un form.
 *
 * Non è l'intero `UseFormReturn`: chiedere tutto costringerebbe ogni chiamante
 * a combaciare su tre parametri di tipo, e un form tipizzato bene verrebbe
 * rifiutato per ragioni che non c'entrano con quello che facciamo qui. I
 * metodi sono dichiarati in forma abbreviata di proposito — è la forma in cui
 * TypeScript accetta un form con nomi di campo concreti.
 */
export interface FormConErrori {
  getValues(): FieldValues;
  setError(campo: string, errore: { type: string; message: string }): void;
  setFocus(campo: string): void;
}
import { dettagliValidazione } from './errori';

/**
 * Riporta gli errori di validazione del server sui campi del form.
 * Restituisce `true` se almeno un errore è stato applicato: in quel caso il
 * chiamante evita l'avviso generico, perché l'utente vede già il problema
 * sotto al campo giusto.
 *
 * I messaggi arrivano tradotti dal server, quindi si usano così come sono.
 */
export function applicaErroriDiValidazione<TValori extends FieldValues>(
  form: UseFormReturn<TValori>,
  errore: unknown,
): boolean {
  const dettagli = dettagliValidazione(errore);
  if (dettagli.length === 0) return false;

  const valori = form.getValues();
  let primoApplicato: Path<TValori> | undefined;

  for (const dettaglio of dettagli) {
    // Un campo che il form non conosce va lasciato all'avviso generale,
    // altrimenti l'errore sparirebbe senza che nessuno lo veda. Si guarda la
    // radice del percorso perché `indirizzo.via` vive dentro `indirizzo`.
    const radice = dettaglio.field.split(/[.[]/)[0]!;
    if (!(radice in valori)) continue;

    const campo = dettaglio.field as Path<TValori>;
    form.setError(campo, { type: 'server', message: dettaglio.message });
    primoApplicato ??= campo;
  }

  if (!primoApplicato) return false;

  // Porta l'utente sul primo campo da correggere: su un form lungo l'errore
  // potrebbe essere fuori schermo.
  form.setFocus(primoApplicato);
  return true;
}

/**
 * Solo i valori toccati dall'utente: serve agli aggiornamenti parziali, dove
 * inviare l'intero oggetto sovrascriverebbe campi che nessuno ha modificato.
 */
export function valoriModificati<TValori extends FieldValues>(
  campiModificati: Record<string, unknown>,
  valori: TValori,
): Partial<TValori> {
  const risultato: Record<string, unknown> = {};

  for (const [chiave, modificato] of Object.entries(campiModificati)) {
    if (!modificato) continue;
    const valore = (valori as Record<string, unknown>)[chiave];

    if (modificato === true) {
      risultato[chiave] = valore;
      continue;
    }

    // Oggetti annidati: si scende, così non si perde il resto della struttura.
    if (typeof modificato === 'object' && valore && typeof valore === 'object') {
      if (Array.isArray(modificato)) {
        risultato[chiave] = valore;
      } else {
        risultato[chiave] = valoriModificati(
          modificato as Record<string, unknown>,
          valore as FieldValues,
        );
      }
    }
  }

  return risultato as Partial<TValori>;
}
