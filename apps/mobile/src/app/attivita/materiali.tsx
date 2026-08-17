import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  dimenticaMateriale,
  getElencaMaterialiSalvatiQueryKey,
  useElencaMaterialiSalvati,
  type MaterialeSalvatoDto,
} from '@prome/api-client';
import { pesoLeggibile } from '@prome/app-core';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { TarghettaAllegato } from '@/components/contenuti';
import { Card, Icona, Intestazione, Screen, Text } from '@/components/ui';

/**
 * I materiali messi da parte, da tutte le aule.
 *
 * **Ogni riga porta l'aula da cui viene**, e non è decorazione: «Esercizi
 * 3.pdf» dice qualcosa solo insieme ad «Analisi 1», e da lì si torna nell'aula
 * — che è quasi sempre la ragione per cui si era messo da parte.
 *
 * Quello che non c'è: i materiali delle aule che si sono lasciate. Il
 * salvataggio resta scritto e ricompare rientrando, ma la visibilità si
 * risolve **adesso**, come dappertutto.
 */
export default function SchermataMaterialiSalvati() {
  const t = useT();
  const salvati = useElencaMaterialiSalvati({ limit: 50 });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.materialiSalvati.titolo')} />

      <Screen scorrevole conAreaSicura={false}>
        <QueryBoundary
          query={salvati}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={<Text variante="corpoTenue">{t('app.materialiSalvati.vuoto')}</Text>}
        >
          {(risposta) => (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {risposta.data.map((riga, indice) => (
                <RigaSalvata
                  key={riga.materiale.id}
                  riga={riga}
                  ultima={indice === risposta.data.length - 1}
                />
              ))}
            </Card>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}

function RigaSalvata({ riga, ultima }: { riga: MaterialeSalvatoDto; ultima: boolean }) {
  const tema = useTema();
  const t = useT();

  const dimentica = useApiMutation({
    mutationFn: () => dimenticaMateriale(riga.materiale.id),
    invalida: [getElencaMaterialiSalvatiQueryKey() as never],
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        padding: tema.spaziatura[4],
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: tema.colori.superficieAlt2,
      }}
    >
      <TarghettaAllegato tipo={tipoDiTarghetta(riga.materiale.tipo)} />

      {/* Il file si apre fuori dall'app: il sistema regge PDF, immagini e
          testo con i gesti che ciascun formato si aspetta, e meglio. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={riga.materiale.nome}
        style={{ flex: 1, minWidth: 0 }}
        onPress={() => void Linking.openURL(riga.materiale.url)}
      >
        <Text variante="etichetta" numberOfLines={1}>
          {riga.materiale.nome}
        </Text>
        <Text variante="didascalia" numberOfLines={1}>
          {`${pesoLeggibile(riga.materiale.dimensione)} · ${t('app.materialiSalvati.da', {
            aula: riga.titoloAula,
          })}`}
        </Text>
      </Pressable>

      {/* Si torna nell'aula: è quasi sempre la ragione per cui lo si era
          messo da parte. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={riga.titoloAula}
        hitSlop={8}
        onPress={() => router.push(rotte.aula(riga.aulaStudioId))}
      >
        <Icona nome="aule" dimensione={18} colore="debole" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.materialiSalvati.salvato')}
        hitSlop={8}
        disabled={dimentica.isPending}
        onPress={() => dimentica.mutate(undefined)}
      >
        <Icona nome="salva" dimensione={18} colore="accento" />
      </Pressable>
    </View>
  );
}

const tipoDiTarghetta = (tipo: MaterialeSalvatoDto['materiale']['tipo']) =>
  tipo === 'PDF' ? 'pdf' : tipo === 'IMMAGINE' ? 'immagine' : 'testo';
