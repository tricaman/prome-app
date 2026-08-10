'use client';

import {
  Description,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Select as HeroSelect,
} from '@heroui/react';
import { cn } from '@/lib/utils';

export interface OpzioneSelect {
  valore: string;
  etichetta: string;
  disabilitata?: boolean;
}

export interface SelectProps {
  opzioni: readonly OpzioneSelect[];
  etichetta?: string;
  segnaposto?: string;
  aiuto?: string;
  errore?: string;
  valore?: string | null;
  obbligatorio?: boolean;
  disabilitato?: boolean;
  className?: string;
  onChange?: (valore: string) => void;
  onBlur?: () => void;
}

/**
 * Scelta singola da un elenco chiuso.
 *
 * Accetta opzioni piatte `{ valore, etichetta }`: la composizione richiesta
 * dalla libreria resta qui dentro, così le pagine passano dati e non struttura.
 */
export function Select({
  opzioni,
  etichetta,
  segnaposto,
  aiuto,
  errore,
  valore,
  obbligatorio,
  disabilitato,
  className,
  onChange,
  onBlur,
}: SelectProps) {
  return (
    <HeroSelect
      className={cn('flex w-full flex-col gap-1.5', className)}
      isDisabled={disabilitato}
      isRequired={obbligatorio}
      isInvalid={Boolean(errore)}
      validationBehavior="aria"
      placeholder={segnaposto}
      selectedKey={valore ?? null}
      onSelectionChange={(chiave) => onChange?.(String(chiave))}
      onBlur={onBlur}
    >
      {etichetta ? <Label>{etichetta}</Label> : null}
      <HeroSelect.Trigger>
        <HeroSelect.Value />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      {aiuto && !errore ? <Description>{aiuto}</Description> : null}
      {errore ? <FieldError>{errore}</FieldError> : null}
      <HeroSelect.Popover>
        <ListBox>
          {opzioni.map((opzione) => (
            <ListBoxItem key={opzione.valore} id={opzione.valore} isDisabled={opzione.disabilitata}>
              {opzione.etichetta}
            </ListBoxItem>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  );
}
