import { Tabs } from 'expo-router';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Icona } from '@/components/ui';

/**
 * Barra delle schede: le destinazioni dell'app.
 *
 * Nessun menu "altro": se una funzione non merita una scheda, vive dentro una
 * di queste. La composizione di un post non è una scheda ma un'azione, e ha un
 * pulsante fluttuante nella bacheca.
 *
 * **I gruppi non ci sono ancora**, e la scheda è stata tolta invece di essere
 * lasciata lì: mostrava tre gruppi inventati di una persona che non esiste,
 * mentre sul web i gruppi sono diventati veri. Le schermate native sono E12 —
 * la scheda torna con loro, e l'app non è ancora su nessuno store, quindi
 * nessuno se ne accorgerà.
 */
export default function LayoutSchede() {
  const tema = useTema();
  const t = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tema.colori.primarioTesto,
        tabBarInactiveTintColor: tema.colori.testoTenue,
        tabBarStyle: {
          backgroundColor: tema.colori.superficie,
          borderTopColor: tema.colori.bordo,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="bacheca"
        options={{
          title: t('app.nav.bacheca'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="bacheca" dimensione={24} colore={focused ? 'primario' : 'tenue'} />
          ),
        }}
      />
      <Tabs.Screen
        name="aule-studio"
        options={{
          title: t('app.nav.aule'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="aule" dimensione={24} colore={focused ? 'primario' : 'tenue'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: t('app.nav.profilo'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="profilo" dimensione={24} colore={focused ? 'primario' : 'tenue'} />
          ),
        }}
      />
    </Tabs>
  );
}
