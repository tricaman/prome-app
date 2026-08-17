import { View } from 'react-native';
import { router } from 'expo-router';
import { useElencaAuleStudio, type AulaStudioDto } from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { AulaCard, AulaProgrammataRiga } from '@/components/contenuti';
import { SchermataTab } from '@/components/app/schermata-tab';
import { Card, PulsanteFluttuante, Text } from '@/components/ui';

/**
 * Aule studio.
 *
 * Prima quelle aperte adesso, poi le programmate: un'aula in corso è
 * un'azione possibile subito, una programmata è un promemoria.
 *
 * La distinzione **non viene dal server**, che non ha stati di ciclo di vita
 * sull'aula: la deriva il client dalla sola presenza di una data futura. Un'aula
 * la cui data è passata torna fra quelle sempre aperte, perché la data non apre
 * né chiude nulla.
 */
export default function SchedaAuleStudio() {
  const tema = useTema();
  const t = useT();
  const aule = useElencaAuleStudio({ limit: 50 });

  return (
    <SchermataTab
      titolo={t('app.aule.titolo')}
      query={aule}
      eVuoto={(risposta) => risposta.data.length === 0}
      vuoto={<Text variante="corpoTenue">{t('app.aule.nessuna')}</Text>}
      // Come in bacheca: l'azione principale sta sotto il pollice, non in cima
      // allo scorrimento. Da qui si apre un'aula anche avendo soltanto il
      // telefono — prima non si poteva affatto.
      azione={
        <PulsanteFluttuante
          etichetta={t('app.aule.crea')}
          onPress={() => router.push(rotte.creaAula())}
        />
      }
    >
      {(risposta) => {
        const programmate = risposta.data.filter(eProgrammata);
        const aperte = risposta.data.filter((aula) => !eProgrammata(aula));

        return (
          <>
            <Etichetta testo={t('app.aule.inCorso', { numero: aperte.length })} />
            <View style={{ gap: tema.spaziatura[3] }}>
              {aperte.map((aula) => (
                <AulaCard key={aula.id} aula={aula} />
              ))}
            </View>

            {programmate.length ? (
              <>
                <Etichetta testo={t('app.aule.programmate')} />
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {programmate.map((aula, indice) => (
                    <AulaProgrammataRiga
                      key={aula.id}
                      aula={aula}
                      ultima={indice === programmate.length - 1}
                    />
                  ))}
                </Card>
              </>
            ) : null}
          </>
        );
      }}
    </SchermataTab>
  );
}

/** Programmata = ha una data, e quella data non è ancora passata. */
function eProgrammata(aula: AulaStudioDto): boolean {
  return Boolean(aula.dataOraInizio) && new Date(aula.dataOraInizio!).getTime() > Date.now();
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
