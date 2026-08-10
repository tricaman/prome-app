import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BACHECA, UTENTE } from '@prome/contenuti';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { TarghettaAllegato } from '@/components/contenuti';
import { EmptyState } from '@/components/feedback';
import { Avatar, Button, Card, Chip, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';

interface Commento {
  id: string;
  autore: string;
  quando: string;
  testo: string;
}

const COMMENTI: readonly Commento[] = [
  {
    id: '1',
    autore: 'Luca Bianchi',
    quando: '12 min',
    testo: 'Sei un mito, mi salvi la sessione. Il tema del 2022 aveva anche gli integrali doppi?',
  },
  {
    id: '2',
    autore: 'Sara Conti',
    quando: '40 min',
    testo: 'A pagina 12 credo ci sia un segno sbagliato nel limite, controllo e ti dico.',
  },
  {
    id: '3',
    autore: 'Marco Villa',
    quando: '1 h',
    testo: 'Grazie! Li portiamo giovedì nell’aula studio di ripasso.',
  },
];

/**
 * Dettaglio di un post.
 *
 * I commenti sono piatti come nel dominio: nessuna risposta annidata. Il
 * campo per scrivere resta in fondo, dove il pollice lo raggiunge.
 */
export default function SchermataPost() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = BACHECA.find((voce) => voce.id === id);

  const [commenti, setCommenti] = useState<readonly Commento[]>(COMMENTI);
  const [bozza, setBozza] = useState('');

  if (!post) {
    return (
      <>
        <Intestazione conIndietro />
        <Screen centrato>
          <EmptyState titolo={t('errori.nonTrovato.titolo')} descrizione={t('errori.nonTrovato.descrizione')} />
        </Screen>
      </>
    );
  }

  const invia = () => {
    const testo = bozza.trim();
    if (!testo) return;
    setCommenti((precedenti) => [
      { id: `nuovo-${precedenti.length}`, autore: UTENTE.nome, quando: 'ora', testo },
      ...precedenti,
    ]);
    setBozza('');
  };

  return (
    <>
      <Intestazione conIndietro />

      <Screen scorrevole>
        <Card style={{ gap: tema.spaziatura[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
            <Avatar nome={post.autore} dimensione={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variante="etichetta">{post.autore}</Text>
              <Text variante="didascalia">{post.contesto}</Text>
            </View>
          </View>

          <Text variante="corpo">{post.corpo}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
            {post.tag.map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </View>

          {post.allegato ? (
            <View
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
              <TarghettaAllegato tipo="pdf" larghezza={44} altezza={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variante="etichetta" numberOfLines={1}>
                  {post.allegato.nome}
                </Text>
                <Text variante="didascalia">{post.allegato.dettaglio}</Text>
              </View>
              <Button titolo={t('app.post.scarica')} />
            </View>
          ) : null}
        </Card>

        <Text variante="sottotitolo">{t('app.post.commenti', { numero: commenti.length })}</Text>

        <View style={{ gap: tema.spaziatura[4] }}>
          {commenti.map((commento) => (
            <View key={commento.id} style={{ flexDirection: 'row', gap: tema.spaziatura[3] }}>
              <Avatar nome={commento.autore} dimensione={38} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
                  <Text variante="etichetta">{commento.autore}</Text>
                  <Text variante="didascalia">{commento.quando}</Text>
                </View>
                <Text variante="corpo" style={{ fontSize: 14.5, marginTop: 4 }}>
                  {commento.testo}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Screen>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          padding: tema.spaziatura[4],
          borderTopWidth: 1,
          borderTopColor: tema.colori.bordo,
          backgroundColor: tema.colori.superficie,
        }}
      >
        <View style={{ flex: 1 }}>
          <Input
            value={bozza}
            onChangeText={setBozza}
            placeholder={t('app.post.scriviCommento')}
            onSubmitEditing={invia}
          />
        </View>
        <Button
          titolo={t('app.post.invia')}
          disabled={!bozza.trim()}
          onPress={invia}
          iconaSinistra={<Icona nome="condividi" dimensione={16} colore="primarioTesto" />}
        />
      </View>
    </>
  );
}
