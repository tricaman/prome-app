'use client';

import { Switch as HeroSwitch } from '@heroui/react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  /** Etichetta accessibile: obbligatoria, l'interruttore da solo non dice nulla. */
  etichetta: string;
  attivo: boolean;
  disabilitato?: boolean;
  /** Con `true` mostra lo stato acceso ma non lascia spegnerlo (regola di dominio). */
  bloccatoAcceso?: boolean;
  dimensione?: 'sm' | 'md';
  className?: string;
  onChange?: (attivo: boolean) => void;
}

/**
 * Interruttore acceso/spento.
 *
 * `bloccatoAcceso` serve dove una regola del dominio impone lo stato: un
 * Moderatore ha sempre tutti i permessi, e mostrarli spenti o modificabili
 * sarebbe una bugia. Resta visibile e leggibile, ma non si tocca.
 */
export function Switch({
  etichetta,
  attivo,
  disabilitato,
  bloccatoAcceso = false,
  dimensione = 'md',
  className,
  onChange,
}: SwitchProps) {
  return (
    <HeroSwitch
      aria-label={etichetta}
      isSelected={bloccatoAcceso ? true : attivo}
      isReadOnly={bloccatoAcceso}
      isDisabled={disabilitato}
      onChange={onChange}
      className={cn(
        bloccatoAcceso && 'cursor-default opacity-90',
        dimensione === 'sm' && 'scale-90',
        className,
      )}
    />
  );
}
