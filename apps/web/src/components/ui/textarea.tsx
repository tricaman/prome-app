'use client';

import { Description, FieldError, Label, TextArea as HeroTextArea, TextField } from '@heroui/react';
import { cn } from '@/lib/utils';

export interface TextareaProps {
  etichetta?: string;
  segnaposto?: string;
  aiuto?: string;
  errore?: string;
  valore?: string;
  righe?: number;
  /** Limite di caratteri: mostrato all'utente, non solo imposto. */
  massimoCaratteri?: number;
  obbligatorio?: boolean;
  disabilitato?: boolean;
  className?: string;
  onChange?: (valore: string) => void;
  onBlur?: () => void;
}

/**
 * Campo di testo su più righe.
 *
 * Con `massimoCaratteri` mostra quanto spazio resta: i limiti del dominio
 * (un post arriva a 5.000 caratteri, un commento a 2.000) devono essere
 * visibili mentre si scrive, non scoprirsi al momento dell'invio.
 */
export function Textarea({
  etichetta,
  segnaposto,
  aiuto,
  errore,
  valore,
  righe = 4,
  massimoCaratteri,
  obbligatorio,
  disabilitato,
  className,
  onChange,
  onBlur,
}: TextareaProps) {
  const usati = valore?.length ?? 0;

  return (
    <TextField
      className={cn('flex w-full flex-col gap-1.5', className)}
      isDisabled={disabilitato}
      isRequired={obbligatorio}
      isInvalid={Boolean(errore)}
      validationBehavior="aria"
      value={valore ?? ''}
      onChange={onChange}
      onBlur={onBlur}
    >
      {etichetta ? <Label>{etichetta}</Label> : null}
      <HeroTextArea rows={righe} placeholder={segnaposto} maxLength={massimoCaratteri} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {aiuto && !errore ? <Description>{aiuto}</Description> : null}
          {errore ? <FieldError>{errore}</FieldError> : null}
        </div>
        {massimoCaratteri ? (
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums text-testo-tenue',
              usati > massimoCaratteri * 0.9 && 'text-avviso',
            )}
          >
            {usati}/{massimoCaratteri}
          </span>
        ) : null}
      </div>
    </TextField>
  );
}
