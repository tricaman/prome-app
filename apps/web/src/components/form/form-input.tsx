'use client';

import type { FieldValues, Path } from 'react-hook-form';
import { Input, type InputProps } from '@/components/ui';
import { useCampo } from './use-campo';

export interface FormInputProps<TValori extends FieldValues>
  extends Omit<InputProps, 'valore' | 'onChange' | 'onBlur' | 'errore'> {
  name: Path<TValori>;
}

/** Campo di testo collegato al form: valore, errori e stato arrivano da soli. */
export function FormInput<TValori extends FieldValues>({
  name,
  ...props
}: FormInputProps<TValori>) {
  const campo = useCampo<TValori>(name);

  return (
    <Input
      {...props}
      valore={campo.valore ?? ''}
      onChange={campo.onChange}
      onBlur={campo.onBlur}
      errore={campo.errore}
      disabilitato={props.disabilitato ?? campo.disabilitato}
    />
  );
}
