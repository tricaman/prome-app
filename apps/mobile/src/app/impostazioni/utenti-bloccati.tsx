import {
  getElencaBlocchiQueryKey,
  getElencaPostQueryKey,
  sbloccaUtente,
  useElencaBlocchi,
  type BloccatoDto,
} from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import {
  Avatar,
  Button,
  Card,
  Elenco,
  Intestazione,
  RigaElenco,
  Screen,
  Text,
} from '@/components/ui';

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
            <Elenco>
              {risposta.data.map((bloccato) => (
                <RigaBloccato key={bloccato.utenteId} bloccato={bloccato} />
              ))}
            </Elenco>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}

function RigaBloccato({ bloccato }: { bloccato: BloccatoDto }) {
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
    <RigaElenco
      guida={<Avatar nome={nome} dimensione={34} />}
      etichetta={nome}
      sottotitolo={t('app.impostazioni.bloccati.dal', {
        data: new Date(bloccato.bloccatoIl).toLocaleDateString(),
      })}
      coda={
        <Button
          titolo={t('app.impostazioni.bloccati.sblocca')}
          variante="contorno"
          inCaricamento={sblocca.isPending}
          onPress={() => sblocca.mutate(undefined)}
        />
      }
    />
  );
}
