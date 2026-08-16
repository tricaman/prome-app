import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/theme';
import { Text } from './text';

export interface FoglioProps {
  aperto: boolean;
  /** Titolo mostrato in cima e letto da chi non vede lo schermo. */
  titolo: string;
  onChiudi: () => void;
  children: ReactNode;
}

/**
 * Foglio che sale dal basso per una decisione.
 *
 * **Destinazione → rotta; decisione → foglio.** Le tre schermate che si aprono
 * come modale (composizione, creazione di un'aula, di un gruppo) sono posti
 * dove si va: hanno un indirizzo, e riaprirle da sole ha senso. Una conferma
 * no — `/impostazioni/conferma-eliminazione` aperta per conto suo confermerebbe
 * il nulla — e soprattutto deve **restituire una risposta** a chi l'ha aperta,
 * cosa che attraverso una rotta richiederebbe parametri o uno stato globale.
 *
 * Da `Modal` arrivano gratis il velo, la salita dal basso e il tasto indietro
 * di Android, che qui chiude invece di uscire dalla schermata.
 */
export function Foglio({ aperto, titolo, onChiudi, children }: FoglioProps) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();

  return (
    <Modal
      visible={aperto}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onChiudi}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={titolo}
          onPress={onChiudi}
          style={{ flex: 1, backgroundColor: tema.colori.velo }}
        />

        <View
          style={{
            backgroundColor: tema.colori.sovrapposizione,
            borderTopLeftRadius: tema.raggio['3xl'],
            borderTopRightRadius: tema.raggio['3xl'],
            paddingTop: tema.spaziatura[3],
            paddingHorizontal: tema.spaziatura[5],
            paddingBottom: bordi.bottom + tema.spaziatura[5],
            gap: tema.spaziatura[3],
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: tema.raggio.full,
              backgroundColor: tema.colori.bordoForte,
              alignSelf: 'center',
              marginBottom: tema.spaziatura[2],
            }}
          />
          <Text variante="sottotitolo" style={{ fontSize: 21 }}>
            {titolo}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}
