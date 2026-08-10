import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTema } from '@/theme';
import { Text } from './text';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  titolo: string;
  variante?: 'primaria' | 'secondaria' | 'contorno' | 'fantasma' | 'distruttiva';
  dimensione?: 'md' | 'lg';
  inCaricamento?: boolean;
  larghezzaPiena?: boolean;
  iconaSinistra?: ReactNode;
  style?: ViewStyle;
}

/**
 * Bottone dell'app.
 *
 * Area toccabile di almeno 48 punti: sotto questa misura il tocco fallisce
 * spesso, ed è uno degli errori più fastidiosi da usare su un telefono.
 * Durante il caricamento resta della stessa dimensione, così il contenuto
 * attorno non si sposta.
 */
export function Button({
  titolo,
  variante = 'primaria',
  dimensione = 'md',
  inCaricamento = false,
  larghezzaPiena = false,
  iconaSinistra,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const tema = useTema();
  const inattivo = disabled || inCaricamento;

  const sfondi: Record<NonNullable<ButtonProps['variante']>, string> = {
    primaria: tema.colori.primario,
    secondaria: tema.colori.superficieAlt,
    contorno: 'transparent',
    fantasma: 'transparent',
    distruttiva: tema.colori.errore,
  };

  const testi: Record<NonNullable<ButtonProps['variante']>, string> = {
    primaria: tema.colori.primarioTesto,
    secondaria: tema.colori.testo,
    contorno: tema.colori.testo,
    fantasma: tema.colori.primario,
    distruttiva: tema.colori.erroreTesto,
  };

  return (
    <Pressable
      {...props}
      disabled={inattivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inattivo, busy: inCaricamento }}
      style={({ pressed }) => [
        stili.base,
        {
          backgroundColor: sfondi[variante],
          borderRadius: tema.raggio.full,
          paddingVertical: dimensione === 'lg' ? tema.spaziatura[4] : tema.spaziatura[3],
          paddingHorizontal: tema.spaziatura[6],
          borderWidth: variante === 'contorno' ? 1 : 0,
          borderColor: tema.colori.bordo,
          alignSelf: larghezzaPiena ? 'stretch' : 'flex-start',
          opacity: inattivo ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {inCaricamento ? (
        <ActivityIndicator size="small" color={testi[variante]} />
      ) : (
        iconaSinistra
      )}
      <View>
        <Text variante="etichetta" style={{ color: testi[variante] }}>
          {titolo}
        </Text>
      </View>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
});
