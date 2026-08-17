import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/theme';
import { Text } from './text';

export interface FoglioProps {
  aperto: boolean;
  /** Titolo mostrato in cima e letto da chi non vede lo schermo. */
  titolo: string;
  onChiudi: () => void;
  /**
   * Quanto è alto.
   *
   * `contenuto` (predefinito) è la decisione breve: tre righe e via, e il
   * foglio è alto quanto quello che porta. `alto` è per ciò che si **legge e
   * si scorre** — una conversazione — e prende tre quarti di schermo: sotto
   * quella misura si vedrebbero due commenti, sopra tanto valeva una
   * schermata. Chi passa `alto` deve dare a `children` un figlio con `flex: 1`.
   */
  altezza?: 'contenuto' | 'alto';
  /** Azione a destra del titolo: una chiusura, un conteggio, un'aggiunta. */
  azioni?: ReactNode;
  children: ReactNode;
}

/** Tre quarti: la conversazione si legge, il post sotto resta in vista. */
const ALTEZZA_ALTA = '75%';

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
export function Foglio({
  aperto,
  titolo,
  onChiudi,
  altezza = 'contenuto',
  azioni,
  children,
}: FoglioProps) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();

  const alto = altezza === 'alto';

  return (
    <Modal
      visible={aperto}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onChiudi}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={titolo}
          onPress={onChiudi}
          style={{ flex: 1, backgroundColor: tema.colori.velo }}
        />

        <View
          style={[
            {
              backgroundColor: tema.colori.sovrapposizione,
              borderTopLeftRadius: tema.raggio['3xl'],
              borderTopRightRadius: tema.raggio['3xl'],
              paddingTop: tema.spaziatura[3],
              paddingHorizontal: tema.spaziatura[5],
              gap: tema.spaziatura[3],
            },
            // Il foglio alto tiene la barra gesti al proprio interno: chi
            // scrive in fondo deve poterlo fare fino al bordo.
            alto
              ? { height: ALTEZZA_ALTA, paddingBottom: 0 }
              : { paddingBottom: bordi.bottom + tema.spaziatura[5] },
          ]}
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
            <Text variante="sottotitolo" style={{ flex: 1, fontSize: 21 }}>
              {titolo}
            </Text>
            {azioni}
          </View>

          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
