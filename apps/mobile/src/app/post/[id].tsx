import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { pesoLeggibile } from '@prome/app-core';
import {
  commentaPost,
  eliminaCommento,
  getElencaCommentiQueryKey,
  useElencaCommenti,
  useLeggiPost,
  type AllegatoDto,
  type CommentoDto,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_COMMENTO } from '@prome/contracts';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { TarghettaAllegato } from '@/components/contenuti';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Card, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Dettaglio di un post, con la sua discussione.
 *
 * Post e commenti sono due richieste, non una: i commenti sono un aggregato
 * autonomo, e chiederli insieme al post li farebbe sembrare un suo campo —
 * con la conseguenza pratica che ogni nuovo commento invaliderebbe anche il
 * post.
 */
export default function SchermataPost() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useLeggiPost(id);

  return (
    <>
      <Intestazione conIndietro />
      <Screen scorrevole>
        <QueryBoundary query={post}>
          {({ data }) => {
            const autore =
              [data.autore.nome, data.autore.cognome].filter(Boolean).join(' ') ||
              t('comune.utenteRimosso');

            return (
              <View style={{ gap: tema.spaziatura[4] }}>
                <Card>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: tema.spaziatura[3],
                    }}
                  >
                    <Avatar nome={autore} dimensione={44} />
                    <View style={{ flex: 1 }}>
                      <Text variante="etichetta">{autore}</Text>
                      <Text variante="didascalia">
                        {[data.autore.universita, new Date(data.creatoIl).toLocaleDateString()]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </View>

                  <Text variante="corpo" style={{ marginTop: tema.spaziatura[3] }}>
                    {data.testo}
                  </Text>

                  {data.allegati.map((allegato) => (
                    <RigaAllegato key={allegato.id} allegato={allegato} />
                  ))}
                </Card>

                <Commenti postId={id} />
              </View>
            );
          }}
        </QueryBoundary>
      </Screen>
    </>
  );
}

/**
 * Un allegato si apre fuori dall'app.
 *
 * Un visore incorporato dovrebbe reggere PDF, immagini e testo con i gesti di
 * zoom e scorrimento che ciascun formato si aspetta: il sistema lo fa già, e
 * meglio.
 */
function RigaAllegato({ allegato }: { allegato: AllegatoDto }) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={allegato.nome}
      onPress={() => void Linking.openURL(allegato.url)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        marginTop: tema.spaziatura[3],
        backgroundColor: tema.colori.superficieAlt,
        borderColor: tema.colori.bordo,
        borderWidth: 1,
        borderRadius: tema.raggio.lg,
        padding: tema.spaziatura[3],
      }}
    >
      <TarghettaAllegato tipo={tipoDiTarghetta(allegato.tipo)} />
      <View style={{ flex: 1 }}>
        <Text variante="etichetta" numberOfLines={1}>
          {allegato.nome}
        </Text>
        <Text variante="didascalia">{pesoLeggibile(allegato.dimensione)}</Text>
      </View>
      <Icona nome="avanti" dimensione={18} />
    </Pressable>
  );
}

const tipoDiTarghetta = (tipo: AllegatoDto['tipo']) =>
  tipo === 'PDF' ? 'pdf' : tipo === 'IMMAGINE' ? 'immagine' : 'testo';

/** La discussione: si legge dal più vecchio, perché una discussione ha un ordine. */
function Commenti({ postId }: { postId: string }) {
  const tema = useTema();
  const t = useT();
  const [testo, setTesto] = useState('');
  const commenti = useElencaCommenti(postId, { limit: 50 });
  const chiave = getElencaCommentiQueryKey(postId, { limit: 50 });

  const invia = useApiMutation({
    mutationFn: () => commentaPost(postId, { testo }),
    invalida: [chiave as never],
    onSuccess: () => setTesto(''),
  });

  return (
    <Card>
      <Text variante="sottotitolo">{t('app.post.titoloCommenti')}</Text>

      <View style={{ gap: tema.spaziatura[3], marginTop: tema.spaziatura[3] }}>
        <QueryBoundary
          query={commenti}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={<Text variante="corpoTenue">{t('app.post.nessunCommento')}</Text>}
        >
          {(risposta) =>
            risposta.data.map((commento) => (
              <RigaCommento key={commento.id} commento={commento} chiaveElenco={chiave} />
            ))
          }
        </QueryBoundary>

        <Input
          value={testo}
          onChangeText={setTesto}
          placeholder={t('app.post.scriviCommento')}
          righe={3}
          massimoCaratteri={LUNGHEZZA_MASSIMA_COMMENTO}
        />
        <Button
          titolo={t('app.post.invia')}
          disabled={!testo.trim()}
          inCaricamento={invia.isPending}
          onPress={() => invia.mutate(undefined)}
        />
      </View>
    </Card>
  );
}

function RigaCommento({
  commento,
  chiaveElenco,
}: {
  commento: CommentoDto;
  chiaveElenco: readonly unknown[];
}) {
  const tema = useTema();
  const t = useT();
  const autore =
    [commento.autore.nome, commento.autore.cognome].filter(Boolean).join(' ') ||
    t('comune.utenteRimosso');

  const elimina = useApiMutation({
    mutationFn: () => eliminaCommento(commento.id),
    invalida: [chiaveElenco as never],
  });

  return (
    <View style={{ flexDirection: 'row', gap: tema.spaziatura[3] }}>
      <Avatar nome={autore} dimensione={34} />
      <View
        style={{
          flex: 1,
          backgroundColor: tema.colori.superficieAlt,
          borderRadius: tema.raggio.lg,
          padding: tema.spaziatura[3],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
          <Text variante="etichetta" style={{ flex: 1 }}>
            {autore}
          </Text>
          {/* Il permesso arriva dal server: ricalcolarlo qui vorrebbe dire
              tenere due copie della stessa regola, e questa sarebbe aggirabile. */}
          {commento.puoEliminare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('app.post.eliminaCommento')}
              onPress={() => elimina.mutate(undefined)}
              hitSlop={8}
            >
              <Icona nome="chiudi" dimensione={16} />
            </Pressable>
          ) : null}
        </View>
        <Text variante="corpo" style={{ marginTop: 4 }}>
          {commento.testo}
        </Text>
      </View>
    </View>
  );
}
