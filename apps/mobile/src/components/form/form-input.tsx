import type { FieldValues, Path } from 'react-hook-form';
import { Input, type InputProps } from '@/components/ui';
import { useCampo } from './use-campo';

export interface FormInputProps<TValori extends FieldValues>
  extends Omit<InputProps, 'value' | 'onChangeText' | 'onBlur' | 'errore'> {
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
      value={campo.valore ?? ''}
      onChangeText={campo.onChange}
      onBlur={campo.onBlur}
      errore={campo.errore}
      editable={props.editable ?? !campo.disabilitato}
    />
  );
}
