import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getElencaPostQueryKey } from '@prome/api-client';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UTENTE } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { FeedBacheca } from '@/components/contenuti';
import { AzioneTonda, Avatar, Icona, Text } from '@/components/ui';

/**
 * Bacheca.
 *
 * Il pulsante per scrivere è fluttuante e sempre raggiungibile con il pollice:
 * su un telefono l'azione principale non può stare in cima allo scorrimento.
 *
 * Il trascinamento per aggiornare è il gesto che tutti provano per primo su un
 * elenco di contenuti; qui c'è, e non serve un pulsante che faccia lo stesso.
 */
export default function SchedaBacheca() {
  const tema = useTema();
  const t = useT();
  const bordi = useSafeAreaInsets();
  const [inAggiornamento, setInAggiornamento] = useState(false);
  const [filtro, setFiltro] = useState(0);

  const filtri = [
    t('app.feed.filtri.perTe'),
    t('app.feed.filtri.mioCorso'),
    t('app.feed.filtri.mioAteneo'),
    t('app.feed.filtri.mieiGruppi'),
  ];

  /**
   * Il trascinamento rilegge davvero la bacheca.
   *
   * L'indicatore resta acceso finché la richiesta non è finita: spegnerlo
   * prima direbbe che i dati sono nuovi mentre stanno ancora arrivando.
   */
  const clienteQuery = useQueryClient();
  const aggiorna = async () => {
    setInAggiornamento(true);
    await clienteQuery.invalidateQueries({ queryKey: getElencaPostQueryKey() });
    setInAggiornamento(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tema.colori.sfondo }}>
      <View
        style={{
          paddingTop: bordi.top + tema.spaziatura[2],
          paddingHorizontal: tema.spaziatura[5],
          paddingBottom: tema.spaziatura[3],
          gap: tema.spaziatura[3],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
          <View style={{ flex: 1 }}>
            <Text variante="didascalia">Ciao {UTENTE.nome.split(' ')[0]} 👋</Text>
            <Text variante="titolo">{t('app.nav.bacheca')}</Text>
          </View>
          <AzioneTonda icona="campana" etichetta={t('app.notifiche')} conPallino />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('app.nav.profilo')}
            onPress={() => router.push(rotte.mioProfilo())}
          >
            <Avatar nome={UTENTE.nome} dimensione={42} soloColore />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: tema.spaziatura[2] }}
        >
          {filtri.map((etichetta, indice) => (
            <Pressable
              key={etichetta}
              accessibilityRole="button"
              accessibilityState={{ selected: indice === filtro }}
              onPress={() => setFiltro(indice)}
              style={{
                borderRadius: tema.raggio.full,
                borderWidth: 1.5,
                borderColor: indice === filtro ? tema.colori.primario : tema.colori.bordoForte,
                backgroundColor: indice === filtro ? tema.colori.primario : tema.colori.superficie,
                paddingHorizontal: tema.spaziatura[4],
                paddingVertical: tema.spaziatura[2],
              }}
            >
              <Text
                variante="didascalia"
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color:
                    indice === filtro ? tema.colori.primarioTesto : tema.colori.testoTenue,
                }}
              >
                {etichetta}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: tema.spaziatura[4],
          paddingBottom: tema.spaziatura[20],
          gap: tema.spaziatura[3],
        }}
        refreshControl={
          <RefreshControl
            refreshing={inAggiornamento}
            onRefresh={() => void aggiorna()}
            tintColor={tema.colori.primario}
          />
        }
      >
        <FeedBacheca />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.nuovoPost')}
        onPress={() => router.push(rotte.componi())}
        style={[
          {
            position: 'absolute',
            right: tema.spaziatura[5],
            bottom: tema.spaziatura[6],
            flexDirection: 'row',
            alignItems: 'center',
            gap: tema.spaziatura[2],
            height: 56,
            paddingHorizontal: tema.spaziatura[5],
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.primario,
          },
          tema.ombra.lg,
        ]}
      >
        <Icona nome="piu" dimensione={22} colore="primarioTesto" />
        <Text variante="etichetta" style={{ color: tema.colori.primarioTesto }}>
          {t('app.feed.pubblica')}
        </Text>
      </Pressable>
    </View>
  );
}
