import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useElencaMieiGruppi, type GruppoDto } from '@prome/api-client';
import { rotte } from '@/content';
import { etichettaVisibilita } from '@/lib/visibilita';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Card, Chip, Icona, Intestazione, Screen, Text } from '@/components/ui';

/**
 * I gruppi di cui si fa parte.
 *
 * Nessuna vetrina dei gruppi altrui, nemmeno dei pubblici: «pubblico» dice chi
 * può vedere un gruppo di cui ha l'indirizzo, non che esista un elenco da
 * sfogliare — la stessa scelta del web.
 *
 * Questa scheda era stata tolta perché mostrava tre gruppi inventati; torna
 * con E12.1, e adesso mostra i gruppi di chi guarda.
 */
export default function SchedaGruppi() {
  const tema = useTema();
  const t = useT();
  const gruppi = useElencaMieiGruppi({ limit: 50 });

  return (
    <View style={{ flex: 1 }}>
      <Intestazione titolo={t('app.gruppo.titolo')} />

      {/* Spazio in fondo, perché il pulsante fluttuante non copra l'ultima
          scheda dell'elenco. */}
      <Screen scorrevole style={{ paddingBottom: tema.spaziatura[20] }}>
        <Text variante="corpoTenue">{t('app.gruppo.sommario')}</Text>

        <QueryBoundary
          query={gruppi}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={<Text variante="corpoTenue">{t('app.gruppo.nessuno')}</Text>}
        >
          {(risposta) => (
            <View style={{ gap: tema.spaziatura[3] }}>
              {risposta.data.map((gruppo) => (
                <SchedaGruppo key={gruppo.id} gruppo={gruppo} />
              ))}
            </View>
          )}
        </QueryBoundary>
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.gruppo.crea')}
        onPress={() => router.push(rotte.creaGruppo())}
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
          {t('app.gruppo.crea')}
        </Text>
      </Pressable>
    </View>
  );
}

function SchedaGruppo({ gruppo }: { gruppo: GruppoDto }) {
  const tema = useTema();
  const t = useT();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={gruppo.nome}
      onPress={() => router.push(rotte.gruppo(gruppo.id))}
    >
      <Card style={{ gap: tema.spaziatura[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: tema.raggio.lg,
              backgroundColor: tema.colori.primarioTenue,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variante="sottotitolo" style={{ color: tema.colori.primarioTesto }}>
              {gruppo.nome.slice(0, 1).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variante="etichetta" numberOfLines={1}>
              {gruppo.nome}
            </Text>
            <Text variante="didascalia">
              {gruppo.membri === 1
                ? t('app.gruppo.unMembro')
                : t('app.gruppo.nMembri', { numero: gruppo.membri })}
              {gruppo.ateneo ? ` · ${gruppo.ateneo}` : ''}
            </Text>
          </View>

          <Icona nome="avanti" dimensione={17} colore="debole" />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
          <Chip>{t(`app.gruppo.visibilita.${etichettaVisibilita(gruppo.visibilita)}`)}</Chip>
          {gruppo.sonoModeratore ? <Chip tono="menta">{t('app.gruppo.moderatore')}</Chip> : null}
        </View>
      </Card>
    </Pressable>
  );
}

