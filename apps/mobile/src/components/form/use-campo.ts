import { useController, useFormContext, type FieldValues, type Path } from 'react-hook-form';

/**
 * Collega un campo al form presente nel contesto.
 * Unico punto in cui i componenti di campo toccano react-hook-form.
 */
export function useCampo<TValori extends FieldValues>(nome: Path<TValori>) {
  const { control } = useFormContext<TValori>();
  const { field, fieldState } = useController<TValori>({ name: nome, control });

  return {
    valore: field.value,
    onChange: field.onChange,
    onBlur: field.onBlur,
    disabilitato: field.disabled,
    errore: fieldState.error?.message,
  };
}
