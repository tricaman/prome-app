'use client';

import { Description, FieldError, Input as HeroInput, Label, TextField } from '@heroui/react';
import { cn } from '@/lib/utils';

export interface InputProps {
  etichetta?: string;
  segnaposto?: string;
  /** Testo di aiuto sotto al campo; sparisce quando compare un errore. */
  aiuto?: string;
  /** Messaggio di errore: presente = campo in errore. */
  errore?: string;
  tipo?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number';
  valore?: string;
  obbligatorio?: boolean;
  disabilitato?: boolean;
  soloLettura?: boolean;
  autoComplete?: string;
  className?: string;
  onChange?: (valore: string) => void;
  onBlur?: () => void;
}

/**
 * Campo di testo a riga singola.
 *
 * Etichetta, aiuto ed errore fanno parte del campo: sono associati
 * all'elemento dai componenti sottostanti, quindi chi usa uno screen reader
 * sente perché il campo è sbagliato invece di trovare solo un bordo rosso.
 */
export function Input({
  etichetta,
  segnaposto,
  aiuto,
  errore,
  tipo = 'text',
  valore,
  obbligatorio,
  disabilitato,
  soloLettura,
  autoComplete,
  className,
  onChange,
  onBlur,
}: InputProps) {
  return (
    <TextField
      className={cn('flex w-full flex-col gap-1.5', className)}
      isDisabled={disabilitato}
      isReadOnly={soloLettura}
      isRequired={obbligatorio}
      isInvalid={Boolean(errore)}
      // La validazione la governa il form, non il browser.
      validationBehavior="aria"
      value={valore ?? ''}
      onChange={onChange}
      onBlur={onBlur}
    >
      {etichetta ? <Label>{etichetta}</Label> : null}
      <HeroInput type={tipo} placeholder={segnaposto} autoComplete={autoComplete} />
      {aiuto && !errore ? <Description>{aiuto}</Description> : null}
      {errore ? <FieldError>{errore}</FieldError> : null}
    </TextField>
  );
}
