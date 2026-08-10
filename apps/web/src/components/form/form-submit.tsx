'use client';

import type { ReactNode } from 'react';
import { useFormState, useFormContext } from 'react-hook-form';
import { Button, type ButtonProps } from '@/components/ui';

export interface FormSubmitProps extends Omit<ButtonProps, 'type' | 'inCaricamento'> {
  /** Disabilita finché l'utente non modifica nulla (utile in modifica). */
  soloSeModificato?: boolean;
  children: ReactNode;
}

/**
 * Pulsante di invio che legge da sé lo stato del form: mostra l'attesa mentre
 * la richiesta è in corso e impedisce il doppio invio.
 *
 * Non si disabilita quando il form è invalido: sarebbe un vicolo cieco, perché
 * l'utente non capirebbe cosa manca. Al primo tentativo compaiono gli errori
 * sui campi, che è l'informazione che serve davvero.
 */
export function FormSubmit({ soloSeModificato = false, children, ...props }: FormSubmitProps) {
  const { control } = useFormContext();
  const { isSubmitting, isDirty } = useFormState({ control });

  return (
    <Button
      {...props}
      type="submit"
      inCaricamento={isSubmitting}
      isDisabled={props.isDisabled || (soloSeModificato && !isDirty)}
    >
      {children}
    </Button>
  );
}
