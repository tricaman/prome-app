import { View } from 'react-native';
import { useElencaAuleStudio } from '@prome/api-client';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { AulaCard } from '@/components/contenuti';
import { Intestazione, Screen, Text } from '@/components/ui';

/**
 * Le mie aule studio.
 *
 * **Nessun endpoint nuovo e nessun filtro nuovo**: `GET /aule-studio` risponde
 * già «le aule di cui faccio parte» — è la stessa lettura della scheda Aule
 * studio, che di suo mostra la stessa cosa divisa fra aperte e programmate.
 *
 * Dice «le tue aule», non «le aule che hai creato», perché è ciò che il server
 * sa rispondere: chi ha aperto un'aula non è scritto da nessuna parte, e
 * l'unico indizio — essere moderatore — vale anche per chi è stato promosso
 * dopo. Un titolo che promette la paternità su un elenco che non la conosce è
 * la stessa classe di bugia dei tre contatori inventati.
 */
export default function SchermataMieAule() {
  const tema = useTema();
  const t = useT();
  const aule = useElencaAuleStudio({ limit: 50 });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.profilo.tueAule')} />

      <Screen scorrevole conAreaSicura={false}>
        <QueryBoundary
          query={aule}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={<Text variante="corpoTenue">{t('app.profilo.nessunaAula')}</Text>}
        >
          {(risposta) => (
            <View style={{ gap: tema.spaziatura[3] }}>
              {risposta.data.map((aula) => (
                <AulaCard key={aula.id} aula={aula} />
              ))}
            </View>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}
