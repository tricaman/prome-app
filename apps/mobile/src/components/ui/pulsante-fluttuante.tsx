import { Pressable } from 'react-native';
import { useTema } from '@/theme';
import { Icona, type NomeIcona } from './icona';
import { Text } from './text';

export interface PulsanteFluttuanteProps {
  /** Cosa fa, scritto per esteso: è anche l'etichetta per chi non vede. */
  etichetta: string;
  icona?: NomeIcona;
  onPress: () => void;
}

/**
 * L'azione principale di una scheda, sempre sotto il pollice.
 *
 * Su un telefono l'azione che conta non può stare in cima allo scorrimento:
 * dopo dieci post non la raggiunge più nessuno. Sta qui una volta sola perché
 * era scritta identica in tre schede, e tre copie della stessa misura sono
 * tre modi di scostarsi da essa.
 *
 * Lo spazio in fondo all'elenco perché non copra l'ultima scheda lo riserva
 * `SchermataTab`, che sa se questo pulsante c'è.
 */
export function PulsanteFluttuante({ etichetta, icona = 'piu', onPress }: PulsanteFluttuanteProps) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      onPress={onPress}
      style={[
        {
          position: 'absolute',
          right: tema.spaziatura[5],
          bottom: tema.spaziatura[6],
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[2],
          height: 56,
          paddingHorizontal: tema.spaziatura[5],
          borderRadius: tema.raggio.full,
          backgroundColor: tema.colori.primario,
        },
        tema.ombra.lg,
      ]}
    >
      <Icona nome={icona} dimensione={22} colore="primarioTesto" />
      <Text variante="etichetta" style={{ color: tema.colori.primarioTesto }}>
        {etichetta}
      </Text>
    </Pressable>
  );
}
