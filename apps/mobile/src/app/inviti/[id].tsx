import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { statusErrore } from '@prome/app-core';
import {
  accettaInvito,
  getElencaAuleStudioQueryKey,
  getLeggiInvitoQueryKey,
  rifiutaInvito,
  useLeggiInvito,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { ErrorState, QueryBoundary, RisorsaNonTrovata } from '@/components/feedback';
import { Button, Card, Intestazione, Screen, Text } from '@/components/ui';

/**
 * L'invito a un'aula studio, **dentro l'app**.
 *
 * Fino a oggi il tocco sulla notifica apriva il browser sulla stessa pagina
 * dell'email: dietro c'è un solo invito e un solo endpoint, quindi mandare
 * fuori dall'app chi è già dentro l'app significava fargli rifare l'accesso
 * sul web per un gesto che qui costa un tocco.
 *
 * **Le risposte sono due**, e stanno una accanto all'altra. Accettare risponde
 * 202 — il partecipante non nasce nella stessa transazione (IA3) — e nella
 * sala si entra solo quando il server conferma che c'è: la finestra si
 * dichiara («ti stiamo facendo entrare») invece di nasconderla dietro
 * un'attesa muta. Rifiutare risponde 200 e chiude l'invito: non c'è niente da
 * aspettare, e chi ha invitato non riceve alcun avviso.
 */
export default function SchermataInvitoAula() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();

  const invito = useLeggiInvito(id, {
    query: {
      // Finché il partecipante non c'è, la risposta va richiesta: è la stessa
      // finestra dichiarata dal dominio, e qui la si aspetta guardandola.
      refetchInterval: (query) =>
        query.state.data?.data.stato === 'ACCETTATO' && !query.state.data.data.partecipanteCreato
          ? 1000
          : false,
    },
  });

  const accetta = useApiMutation({
    mutationFn: () => accettaInvito(id),
    invalida: [getLeggiInvitoQueryKey(id) as never, getElencaAuleStudioQueryKey() as never],
  });

  // Il rifiuto non tocca l'elenco delle aule: non ne fa entrare né uscire da
  // nessuna. Si rilegge il solo invito, che è l'unica cosa cambiata.
  const rifiuta = useApiMutation({
    mutationFn: () => rifiutaInvito(id),
    invalida: [getLeggiInvitoQueryKey(id) as never],
  });

  // Quando il partecipante c'è davvero si entra nella sala, e con `replace`:
  // il tasto indietro deve riportare da dove si è arrivati, non a un invito
  // ormai speso. In un effetto e non durante il disegno, che è dove navigare
  // sarebbe un effetto collaterale.
  const aulaId = invito.data?.data.aulaStudioId;
  const partecipanteCreato = invito.data?.data.partecipanteCreato ?? false;
  useEffect(() => {
    if (partecipanteCreato && aulaId) router.replace(rotte.aula(aulaId));
  }, [partecipanteCreato, aulaId]);

  return (
    <>
      <Intestazione
        conIndietro
        titolo={t('app.notifiche.tipo.INVITO_AULA.titolo')}
        // Questa schermata può essere il punto di ingresso dell'app (si arriva
        // da un collegamento), e lì non c'è niente a cui tornare: il cerchio
        // indietro sarebbe un bottone che non fa nulla.
        onIndietro={() => (router.canGoBack() ? router.back() : router.replace(rotte.notifiche()))}
      />

      <Screen scorrevole conAreaSicura={false}>
        <QueryBoundary
          query={invito}
          errore={(errore, riprova) =>
            statusErrore(errore) === 404 ? (
              <RisorsaNonTrovata />
            ) : (
              <ErrorState errore={errore} onRiprova={riprova} />
            )
          }
        >
          {({ data }) => {
            // La scadenza la dichiara il server: l'ora del telefono è
            // modificabile, e sarebbe una seconda copia della stessa regola.
            const scaduto = data.stato === 'SCADUTO';
            const rifiutato = data.stato === 'RIFIUTATO';
            const inAttesa = data.stato === 'ACCETTATO' && !data.partecipanteCreato;

            return (
              <Card>
                <Text variante="corpoTenue">{t('app.invito.titolo')}</Text>
                <Text variante="sottotitolo">{data.titoloAula}</Text>

                {scaduto ? (
                  <Text variante="didascalia">{t('app.invito.scaduto')}</Text>
                ) : rifiutato ? (
                  <Text variante="didascalia">{t('app.invito.rifiutato')}</Text>
                ) : inAttesa ? (
                  <Text variante="didascalia">{t('app.invito.inCorso')}</Text>
                ) : (
                  <View style={{ gap: tema.spaziatura[2], marginTop: tema.spaziatura[2] }}>
                    <Button
                      titolo={t('app.invito.entra')}
                      larghezzaPiena
                      inCaricamento={accetta.isPending}
                      disabled={rifiuta.isPending}
                      onPress={() => accetta.mutate(undefined)}
                    />
                    <Button
                      titolo={t('app.invito.rifiuta')}
                      variante="contorno"
                      larghezzaPiena
                      inCaricamento={rifiuta.isPending}
                      disabled={accetta.isPending}
                      onPress={() => rifiuta.mutate(undefined)}
                    />
                  </View>
                )}
              </Card>
            );
          }}
        </QueryBoundary>
      </Screen>
    </>
  );
}
