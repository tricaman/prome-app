import { Pressable, View } from 'react-native';
import { useTema } from '@/theme';
import { Card, Input, Text } from '@/components/ui';

/** Una voce del catalogo accademico da mostrare in elenco. */
export interface VoceDelCatalogo {
  id: string;
  titolo: string;
  /** Riga secondaria: la città dell'ateneo, la classe e la durata del corso. */
  dettaglio: string;
}

/**
 * Campo di ricerca più elenco a scelta singola sul catalogo accademico.
 *
 * È una **scelta, non una scrittura**: il catalogo è chiuso, quindi ciò che si
 * digita serve a cercare e il valore vero è la voce selezionata. Lo usano tre
 * schermate — i due passi dell'onboarding e la correzione del profilo — e per
 * questo sta qui: tre copie divergerebbero, e quella dimenticata sarebbe
 * l'ultima.
 */
export function ElencoCatalogo({
  etichetta,
  segnaposto,
  vuoto,
  voci,
  sceltaId,
  ricerca,
  onRicerca,
  onScelta,
  autoFocus,
}: {
  etichetta?: string;
  segnaposto: string;
  vuoto: string;
  voci: VoceDelCatalogo[];
  sceltaId: string | null;
  ricerca: string;
  onRicerca: (termine: string) => void;
  onScelta: (voce: VoceDelCatalogo) => void;
  autoFocus?: boolean;
}) {
  const tema = useTema();

  return (
    <>
      <Input
        etichetta={etichetta}
        value={ricerca}
        onChangeText={onRicerca}
        placeholder={segnaposto}
        autoFocus={autoFocus}
      />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {voci.length === 0 ? (
          <View style={{ padding: tema.spaziatura[4] }}>
            <Text variante="corpoTenue">{vuoto}</Text>
          </View>
        ) : (
          voci.map((voce, indice) => {
            const scelto = voce.id === sceltaId;
            return (
              <Pressable
                key={voce.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: scelto }}
                onPress={() => onScelta(voce)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tema.spaziatura[3],
                  padding: tema.spaziatura[4],
                  backgroundColor: scelto ? tema.colori.primarioTenue : 'transparent',
                  borderBottomWidth: indice < voci.length - 1 ? 1 : 0,
                  borderBottomColor: tema.colori.superficieAlt2,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: tema.raggio.md,
                    backgroundColor: tema.colori.primarioTenue,
                  }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variante="etichetta" numberOfLines={1}>
                    {voce.titolo}
                  </Text>
                  <Text variante="didascalia">{voce.dettaglio}</Text>
                </View>
                {scelto ? (
                  <Text colore="primario" style={{ fontWeight: '800' }}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </Card>
    </>
  );
}
