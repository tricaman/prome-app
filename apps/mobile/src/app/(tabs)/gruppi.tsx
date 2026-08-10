import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { MIEI_GRUPPI } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Card, Icona, Intestazione, Screen, Text } from '@/components/ui';

/** I gruppi di cui si è membri: il proprio corso, i progetti, l'Erasmus. */
export default function SchedaGruppi() {
  const tema = useTema();
  const t = useT();

  return (
    <>
      <Intestazione titolo={t('app.nav.gruppi')} />
      <Screen scorrevole>
        {MIEI_GRUPPI.map((gruppo) => (
          <Pressable
            key={gruppo.slug}
            accessibilityRole="button"
            onPress={() => router.push(rotte.gruppo(gruppo.slug))}
          >
            <Card
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tema.spaziatura[3],
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: tema.raggio.lg,
                  backgroundColor: tema.colori.primario,
                }}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variante="etichetta" numberOfLines={1}>
                  {gruppo.nome}
                </Text>
                <Text variante="didascalia">34 {t('app.nav.gruppi').toLowerCase()}</Text>
              </View>
              <Icona nome="avanti" colore="debole" />
            </Card>
          </Pressable>
        ))}
      </Screen>
    </>
  );
}
