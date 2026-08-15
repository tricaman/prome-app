import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { BACHECA, UTENTE } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { PostCard } from '@/components/contenuti';
import { Avatar, Button, Card, Icona, Intestazione, Screen, Text } from '@/components/ui';

/** Il proprio profilo: identità, numeri e contenuti pubblicati. */
export default function SchedaProfilo() {
  const tema = useTema();
  const t = useT();

  const statistiche = [
    { valore: '86', etichetta: t('pagine.profilo.statistiche.post') },
    { valore: '23', etichetta: t('pagine.profilo.statistiche.aule') },
    { valore: '41', etichetta: t('pagine.profilo.statistiche.materiali') },
  ];

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
        <Card style={{ alignItems: 'center', gap: tema.spaziatura[2] }}>
          <Avatar nome={UTENTE.nome} dimensione={84} />
          <Text variante="titolo">{UTENTE.nome}</Text>
          <Text variante="didascalia" allineamento="center">
            {UTENTE.ateneo} · {UTENTE.corso}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: tema.spaziatura[6],
              marginTop: tema.spaziatura[2],
            }}
          >
            {statistiche.map((voce) => (
              <View key={voce.etichetta} style={{ alignItems: 'center' }}>
                <Text variante="sottotitolo">{voce.valore}</Text>
                <Text variante="didascalia" style={{ fontSize: 11 }}>
                  {voce.etichetta}
                </Text>
              </View>
            ))}
          </View>

          <Button
            titolo={t('app.impostazioni.titolo')}
            variante="contorno"
            larghezzaPiena
            style={{ marginTop: tema.spaziatura[2] }}
            onPress={() => router.push(rotte.impostazioni())}
          />
        </Card>

        {BACHECA.filter((post) => post.autore === UTENTE.nome).length === 0 ? (
          <PostCard post={BACHECA[0]!} />
        ) : null}
      </Screen>
    </>
  );
}
