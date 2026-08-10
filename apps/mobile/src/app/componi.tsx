import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { UTENTE } from '@prome/contenuti';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Avatar, Button, Chip, Icona, Input, Screen, Text } from '@/components/ui';

/** Oltre questa soglia il post non è più pubblicabile (invariante B1). */
const MASSIMO_CARATTERI = 5000;

/**
 * Composizione di un post.
 *
 * Il limite di caratteri è visibile mentre si scrive, non scoperto al momento
 * dell'invio: cinquemila caratteri sono tanti, ma chi incolla appunti li
 * supera, e vederlo dopo aver scritto è la cosa più frustrante che ci sia.
 */
export default function SchermataComponi() {
  const tema = useTema();
  const t = useT();
  const [testo, setTesto] = useState('');
  const [argomento, setArgomento] = useState<string | null>(null);

  const troppoLungo = testo.length > MASSIMO_CARATTERI;
  const puoPubblicare = testo.trim().length > 0 && !troppoLungo;

  const argomenti = ['Analisi 2', 'Fisica 1', 'Metodo di studio'];

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          padding: tema.spaziatura[4],
          borderBottomWidth: 1,
          borderBottomColor: tema.colori.bordo,
          backgroundColor: tema.colori.superficie,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comune.chiudi')}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Icona nome="chiudi" dimensione={24} colore="testo" />
        </Pressable>
        <Text variante="sottotitolo" style={{ flex: 1 }}>
          {t('app.nuovoPost')}
        </Text>
        <Button
          titolo={t('app.feed.pubblica')}
          disabled={!puoPubblicare}
          onPress={() => router.back()}
        />
      </View>

      <Screen scorrevole>
        <View style={{ flexDirection: 'row', gap: tema.spaziatura[3] }}>
          <Avatar nome={UTENTE.nome} dimensione={40} />
          <View style={{ flex: 1 }}>
            <Text variante="etichetta">{UTENTE.nome}</Text>
            <Text variante="didascalia">{UTENTE.corso}</Text>
          </View>
        </View>

        <Input
          value={testo}
          onChangeText={setTesto}
          placeholder={t('app.feed.composer', { nome: UTENTE.nome.split(' ')[0] ?? '' })}
          righe={8}
          massimoCaratteri={MASSIMO_CARATTERI}
          errore={troppoLungo ? t('validazione.testoTroppoLungo', { max: MASSIMO_CARATTERI }) : undefined}
          autoFocus
        />

        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="etichetta">{t('app.feed.argomentiCorso')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
            {argomenti.map((nome) => (
              <Pressable
                key={nome}
                accessibilityRole="button"
                accessibilityState={{ selected: nome === argomento }}
                onPress={() => setArgomento(nome === argomento ? null : nome)}
              >
                <Chip tono={nome === argomento ? 'menta' : 'neutro'}>{nome}</Chip>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: tema.spaziatura[3] }}>
          <Button
            titolo={t('app.sala.caricaMateriale')}
            variante="contorno"
            iconaSinistra={<Icona nome="carica" dimensione={18} colore="testo" />}
          />
        </View>

        <Text variante="didascalia">{t('app.sala.conteggioFile', { numero: 0 })}</Text>
      </Screen>
    </>
  );
}
