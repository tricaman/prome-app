import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Providers } from '@/providers/providers';
import { useTema } from '@/theme';

/** Radice dell'app: monta i contesti e poi lo stack delle schermate. */
export default function RootLayout() {
  return (
    <Providers>
      <Navigazione />
    </Providers>
  );
}

/**
 * Sta dentro i provider perché legge il tema: barra di stato e sfondo delle
 * schermate seguono chiaro/scuro come tutto il resto.
 *
 * Le intestazioni di sistema sono spente ovunque: ogni schermata disegna la
 * propria con `Intestazione`, che ha titolo grande, sottotitolo e azioni.
 */
function Navigazione() {
  const tema = useTema();

  return (
    <>
      <StatusBar style={tema.eScuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tema.colori.sfondo },
        }}
      >
        {/* La composizione di un post arriva dal basso: è un'azione che si
            apre sopra la bacheca e si chiude tornando dov'eri. */}
        <Stack.Screen name="componi" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
