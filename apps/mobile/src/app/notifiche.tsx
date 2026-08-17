import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getContaNotificheNonLetteQueryKey,
  getElencaNotificheQueryKey,
  segnaNotificaLetta,
  segnaTutteLeNotificheLette,
  useContaNotificheNonLette,
  useElencaNotifiche,
  type NotificaDto,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { QueryBoundary, EmptyState } from '@/components/feedback';
import {
  Elenco,
  Intestazione,
  RigaElenco,
  Screen,
  Text,
  type NomeIcona,
} from '@/components/ui';

const ICONE: Record<NotificaDto['tipo'], NomeIcona> = {
  COMMENTO: 'commento',
  INVITO_AULA: 'aule',
  INVITO_GRUPPO: 'gruppi',
};

/**
 * Le notifiche: la destinazione della campanella.
 *
 * I testi si traducono dal `tipo`, qui sul telefono: la riga non porta nomi
 * né frasi — «qualcuno ha commentato», e chi sia quel qualcuno si scopre
 * aprendo il post, dove le regole di visibilità valgono ancora.
 *
 * **Il tocco naviga subito e segna letta senza aspettare**: la lettura è un
 * effetto del gesto, non il gesto, e un errore nel segnarla non trattiene
 * nessuno. **Ogni destinazione è una schermata dell'app**, inviti compresi:
 * fino a oggi l'invito apriva il browser sulla pagina dell'email, che
 * significava chiedere un secondo accesso sul web per rispondere a qualcosa
 * che qui è un tocco — e dietro c'è un solo invito, letto e chiuso dagli
 * stessi endpoint.
 */
export default function SchermataNotifiche() {
  const tema = useTema();
  const t = useT();
  const queryClient = useQueryClient();
  const notifiche = useElencaNotifiche({ limit: 50 });
  // Il conteggio e basta: la campanella della bacheca tiene già vivo il
  // socket — le tab non si smontano — e un secondo sarebbe una connessione
  // in più per lo stesso campanello.
  const conteggio = useContaNotificheNonLette();
  const nonLette = conteggio.data?.data.nonLette ?? 0;

  const invalida = () => {
    void queryClient.invalidateQueries({ queryKey: getContaNotificheNonLetteQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getElencaNotificheQueryKey() });
  };

  /** Dove porta il tocco: la destinazione si costruisce qui, mai sul server. */
  const destinazioneDi = (notifica: NotificaDto) => {
    switch (notifica.risorsaTipo) {
      case 'POST':
        return rotte.post(notifica.risorsaId);
      case 'INVITO_AULA':
        return rotte.invito(notifica.risorsaId);
      case 'INVITO_GRUPPO':
        return rotte.invitoGruppo(notifica.risorsaId);
    }
  };

  const apri = (notifica: NotificaDto) => {
    router.push(destinazioneDi(notifica));
    if (!notifica.letta) {
      // Best-effort: se fallisce, la riga resta non letta e il conteggio dice
      // il vero. Riprovare o avvisare non aiuterebbe chi sta già navigando.
      void segnaNotificaLetta(notifica.id).then(invalida, () => undefined);
    }
  };

  const segnaTutte = () => {
    void segnaTutteLeNotificheLette().then(invalida, () => undefined);
  };

  return (
    <>
      <Intestazione
        conIndietro
        titolo={t('app.notifiche.titolo')}
        azioni={
          nonLette > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('app.notifiche.segnaTutte')}
              onPress={segnaTutte}
              hitSlop={10}
            >
              <Text variante="etichetta" colore="accento" style={{ fontSize: 13.5 }}>
                {t('app.notifiche.segnaTutte')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <Screen scorrevole conAreaSicura={false}>
        <QueryBoundary
          query={notifiche}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={
            <EmptyState
              titolo={t('app.notifiche.vuoto.titolo')}
              descrizione={t('app.notifiche.vuoto.descrizione')}
            />
          }
        >
          {(risposta) => (
            <Elenco>
              {risposta.data.map((notifica) => (
                <RigaElenco
                  key={notifica.id}
                  icona={ICONE[notifica.tipo]}
                  tinta={notifica.letta ? 'neutra' : 'menta'}
                  etichetta={t(`app.notifiche.tipo.${notifica.tipo}.titolo`)}
                  sottotitolo={t(`app.notifiche.tipo.${notifica.tipo}.corpo`)}
                  valore={new Date(notifica.creatoIl).toLocaleDateString()}
                  coda={
                    notifica.letta ? undefined : (
                      <View
                        accessibilityLabel={t('app.notifiche.nonLetta')}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: tema.raggio.full,
                          backgroundColor: tema.colori.primario,
                        }}
                      />
                    )
                  }
                  onPress={() => apri(notifica)}
                />
              ))}
            </Elenco>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}
