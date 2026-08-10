import { useCallback, useMemo } from 'react';
import {
  useForm as useReactHookForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { valoriModificati } from './form-utils';

export interface OpzioniForm<TValori extends FieldValues>
  extends Omit<UseFormProps<TValori>, 'resolver'> {
  /** Schema di validazione (zod): unica descrizione delle regole del form. */
  schema: StandardSchemaV1<unknown, TValori>;
}

export interface FormProme<TValori extends FieldValues>
  extends UseFormReturn<TValori, unknown, TValori> {
  /** Vero se l'utente ha toccato almeno un campo. */
  eModificato: boolean;
  eValido: boolean;
  eInInvio: boolean;
  /** Solo i campi toccati: per gli aggiornamenti parziali. */
  valoriModificati: () => Partial<TValori>;
}

/**
 * Form validato da uno schema, con lo stato più usato già a portata di mano.
 *
 * La validazione parte al blur (l'utente non viene corretto mentre scrive) e
 * poi a ogni modifica, così l'errore sparisce appena il campo diventa valido.
 *
 * ```typescript
 * const form = useForm({ schema: schemaPost, defaultValues: { titolo: '' } })
 * ```
 */
export function useForm<TValori extends FieldValues>(
  opzioni: OpzioniForm<TValori>,
): FormProme<TValori> {
  const { schema, ...opzioniForm } = opzioni;

  const form = useReactHookForm<TValori, unknown, TValori>({
    ...opzioniForm,
    // Lo schema valida un ingresso sconosciuto e produce TValori: il tipo del
    // resolver va riallineato a mano, la garanzia la dà lo schema stesso.
    resolver: standardSchemaResolver(
      schema as StandardSchemaV1<FieldValues, TValori>,
    ) as unknown as Resolver<TValori, unknown, TValori>,
    mode: opzioniForm.mode ?? 'onBlur',
    reValidateMode: opzioniForm.reValidateMode ?? 'onChange',
  });

  const {
    formState: { isDirty, isValid, isSubmitting, dirtyFields },
    getValues,
  } = form;

  const leggiValoriModificati = useCallback(
    () => valoriModificati<TValori>(dirtyFields as Record<string, unknown>, getValues()),
    [dirtyFields, getValues],
  );

  return useMemo(
    () => ({
      ...form,
      eModificato: isDirty,
      eValido: isValid,
      eInInvio: isSubmitting,
      valoriModificati: leggiValoriModificati,
    }),
    [form, isDirty, isValid, isSubmitting, leggiValoriModificati],
  );
}
