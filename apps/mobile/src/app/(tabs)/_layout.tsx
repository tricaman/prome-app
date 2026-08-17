import { Tabs } from 'expo-router';
import { useTema } from '@/theme';
import { useNotificheLive, useT } from '@/hooks';
import { Icona } from '@/components/ui';

/**
 * Barra delle schede: le destinazioni dell'app.
 *
 * Nessun menu "altro": se una funzione non merita una scheda, vive dentro una
 * di queste. La composizione di un post non è una scheda ma un'azione, e ha un
 * pulsante fluttuante nella bacheca.
 *
 * La scheda dei gruppi era stata **tolta** perché mostrava tre gruppi
 * inventati di una persona che non esiste, mentre sul web i gruppi diventavano
 * veri. È tornata con E12.1, e adesso mostra i gruppi di chi guarda.
 *
 * **Il numero delle notifiche sta qui**, sulla bacheca, e non solo sulla
 * campanella dentro la bacheca: da un'altra scheda la campanella non si vede,
 * e una notifica che si annuncia solo dove sei già arrivato non annuncia
 * niente. È lo stesso conteggio, letto dalla stessa query.
 *
 * Il socket lo tiene questo livello e non la scheda: qui è acceso finché lo è
 * una scheda qualsiasi, e ce n'è **uno solo**.
 */
export default function LayoutSchede() {
  const tema = useTema();
  const t = useT();
  const { nonLette } = useNotificheLive();

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
          // Zero non disegna nulla, e sopra il 9 dice «9+»: le stesse due
          // regole della campanella, perché è lo stesso numero.
          tabBarBadge: nonLette > 0 ? (nonLette > 9 ? '9+' : nonLette) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: tema.colori.avviso,
            color: tema.colori.avvisoTesto,
            fontSize: 10,
            fontWeight: '800',
          },
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
        name="gruppi"
        options={{
          title: t('app.nav.gruppi'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="gruppi" dimensione={24} colore={focused ? 'primario' : 'tenue'} />
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
