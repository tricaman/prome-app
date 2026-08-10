import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Con `true` il contenuto scorre; con `false` resta fisso a schermo. */
  scorrevole?: boolean;
  /** Centra il contenuto: per schermate di stato (attesa, errore, vuoto). */
  centrato?: boolean;
  style?: ViewStyle;
}

/**
 * Cornice di una schermata: sfondo dal tema e margini che tengono conto di
 * notch, barra di stato e barra gesti, così nulla finisce sotto il vetro.
 */
export function Screen({ children, scorrevole = false, centrato = false, style }: ScreenProps) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();

  const riempimento: ViewStyle = {
    paddingTop: bordi.top + tema.spaziatura[4],
    paddingBottom: bordi.bottom + tema.spaziatura[4],
    paddingHorizontal: tema.spaziatura[5],
    gap: tema.spaziatura[4],
  };

  if (scorrevole) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: tema.colori.sfondo }}
        contentContainerStyle={[riempimento, centrato && { flexGrow: 1, justifyContent: 'center' }, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        { flex: 1, backgroundColor: tema.colori.sfondo },
        riempimento,
        centrato && { justifyContent: 'center', alignItems: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
