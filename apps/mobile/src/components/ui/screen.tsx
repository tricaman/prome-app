import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Con `true` il contenuto scorre; con `false` resta fisso a schermo. */
  scorrevole?: boolean;
  /** Centra il contenuto: per schermate di stato (attesa, errore, vuoto). */
  centrato?: boolean;
  /**
   * Con `false` non tiene conto di notch e barra gesti.
   *
   * Serve quando la schermata sta già dentro una cornice che quei margini li
   * ha presi: un'intestazione sopra e la barra delle schede sotto. Prenderli
   * due volte non è un dettaglio — sono una sessantina di punti di vuoto sotto
   * al titolo, che è esattamente ciò che rendeva le schede diverse fra loro.
   */
  conAreaSicura?: boolean;
  /**
   * Aggiornamento a trascinamento. Ha effetto solo con `scorrevole`: senza
   * scorrimento non c'è il gesto che lo fa partire.
   */
  refreshControl?: ScrollViewProps['refreshControl'];
  /**
   * Applies to the content column, not to the whole screen: on a tablet the
   * column is narrower than the screen, and a background here would paint a
   * strip in the middle. The screen background is always the theme's `sfondo`.
   */
  style?: ViewStyle;
}

/**
 * Cornice di una schermata: sfondo dal tema e margini che tengono conto di
 * notch, barra di stato e barra gesti, così nulla finisce sotto il vetro.
 */
export function Screen({
  children,
  scorrevole = false,
  centrato = false,
  conAreaSicura = true,
  refreshControl,
  style,
}: ScreenProps) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();

  const riempimento: ViewStyle = {
    paddingTop: (conAreaSicura ? bordi.top : 0) + tema.spaziatura[4],
    paddingBottom: (conAreaSicura ? bordi.bottom : 0) + tema.spaziatura[4],
    paddingHorizontal: tema.spaziatura[5],
    gap: tema.spaziatura[4],
  };

  // On a tablet the content stays a readable column in the middle, and the
  // background still fills the screen. On a phone the cap is never reached.
  const colonna: ViewStyle = {
    width: '100%',
    maxWidth: tema.larghezza.colonna,
    alignSelf: 'center',
  };

  if (scorrevole) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: tema.colori.sfondo }}
        contentContainerStyle={[
          riempimento,
          colonna,
          centrato && { flexGrow: 1, justifyContent: 'center' },
          style,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tema.colori.sfondo }}>
      <View
        style={[
          { flex: 1 },
          riempimento,
          colonna,
          centrato && { justifyContent: 'center', alignItems: 'center' },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
