import { View } from 'react-native';
import {
  getElencaBlocchiQueryKey,
  getElencaPostQueryKey,
  sbloccaUtente,
  useElencaBlocchi,
  type BloccatoDto,
} from '@prome/api-client';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Card, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Le persone bloccate, e la strada per tornare indietro.
 *
 * Lo sblocco è senza conferma: è un gesto reversibile, e una conferma su un
 * gesto reversibile insegna solo a premere due volte senza leggere (la regola
 * di casa, scritta nelle impostazioni). La conferma sta dove si blocca.
 */
export default function SchermataUtentiBloccati() {
  const t = useT();
  const bloccati = useElencaBlocchi({ limit: 100 });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.bloccati.titolo')} />
      <Screen scorrevole>
        <Card>
          <Text variante="corpoTenue">{t('app.impostazioni.bloccati.testo')}</Text>
        </Card>

        <QueryBoundary
          query={bloccati}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={
            <Card>
              <Text variante="corpoTenue">{t('app.impostazioni.bloccati.vuoto')}</Text>
            </Card>
          }
        >
          {(risposta) => (
            <Card style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
              {risposta.data.map((bloccato, indice) => (
                <RigaBloccato
                  key={bloccato.utenteId}
                  bloccato={bloccato}
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

function RigaBloccato({ bloccato, ultima }: { bloccato: BloccatoDto; ultima: boolean }) {
  const tema = useTema();
  const t = useT();
  const nome =
    [bloccato.nome, bloccato.cognome].filter(Boolean).join(' ') || t('comune.utenteRimosso');

  const sblocca = useApiMutation({
    mutationFn: () => sbloccaUtente(bloccato.utenteId),
    // Sbloccato, i suoi contenuti tornano alla lettura successiva: si
    // invalida anche il feed, non solo questa lista.
    invalida: [getElencaBlocchiQueryKey() as never, getElencaPostQueryKey() as never],
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
      <Avatar nome={nome} dimensione={34} />
      <View style={{ flex: 1 }}>
        <Text variante="etichetta" numberOfLines={1}>
          {nome}
        </Text>
        <Text variante="didascalia">
          {t('app.impostazioni.bloccati.dal', {
            data: new Date(bloccato.bloccatoIl).toLocaleDateString(),
          })}
        </Text>
      </View>
      <Button
        titolo={t('app.impostazioni.bloccati.sblocca')}
        variante="contorno"
        inCaricamento={sblocca.isPending}
        onPress={() => sblocca.mutate(undefined)}
      />
    </View>
  );
}
