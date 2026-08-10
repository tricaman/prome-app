import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { CampoCodice } from '@/components/app/campo-codice';
import { Icona, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Verifica del codice via email.
 *
 * L'email arriva dalla schermata precedente e viene ripetuta qui: è l'unico
 * modo per accorgersi di averla scritta male prima di aspettare un messaggio
 * che non arriverà.
 *
 * La verifica parte da sola appena le sei cifre sono complete: chiedere un
 * tocco in più su un codice già inserito è lavoro inutile.
 */
export default function SchermataCodice() {
  const tema = useTema();
  const t = useT();
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <>
      <Intestazione conIndietro />
      <Screen scorrevole>
        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="titoloGrande" style={{ fontSize: 30 }}>
            {t('app.accesso.codiceTitolo')}
          </Text>
          <Text variante="corpoTenue">
            {t('app.accesso.codiceSommario', { email: email ?? '' })}
          </Text>
        </View>

        <CampoCodice onCompletato={() => router.push(rotte.profilo())} />

        <View
          style={{
            flexDirection: 'row',
            gap: tema.spaziatura[3],
            backgroundColor: tema.colori.superficieAlt,
            borderRadius: tema.raggio.xl,
            padding: tema.spaziatura[4],
          }}
        >
          <Icona nome="posta" />
          <Text variante="didascalia" style={{ flex: 1 }}>
            {t('app.accesso.codiceAiuto')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variante="didascalia" colore="primario" onPress={() => router.back()}>
            {t('app.accesso.cambiaEmail')}
          </Text>
          <Text variante="didascalia" colore="primario">
            {t('app.accesso.reinvia')}
          </Text>
        </View>
      </Screen>
    </>
  );
}
