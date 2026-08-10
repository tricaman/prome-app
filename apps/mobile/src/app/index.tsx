import { View } from 'react-native';
import { router } from 'expo-router';
import { COLORE_MARCHIO } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { rotte } from '@/content';
import { Button, Screen, Text } from '@/components/ui';

/**
 * Schermata di benvenuto.
 *
 * È la prima cosa che si vede: il marchio, il motto e due sole azioni. Niente
 * caroselli di presentazione — chi ha scaricato l'app sa già cosa cerca, e
 * ogni schermata prima dell'accesso è una possibilità di abbandono.
 */
export default function SchermataBenvenuto() {
  const tema = useTema();
  const t = useT();

  return (
    <Screen style={{ backgroundColor: tema.colori.primarioTenue }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tema.spaziatura[4] }}>
        <View
          style={[
            {
              width: 112,
              height: 112,
              borderRadius: tema.raggio.full,
              backgroundColor: COLORE_MARCHIO,
              marginBottom: tema.spaziatura[2],
            },
            tema.ombra.lg,
          ]}
        />

        <Text style={{ ...tema.testo.titoloGrande, fontSize: 52, letterSpacing: -1.6 }}>
          prome
        </Text>

        <Text variante="titolo" allineamento="center" style={{ fontSize: 23 }}>
          {t('sito.motto1')}{' '}
          <Text variante="titolo" colore="primario" style={{ fontSize: 23 }}>
            {t('sito.motto2')}
          </Text>
        </Text>

        <Text variante="corpoTenue" allineamento="center" style={{ maxWidth: 280 }}>
          {t('home.sommario')}
        </Text>
      </View>

      {/* Un bottone solo: entrare e registrarsi sono lo stesso gesto, e due
          bottoni che portano alla stessa schermata chiedono di scegliere fra
          cose che non sono diverse. */}
      <View style={{ gap: tema.spaziatura[3] }}>
        <Button
          titolo={t('app.accesso.titolo')}
          dimensione="lg"
          larghezzaPiena
          onPress={() => router.push(rotte.accedi())}
        />
        <Text variante="didascalia" allineamento="center">
          {t('app.accesso.primoAccesso')}
        </Text>
      </View>
    </Screen>
  );
}
