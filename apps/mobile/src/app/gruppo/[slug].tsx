import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ALBERO_GRUPPO, FILE_CARTELLA, MIEI_GRUPPI, UTENTE } from '@prome/contenuti';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { AnteprimaAllegato } from '@/components/contenuti';
import { EmptyState } from '@/components/feedback';
import { Card, Icona, Intestazione, Screen, Text } from '@/components/ui';

/** Profondità massima consentita dal dominio. */
const LIVELLI_MASSIMI = 5;

/**
 * Un gruppo visto da dentro.
 *
 * L'albero delle cartelle sul telefono non sta in una colonna laterale: si
 * scorre in orizzontale come una fila di scorciatoie, e il contenuto della
 * cartella scelta occupa tutta la larghezza.
 */
export default function SchermataGruppo() {
  const tema = useTema();
  const t = useT();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const gruppo = MIEI_GRUPPI.find((voce) => voce.slug === slug);

  const [cartellaAttiva, setCartellaAttiva] = useState(
    ALBERO_GRUPPO.find((nodo) => nodo.attiva)?.nome ?? ALBERO_GRUPPO[0]?.nome,
  );

  if (!gruppo) {
    return (
      <>
        <Intestazione conIndietro />
        <Screen centrato>
          <EmptyState
            titolo={t('errori.nonTrovato.titolo')}
            descrizione={t('errori.nonTrovato.descrizione')}
          />
        </Screen>
      </>
    );
  }

  const livello = ALBERO_GRUPPO.find((nodo) => nodo.nome === cartellaAttiva)?.livello ?? 0;

  return (
    <>
      <Intestazione conIndietro />

      <Screen scorrevole>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: tema.raggio.lg,
              backgroundColor: tema.colori.primario,
            }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variante="titolo" numberOfLines={1}>
              {gruppo.nome}
            </Text>
            <Text variante="didascalia">
              {t('app.gruppo.sottotitolo', {
                membri: 34,
                ateneo: UTENTE.ateneo,
                visibilita: 'pubblico',
              })}
            </Text>
          </View>
        </View>

        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="etichetta">{t('app.gruppo.albero')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
            {ALBERO_GRUPPO.map((nodo) => {
              const attiva = nodo.nome === cartellaAttiva;
              return (
                <Pressable
                  key={nodo.nome}
                  accessibilityRole="button"
                  accessibilityState={{ selected: attiva }}
                  onPress={() => setCartellaAttiva(nodo.nome)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: tema.spaziatura[2],
                    borderRadius: tema.raggio.full,
                    paddingHorizontal: tema.spaziatura[3],
                    paddingVertical: tema.spaziatura[2],
                    backgroundColor: attiva
                      ? tema.colori.primarioTenue
                      : tema.colori.superficieAlt2,
                  }}
                >
                  <Icona
                    nome="cartella"
                    dimensione={14}
                    colore={attiva ? 'primario' : 'debole'}
                  />
                  <Text
                    variante="didascalia"
                    style={{
                      fontWeight: attiva ? '800' : '600',
                      color: attiva ? tema.colori.primarioTesto : tema.colori.testoTenue,
                    }}
                  >
                    {nodo.nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variante="didascalia">
            {t('app.gruppo.profondita', { livello: Math.min(livello + 1, LIVELLI_MASSIMI) })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[3] }}>
          {FILE_CARTELLA.map((file) => (
            <Card key={file.nome} style={{ padding: 0, overflow: 'hidden', width: '47%' }}>
              <AnteprimaAllegato tipo={file.tipo} altezza={80} />
              <View style={{ padding: tema.spaziatura[3] }}>
                <Text variante="etichetta" numberOfLines={1} style={{ fontSize: 13 }}>
                  {file.nome}
                </Text>
                <Text variante="didascalia" numberOfLines={1}>
                  {file.dettaglio}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </Screen>
    </>
  );
}
