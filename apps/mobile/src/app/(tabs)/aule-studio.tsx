import { View } from 'react-native';
import { AULE_IN_CORSO, AULE_PROGRAMMATE } from '@prome/contenuti';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { AulaCard, AulaProgrammataRiga } from '@/components/contenuti';
import { Card, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Aule studio.
 *
 * Prima quelle aperte adesso, poi le programmate: un'aula in corso è
 * un'azione possibile subito, una programmata è un promemoria. Mescolarle
 * costringerebbe a leggere lo stato di ognuna per capire cosa si può fare.
 */
export default function SchedaAuleStudio() {
  const tema = useTema();
  const t = useT();

  return (
    <>
      <Intestazione titolo={t('app.aule.titolo')} />
      <Screen scorrevole>
        <Etichetta testo={t('app.aule.inCorso', { numero: AULE_IN_CORSO.length })} />
        <View style={{ gap: tema.spaziatura[3] }}>
          {AULE_IN_CORSO.map((aula) => (
            <AulaCard key={aula.id} aula={aula} />
          ))}
        </View>

        <Etichetta testo={t('app.aule.programmate')} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {AULE_PROGRAMMATE.map((aula, indice) => (
            <AulaProgrammataRiga
              key={aula.id}
              aula={aula}
              ultima={indice === AULE_PROGRAMMATE.length - 1}
            />
          ))}
        </Card>
      </Screen>
    </>
  );
}

function Etichetta({ testo }: { testo: string }) {
  const tema = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
      <Text
        variante="didascalia"
        style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}
      >
        {testo}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: tema.colori.bordo }} />
    </View>
  );
}
