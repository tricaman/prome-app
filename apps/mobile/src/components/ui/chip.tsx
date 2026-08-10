import { View, type ViewStyle } from 'react-native';
import type { Tinta } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { Text } from './text';

export type TonoChip = 'neutro' | Tinta;

export interface ChipProps {
  /** Il tono racconta lo stato: menta = in corso, ambra = programmata. */
  tono?: TonoChip;
  /** Pallino colorato prima del testo, per gli stati. */
  indicatore?: boolean;
  style?: ViewStyle;
  children: string;
}

/** Etichetta compatta: stato, visibilità, categoria. */
export function Chip({ tono = 'neutro', indicatore = false, style, children }: ChipProps) {
  const tema = useTema();
  const coppia = tono === 'neutro' ? tema.tinte.neutra : tema.tinte[tono];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          backgroundColor: coppia.sfondo,
          borderRadius: tema.raggio.full,
          paddingHorizontal: tema.spaziatura[3],
          paddingVertical: 5,
        },
        style,
      ]}
    >
      {indicatore ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: tema.raggio.full,
            backgroundColor: coppia.testo,
          }}
        />
      ) : null}
      <Text
        variante="didascalia"
        style={{
          color: coppia.testo,
          fontWeight: tema.tipografia.peso.extra,
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
