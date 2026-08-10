import { useFormContext, useFormState, type FieldValues } from 'react-hook-form';
import { Button, type ButtonProps } from '@/components/ui';

export interface FormSubmitProps<TValori extends FieldValues>
  extends Omit<ButtonProps, 'onPress' | 'inCaricamento'> {
  onSubmit: (valori: TValori) => void | Promise<void>;
  /** Disabilita finché l'utente non modifica nulla (utile in modifica). */
  soloSeModificato?: boolean;
}

/**
 * Pulsante di invio che legge da sé lo stato del form: valida, mostra l'attesa
 * e impedisce il doppio invio.
 *
 * Non si disabilita quando il form è invalido: al primo tocco compaiono gli
 * errori sui campi, che è l'informazione di cui l'utente ha bisogno.
 */
export function FormSubmit<TValori extends FieldValues>({
  onSubmit,
  soloSeModificato = false,
  disabled,
  ...props
}: FormSubmitProps<TValori>) {
  const form = useFormContext<TValori, unknown, TValori>();
  const { isSubmitting, isDirty } = useFormState({ control: form.control });

  return (
    <Button
      {...props}
      inCaricamento={isSubmitting}
      disabled={disabled || (soloSeModificato && !isDirty)}
      onPress={() => void form.handleSubmit(onSubmit)()}
    />
  );
}
