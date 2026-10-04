import { createContext, useContext, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useDuePannelli } from '@/hooks';
import { useTema } from '@/theme';
import { Text } from '@/components/ui';

interface Pannello {
  /** The item open in the detail pane, if any. */
  selezionato: string | null;
  seleziona: (id: string) => void;
  /** Empties the detail pane: the item was deleted, or left. */
  chiudi: () => void;
}

const ContestoPannello = createContext<Pannello | null>(null);

/**
 * The detail pane around the caller, or `null` outside a split view (on a
 * phone, or on a screen of its own). A detail uses it to know where it lives:
 * in a pane it has no back button, and when what it shows goes away it closes
 * the pane instead of navigating.
 */
export function usePannelloDettaglio(): Pannello | null {
  return useContext(ContestoPannello);
}

/**
 * How a card opens its detail: in the pane next to the list when there is
 * one, as a new screen otherwise. The cards call this instead of
 * `router.push`, so the same card works in both layouts.
 */
export function useApriDettaglio(rotta: (id: string) => Href): (id: string) => void {
  const pannello = usePannelloDettaglio();

  return (id) => (pannello ? pannello.seleziona(id) : router.push(rotta(id)));
}

/**
 * How a detail leaves once what it shows is gone (deleted, left, blocked):
 * it empties the pane in a split view, and otherwise goes back, or to
 * `rotta` when one is given.
 */
export function useLasciaDettaglio(rotta?: Href): () => void {
  const pannello = usePannelloDettaglio();

  return () => {
    if (pannello) {
      pannello.chiudi();
    } else if (rotta) {
      router.replace(rotta);
    } else {
      router.back();
    }
  };
}

export interface ElencoEDettaglioProps {
  /** The list: the tab screen as it is on a phone. */
  children: ReactNode;
  /** The detail of the selected item, drawn in the right pane. */
  dettaglio: (id: string) => ReactNode;
  /** The hint in the right pane while nothing is selected. */
  suggerimento: string;
}

/**
 * List and detail side by side when they both fit (`duePannelli`), the list
 * alone otherwise.
 *
 * On a phone, and on a tablet too narrow for two panes, it renders the list
 * and nothing else, and tapping an item opens a new screen as before. When
 * both fit, the list keeps a fixed width on the left and the selected item
 * opens on the right, so moving from one room or post to the next is a tap,
 * not a round trip.
 */
export function ElencoEDettaglio({ children, dettaglio, suggerimento }: ElencoEDettaglioProps) {
  const affiancati = useDuePannelli();
  const tema = useTema();
  const [selezionato, setSelezionato] = useState<string | null>(null);

  if (!affiancati) {
    return <>{children}</>;
  }

  const pannello: Pannello = {
    selezionato,
    seleziona: setSelezionato,
    chiudi: () => setSelezionato(null),
  };

  return (
    <ContestoPannello.Provider value={pannello}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: tema.colori.sfondo }}>
        <View
          style={{
            width: tema.larghezza.elenco,
            borderRightWidth: 1,
            borderRightColor: tema.colori.bordo,
          }}
        >
          {children}
        </View>
        <View style={{ flex: 1 }}>
          {selezionato ? (
            // `key` starts the detail fresh for each item: its scroll, open
            // tab and half-written comment belong to the item, not the pane.
            <View key={selezionato} style={{ flex: 1 }}>
              {dettaglio(selezionato)}
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: tema.spaziatura[8],
              }}
            >
              <Text variante="corpoTenue" allineamento="center">
                {suggerimento}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ContestoPannello.Provider>
  );
}
