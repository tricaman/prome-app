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
 *
 * **Due gesti, due destinazioni.** Toccare il post porta al dettaglio; toccare
 * i commenti apre il foglio dei commenti senza lasciare la bacheca. Prima
 * portavano entrambi nello stesso posto, e il pulsante dei commenti era un
 * secondo modo di fare la stessa cosa — con accanto nessun numero, quindi
 * senza modo di sapere se sotto c'era una conversazione.
 */
export function PostCard({
  post,
  onCommenti,
}: {
  post: PostDiBacheca;
  /** Apre i commenti sul posto. Senza, il pulsante porta al dettaglio. */
  onCommenti?: () => void;
}) {
  const tema = useTema();
  const t = useT();

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.post.titolo', { autore: post.autore })}
        onPress={() => router.push(rotte.post(post.id))}
        style={{ gap: tema.spaziatura[3] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
          <Avatar nome={post.autore} foto={post.foto} dimensione={42} />
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
      </Pressable>


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
          // Il numero al posto della parola quando c'è qualcosa da leggere:
          // «Commenta» è un invito, «3 commenti» è un'informazione, e la
          // seconda vale più della prima appena esiste.
          etichetta={
            post.commenti === 0
              ? t('app.feed.commenta')
              : post.commenti === 1
                ? t('app.post.unCommento')
                : t('app.post.commenti', { numero: post.commenti })
          }
          onPress={onCommenti ?? (() => router.push(rotte.post(post.id)))}
        />
      </View>
    </Card>
  );
}

function AzionePost({
  icona,
  etichetta,
  onPress,
}: {
  icona: 'commento';
  etichetta: string;
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
      <Text variante="didascalia" style={{ fontWeight: tema.tipografia.peso.extra, fontSize: 12.5 }}>
        {etichetta}
      </Text>
    </Pressable>
  );
}
