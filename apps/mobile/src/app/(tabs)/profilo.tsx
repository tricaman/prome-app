import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useLeggiMioProfilo } from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Card, Icona, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Il proprio profilo.
 *
 * Magro e vero, invece che ricco e falso: fino a oggi mostrava un'identità
 * inventata («Marta Rossi»), tre contatori costanti nel file — 86 post, 23
 * aule, 41 materiali — e, come «i tuoi contenuti», **il post di un'altra
 * persona**, per via di un filtro che non poteva mai trovare niente.
 *
 * I contatori veri richiederebbero un conteggio per autore che il server non
 * espone: un endpoint nuovo per una decorazione. Quando serviranno davvero,
 * arriveranno con i propri post.
 */
export default function SchedaProfilo() {
  const tema = useTema();
  const t = useT();
  const profilo = useLeggiMioProfilo();

  return (
    <>
      <Intestazione
        titolo={t('app.nav.profilo')}
        azioni={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('app.impostazioni.titolo')}
            onPress={() => router.push(rotte.impostazioni())}
            hitSlop={10}
          >
            <Icona nome="impostazioni" dimensione={24} colore="testo" />
          </Pressable>
        }
      />

      <Screen scorrevole>
        <QueryBoundary query={profilo}>
          {({ data }) => {
            const nome = [data.nome, data.cognome].filter(Boolean).join(' ');
            const studi = [data.corso, data.universita].filter(Boolean).join(' · ');

            return (
              <Card style={{ alignItems: 'center', gap: tema.spaziatura[2] }}>
                <Avatar nome={nome || '?'} dimensione={84} />
                <Text variante="titolo">{nome || t('app.impostazioni.senzaNome')}</Text>
                {studi ? (
                  <Text variante="didascalia" allineamento="center">
                    {studi}
                  </Text>
                ) : null}

                <View style={{ width: '100%', marginTop: tema.spaziatura[2] }}>
                  <Button
                    titolo={t('app.impostazioni.titolo')}
                    variante="contorno"
                    larghezzaPiena
                    onPress={() => router.push(rotte.impostazioni())}
                  />
                </View>
              </Card>
            );
          }}
        </QueryBoundary>
      </Screen>
    </>
  );
}
