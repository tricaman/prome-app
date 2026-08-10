'use client';

import type { FieldValues, Path } from 'react-hook-form';
import { Checkbox, type CheckboxProps } from '@/components/ui';
import { useCampo } from './use-campo';

export interface FormCheckboxProps<TValori extends FieldValues>
  extends Omit<CheckboxProps, 'selezionato' | 'onChange' | 'onBlur' | 'errore'> {
  name: Path<TValori>;
}

/** Interruttore collegato al form. */
export function FormCheckbox<TValori extends FieldValues>({
  name,
  ...props
}: FormCheckboxProps<TValori>) {
  const campo = useCampo<TValori>(name);

  return (
    <Checkbox
      {...props}
      selezionato={Boolean(campo.valore)}
      onChange={campo.onChange}
      onBlur={campo.onBlur}
      errore={campo.errore}
      disabilitato={props.disabilitato ?? campo.disabilitato}
    />
  );
}
