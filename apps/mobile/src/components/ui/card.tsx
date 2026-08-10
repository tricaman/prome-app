import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTema } from '@/theme';
import { Text } from './text';

export interface CardProps {
  titolo?: string;
  descrizione?: string;
  children?: ReactNode;
  style?: ViewStyle;
}

/** Superficie morbida che raccoglie un blocco di contenuto. */
export function Card({ titolo, descrizione, children, style }: CardProps) {
  const tema = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: tema.colori.superficie,
          borderRadius: tema.raggio['2xl'],
          padding: tema.spaziatura[5],
          gap: tema.spaziatura[2],
          borderWidth: 1,
          borderColor: tema.colori.bordo,
        },
        tema.ombra.md,
        style,
      ]}
    >
      {titolo ? <Text variante="sottotitolo">{titolo}</Text> : null}
      {descrizione ? <Text variante="corpoTenue">{descrizione}</Text> : null}
      {children}
    </View>
  );
}
