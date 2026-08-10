import { Pressable, View, type ViewStyle } from 'react-native';
import { useTema } from '@/theme';
import { Text } from './text';

export interface OpzioneSegmento<T extends string> {
  valore: T;
  etichetta: string;
}

export interface SegmentedProps<T extends string> {
  opzioni: readonly OpzioneSegmento<T>[];
  valore: T;
  etichetta: string;
  style?: ViewStyle;
  onChange: (valore: T) => void;
}

/**
 * Scelta tra poche alternative che si escludono, senza cambiare schermata.
 *
 * Da usare con due o tre opzioni tutte visibili: oltre, o quando l'elenco può
 * crescere, serve un altro controllo.
 */
export function Segmented<T extends string>({
  opzioni,
  valore,
  etichetta,
  style,
  onChange,
}: SegmentedProps<T>) {
  const tema = useTema();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={etichetta}
      style={[
        {
          flexDirection: 'row',
          gap: 4,
          backgroundColor: tema.colori.superficieAlt2,
          borderRadius: tema.raggio.full,
          padding: 4,
        },
        style,
      ]}
    >
      {opzioni.map((opzione) => {
        const attiva = opzione.valore === valore;
        return (
          <Pressable
            key={opzione.valore}
            accessibilityRole="tab"
            accessibilityState={{ selected: attiva }}
            onPress={() => onChange(opzione.valore)}
            style={[
              {
                flex: 1,
                height: 38,
                borderRadius: tema.raggio.full,
                alignItems: 'center',
                justifyContent: 'center',
              },
              attiva && { backgroundColor: tema.colori.superficie, ...tema.ombra.sm },
            ]}
          >
            <Text
              variante="etichetta"
              style={{
                fontSize: 13,
                color: attiva ? tema.colori.primario : tema.colori.testoTenue,
                fontWeight: tema.tipografia.peso.extra,
              }}
            >
              {opzione.etichetta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
