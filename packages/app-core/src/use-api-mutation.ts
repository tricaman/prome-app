import { useCallback } from 'react';
import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { ApiEnvelope } from '@prome/contracts';
import { avvisatore, messaggioSuccessoPredefinito } from './feedback';
import { codiceErrore, messaggioErrore } from './errori';
import { applicaErroriDiValidazione } from './form-utils';

type Messaggio<T> = string | ((valore: T) => string);

export interface OpzioniApiMutation<TData, TVariabili, TContesto>
  extends Omit<UseMutationOptions<TData, unknown, TVariabili, TContesto>, 'onSuccess' | 'onError'> {
  /** Sovrascrive il messaggio di successo del server (di norma non serve). */
  messaggioSuccesso?: Messaggio<TData>;
  /** Sovrascrive il messaggio di errore del server (di norma non serve). */
  messaggioErrore?: Messaggio<unknown>;
  mostraAvvisoSuccesso?: boolean;
  mostraAvvisoErrore?: boolean;
  /** Chiavi di query da invalidare quando la scrittura riesce. */
  invalida?: QueryKey[] | ((dati: TData, variabili: TVariabili) => QueryKey[]);
  /**
   * Form da cui è partita la scrittura: gli errori di validazione del server
   * vengono riportati sui campi corrispondenti invece di restare in un avviso.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<any>;
  onSuccess?: (
    dati: TData,
    variabili: TVariabili,
    contesto: TContesto | undefined,
  ) => void | Promise<void>;
  onError?: (
    errore: unknown,
    variabili: TVariabili,
    contesto: TContesto | undefined,
  ) => void | Promise<void>;
}

/**
 * Scrittura verso l'API con il contorno già montato: avviso di esito, errori
 * di validazione riportati sui campi del form, invalidazione delle query.
 *
 * I messaggi arrivano dal server già tradotti (`meta.message` per il successo,
 * `message` per l'errore): la pagina non deve tradurre nulla e non deve
 * scrivere un `onError` per mostrare l'errore.
 *
 * ```typescript
 * const salva = useApiMutation({
 *   mutationFn: creaPost,
 *   invalida: [chiaveListaPost()],
 *   form,
 * })
 * salva.mutate({ data: valori })
 * ```
 */
export function useApiMutation<TData = unknown, TVariabili = void, TContesto = unknown>(
  opzioni: OpzioniApiMutation<TData, TVariabili, TContesto>,
): UseMutationResult<TData, unknown, TVariabili, TContesto> {
  const {
    messaggioSuccesso,
    messaggioErrore: messaggioErrorePersonalizzato,
    mostraAvvisoSuccesso = true,
    mostraAvvisoErrore = true,
    invalida,
    form,
    onSuccess,
    onError,
    ...opzioniMutation
  } = opzioni;

  const queryClient = useQueryClient();

  const invalidaChiavi = useCallback(
    async (dati: TData, variabili: TVariabili) => {
      if (!invalida) return;
      const chiavi = typeof invalida === 'function' ? invalida(dati, variabili) : invalida;
      await Promise.all(
        chiavi.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
    [invalida, queryClient],
  );

  return useMutation<TData, unknown, TVariabili, TContesto>({
    ...opzioniMutation,
    onSuccess: async (dati, variabili, contesto) => {
      if (mostraAvvisoSuccesso) {
        avvisatore().successo(risolviMessaggioSuccesso(messaggioSuccesso, dati));
      }
      await invalidaChiavi(dati, variabili);
      await onSuccess?.(dati, variabili, contesto);
    },
    onError: async (errore, variabili, contesto) => {
      // I campi sbagliati si segnalano sul campo, non in un avviso volante.
      const applicatiAlForm = form
        ? applicaErroriDiValidazione(form as UseFormReturn<FieldValues>, errore)
        : false;

      if (mostraAvvisoErrore && !applicatiAlForm) {
        const messaggio =
          typeof messaggioErrorePersonalizzato === 'function'
            ? messaggioErrorePersonalizzato(errore)
            : (messaggioErrorePersonalizzato ?? messaggioErrore(errore));
        avvisatore().errore(messaggio, { descrizione: codiceErrore(errore) });
      }

      await onError?.(errore, variabili, contesto);
    },
  });
}

function risolviMessaggioSuccesso<TData>(
  personalizzato: Messaggio<TData> | undefined,
  dati: TData,
): string {
  if (typeof personalizzato === 'function') return personalizzato(dati);
  if (personalizzato) return personalizzato;

  // Il messaggio di esito viaggia nell'envelope, già nella lingua giusta.
  const envelope = dati as ApiEnvelope<unknown> | undefined;
  return envelope?.meta?.message ?? messaggioSuccessoPredefinito();
}
