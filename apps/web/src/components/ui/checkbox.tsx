'use client';

import { Checkbox as HeroCheckbox } from '@heroui/react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  etichetta: string;
  /** Riga di spiegazione sotto all'etichetta. */
  descrizione?: string;
  errore?: string;
  selezionato?: boolean;
  disabilitato?: boolean;
  className?: string;
  onChange?: (selezionato: boolean) => void;
  onBlur?: () => void;
}

/** Interruttore a due stati con etichetta cliccabile. */
export function Checkbox({
  etichetta,
  descrizione,
  errore,
  selezionato,
  disabilitato,
  className,
  onChange,
  onBlur,
}: CheckboxProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <HeroCheckbox
        isSelected={selezionato ?? false}
        isDisabled={disabilitato}
        isInvalid={Boolean(errore)}
        onChange={onChange}
        onBlur={onBlur}
      >
        <span className="flex flex-col">
          <span>{etichetta}</span>
          {descrizione ? <span className="text-sm text-testo-tenue">{descrizione}</span> : null}
        </span>
      </HeroCheckbox>
      {errore ? <p className="text-sm text-errore">{errore}</p> : null}
    </div>
  );
}
