import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { statusErrore } from '@prome/app-core';
import {
  accettaInvitoDiGruppo,
  getElencaMieiGruppiQueryKey,
  getLeggiInvitoDiGruppoQueryKey,
  rifiutaInvitoDiGruppo,
  useLeggiInvitoDiGruppo,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { ErrorState, QueryBoundary, RisorsaNonTrovata } from '@/components/feedback';
import { Button, Card, Intestazione, Screen, Text } from '@/components/ui';

/**
 * L'invito a un gruppo, dentro l'app: la gemella della schermata dell'aula.
 *
 * Ha un percorso proprio perché l'invito al gruppo è un altro aggregato, di un
 * altro contesto, con i suoi endpoint: sono due schermate che si somigliano,
 * non una schermata con un parametro. Accettare risponde 202 (il membro non
 * nasce nella stessa transazione, IG3), rifiutare 200.
 */
export default function SchermataInvitoGruppo() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();

  const invito = useLeggiInvitoDiGruppo(id, {
    query: {
      refetchInterval: (query) =>
        query.state.data?.data.stato === 'ACCETTATO' && !query.state.data.data.membroCreato
          ? 1000
          : false,
    },
  });

  const accetta = useApiMutation({
    mutationFn: () => accettaInvitoDiGruppo(id),
    invalida: [getLeggiInvitoDiGruppoQueryKey(id) as never, getElencaMieiGruppiQueryKey() as never],
  });

  const rifiuta = useApiMutation({
    mutationFn: () => rifiutaInvitoDiGruppo(id),
    invalida: [getLeggiInvitoDiGruppoQueryKey(id) as never],
  });

  const gruppoId = invito.data?.data.gruppoId;
  const membroCreato = invito.data?.data.membroCreato ?? false;
  useEffect(() => {
    if (membroCreato && gruppoId) router.replace(rotte.gruppo(gruppoId));
  }, [membroCreato, gruppoId]);

  return (
    <>
      <Intestazione
        conIndietro
        titolo={t('app.notifiche.tipo.INVITO_GRUPPO.titolo')}
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
            const scaduto = data.stato === 'SCADUTO';
            const rifiutato = data.stato === 'RIFIUTATO';
            const inAttesa = data.stato === 'ACCETTATO' && !data.membroCreato;

            return (
              <Card>
                <Text variante="corpoTenue">{t('app.gruppo.invitoTitolo')}</Text>
                <Text variante="sottotitolo">{data.nomeGruppo}</Text>

                {scaduto ? (
                  <Text variante="didascalia">{t('app.gruppo.invitoScaduto')}</Text>
                ) : rifiutato ? (
                  <Text variante="didascalia">{t('app.gruppo.invitoRifiutato')}</Text>
                ) : inAttesa ? (
                  <Text variante="didascalia">{t('app.gruppo.invitoInCorso')}</Text>
                ) : (
                  <View style={{ gap: tema.spaziatura[2], marginTop: tema.spaziatura[2] }}>
                    <Button
                      titolo={t('app.gruppo.invitoEntra')}
                      larghezzaPiena
                      inCaricamento={accetta.isPending}
                      disabled={rifiuta.isPending}
                      onPress={() => accetta.mutate(undefined)}
                    />
                    <Button
                      titolo={t('app.gruppo.invitoRifiuta')}
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
