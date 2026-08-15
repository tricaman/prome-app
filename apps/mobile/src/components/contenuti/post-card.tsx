import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { PostDiBacheca } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Avatar, Card, Icona, Text } from '@/components/ui';
import { TarghettaAllegato } from './allegato';

/**
 * Post nella bacheca.
 *
 * L'unica azione è commentare: non c'è un "mi
 * piace", perché il motto del prodotto è tradotto in una regola precisa —
 * niente classifiche, niente approvazione sociale, solo ciò che serve a
 * ritrovare un contenuto o a passarlo a qualcuno.
 */
export function PostCard({ post }: { post: PostDiBacheca }) {
  const tema = useTema();
  const t = useT();

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
        <Avatar nome={post.autore} dimensione={42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variante="etichetta" numberOfLines={1}>
            {post.autore}
          </Text>
          <Text variante="didascalia" numberOfLines={1}>
            {post.contesto}
          </Text>
        </View>
      </View>

      <Text variante="corpo">{post.corpo}</Text>


      {post.allegato ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(rotte.post(post.id))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tema.spaziatura[3],
            backgroundColor: tema.colori.superficieAlt,
            borderWidth: 1,
            borderColor: tema.colori.bordo,
            borderRadius: tema.raggio.lg,
            padding: tema.spaziatura[3],
          }}
        >
          <TarghettaAllegato tipo="pdf" larghezza={38} altezza={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variante="etichetta" numberOfLines={1}>
              {post.allegato.nome}
            </Text>
            <Text variante="didascalia" numberOfLines={1}>
              {post.allegato.dettaglio}
            </Text>
          </View>
          <Icona nome="avanti" dimensione={18} colore="debole" />
        </Pressable>
      ) : null}


      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[5],
          paddingTop: tema.spaziatura[3],
          borderTopWidth: 1,
          borderTopColor: tema.colori.superficieAlt2,
        }}
      >
        <AzionePost
          icona="commento"
          etichetta={t('app.feed.commenta')}
          onPress={() => router.push(rotte.post(post.id))}
        />
      </View>
    </Card>
  );
}

function AzionePost({
  icona,
  etichetta,
  soloIcona = false,
  onPress,
}: {
  icona: 'commento';
  etichetta: string;
  soloIcona?: boolean;
  onPress?: () => void;
}) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      onPress={onPress}
      hitSlop={10}
      style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}
    >
      <Icona nome={icona} dimensione={19} />
      {!soloIcona ? (
        <Text variante="didascalia" style={{ fontWeight: tema.tipografia.peso.extra, fontSize: 12.5 }}>
          {etichetta}
        </Text>
      ) : null}
    </Pressable>
  );
}
