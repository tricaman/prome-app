import { View, type ViewStyle } from 'react-native';
import type { Tinta } from '@prome/design-tokens';
import type { TipoAllegato } from '@prome/contenuti';
import { useTema } from '@/theme';
import { Text } from '@/components/ui';

/**
 * Come si presentano i tipi di file.
 *
 * Un solo posto decide che un PDF è rosa e un'immagine è blu: senza, lo stesso
 * materiale avrebbe colori diversi da una schermata all'altra.
 */
export const TINTA_ALLEGATO: Record<TipoAllegato, Tinta> = {
  pdf: 'rosa',
  immagine: 'blu',
  testo: 'menta',
};

export const SIGLA_ALLEGATO: Record<TipoAllegato, string> = {
  pdf: 'PDF',
  immagine: 'IMG',
  testo: 'TXT',
};

/** Targhetta del tipo di file: si riconosce di colpo, anche di sbieco. */
export function TarghettaAllegato({
  tipo,
  larghezza = 32,
  altezza = 38,
  style,
}: {
  tipo: TipoAllegato;
  larghezza?: number;
  altezza?: number;
  style?: ViewStyle;
}) {
  const tema = useTema();
  const coppia = tema.tinte[TINTA_ALLEGATO[tipo]];

  return (
    <View
      style={[
        {
          width: larghezza,
          height: altezza,
          borderRadius: tema.raggio.sm,
          backgroundColor: coppia.sfondo,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 8.5,
          fontWeight: tema.tipografia.peso.extra,
          color: coppia.testo,
        }}
      >
        {SIGLA_ALLEGATO[tipo]}
      </Text>
    </View>
  );
}

/** Anteprima grande, per le griglie di materiali. */
export function AnteprimaAllegato({ tipo, altezza = 96 }: { tipo: TipoAllegato; altezza?: number }) {
  const tema = useTema();
  const coppia = tema.tinte[TINTA_ALLEGATO[tipo]];

  return (
    <View
      style={{
        height: altezza,
        backgroundColor: coppia.sfondo,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: tema.raggio.lg,
        borderTopRightRadius: tema.raggio.lg,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: tema.tipografia.peso.extra,
          letterSpacing: 0.6,
          color: coppia.testo,
        }}
      >
        {SIGLA_ALLEGATO[tipo]}
      </Text>
    </View>
  );
}
