import { Tabs } from 'expo-router';
import { useTema } from '@/theme';
import { useLayoutLargo, useNotificheLive, useT } from '@/hooks';
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
 *
 * On a wide window (tablet) the same four destinations move to a sidebar on
 * the left, with the label beside the icon: a bar along the bottom of a
 * 1000pt-wide screen puts four small targets far apart and far from the
 * content. Same destinations, same badge, only the position changes.
 */
export default function LayoutSchede() {
  const tema = useTema();
  const t = useT();
  const { nonLette } = useNotificheLive();
  const largo = useLayoutLargo();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: largo ? 'left' : 'bottom',
        tabBarVariant: largo ? 'material' : 'uikit',
        tabBarLabelPosition: largo ? 'beside-icon' : 'below-icon',
        // In the sidebar the current destination is a filled row, the
        // convention of a side navigation; on the phone bar color is enough.
        tabBarActiveBackgroundColor: largo ? tema.colori.primarioTenue : undefined,
        // **Accento, non `primarioTesto`.** Quello è il colore del testo scritto
        // SOPRA il menta pieno — scuro, perché il menta è chiaro — e sulla
        // barra delle schede, che menta non è, sul fondo scuro spariva: la
        // scheda attiva restava senza nome. L'accento è il menta del marchio
        // adattato allo sfondo della pagina (scurito sul chiaro, pieno sullo
        // scuro), quindi etichetta e icona hanno lo stesso colore in entrambi
        // i temi — che è ciò che fa leggere l'una accanto all'altra.
        tabBarActiveTintColor: tema.colori.primarioAccento,
        tabBarInactiveTintColor: tema.colori.testoTenue,
        tabBarStyle: {
          // Same background as the page, split by the border: the bar is
          // part of the screen, not a white strip laid over it.
          backgroundColor: tema.colori.sfondo,
          borderTopColor: tema.colori.bordo,
          borderRightColor: tema.colori.bordo,
          // The library gives the sidebar a 360pt minimum (the Material
          // default): fixed here, so the list and detail panes keep the room.
          ...(largo
            ? { width: tema.larghezza.navigazione, minWidth: tema.larghezza.navigazione }
            : null),
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
            <Icona nome="bacheca" dimensione={24} colore={focused ? 'accento' : 'tenue'} />
          ),
        }}
      />
      <Tabs.Screen
        name="aule-studio"
        options={{
          title: t('app.nav.aule'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="aule" dimensione={24} colore={focused ? 'accento' : 'tenue'} />
          ),
        }}
      />
      <Tabs.Screen
        name="gruppi"
        options={{
          title: t('app.nav.gruppi'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="gruppi" dimensione={24} colore={focused ? 'accento' : 'tenue'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: t('app.nav.profilo'),
          tabBarIcon: ({ focused }) => (
            <Icona nome="profilo" dimensione={24} colore={focused ? 'accento' : 'tenue'} />
          ),
        }}
      />
    </Tabs>
  );
}
