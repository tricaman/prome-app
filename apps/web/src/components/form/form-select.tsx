'use client';

import type { FieldValues, Path } from 'react-hook-form';
import { Select, type SelectProps } from '@/components/ui';
import { useCampo } from './use-campo';

export interface FormSelectProps<TValori extends FieldValues>
  extends Omit<SelectProps, 'valore' | 'onChange' | 'onBlur' | 'errore'> {
  name: Path<TValori>;
}

/** Scelta singola collegata al form. */
export function FormSelect<TValori extends FieldValues>({
  name,
  ...props
}: FormSelectProps<TValori>) {
  const campo = useCampo<TValori>(name);

  return (
    <Select
      {...props}
      valore={campo.valore ?? null}
      onChange={campo.onChange}
      onBlur={campo.onBlur}
      errore={campo.errore}
      disabilitato={props.disabilitato ?? campo.disabilitato}
    />
  );
}
