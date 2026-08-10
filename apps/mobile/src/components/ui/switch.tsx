import { Switch as SwitchNativo } from 'react-native';
import { useTema } from '@/theme';

export interface SwitchProps {
  /** Etichetta accessibile: obbligatoria, l'interruttore da solo non dice nulla. */
  etichetta: string;
  attivo: boolean;
  disabilitato?: boolean;
  /** Mostra lo stato acceso senza lasciarlo spegnere (regola di dominio). */
  bloccatoAcceso?: boolean;
  onChange?: (attivo: boolean) => void;
}

/**
 * Interruttore acceso/spento, quello di sistema.
 *
 * Su mobile conviene usare il componente nativo invece di ridisegnarlo: è già
 * accessibile, risponde ai gesti come l'utente si aspetta e segue le
 * impostazioni di accessibilità del dispositivo.
 *
 * `bloccatoAcceso` serve dove una regola del dominio impone lo stato — un
 * Moderatore ha sempre tutti i permessi — e mostrarlo spento sarebbe falso.
 */
export function Switch({
  etichetta,
  attivo,
  disabilitato,
  bloccatoAcceso = false,
  onChange,
}: SwitchProps) {
  const tema = useTema();

  return (
    <SwitchNativo
      accessibilityLabel={etichetta}
      value={bloccatoAcceso ? true : attivo}
      disabled={disabilitato || bloccatoAcceso}
      onValueChange={onChange}
      trackColor={{ false: tema.colori.bordoForte, true: tema.colori.primario }}
      thumbColor={tema.colori.superficie}
      ios_backgroundColor={tema.colori.bordoForte}
      style={bloccatoAcceso ? { opacity: 0.9 } : undefined}
    />
  );
}
