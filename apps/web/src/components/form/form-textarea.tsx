'use client';

import type { FieldValues, Path } from 'react-hook-form';
import { Textarea, type TextareaProps } from '@/components/ui';
import { useCampo } from './use-campo';

export interface FormTextareaProps<TValori extends FieldValues>
  extends Omit<TextareaProps, 'valore' | 'onChange' | 'onBlur' | 'errore'> {
  name: Path<TValori>;
}

/** Campo su più righe collegato al form. */
export function FormTextarea<TValori extends FieldValues>({
  name,
  ...props
}: FormTextareaProps<TValori>) {
  const campo = useCampo<TValori>(name);

  return (
    <Textarea
      {...props}
      valore={campo.valore ?? ''}
      onChange={campo.onChange}
      onBlur={campo.onBlur}
      errore={campo.errore}
      disabilitato={props.disabilitato ?? campo.disabilitato}
    />
  );
}
