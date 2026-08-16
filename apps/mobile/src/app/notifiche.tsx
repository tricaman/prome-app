import { Linking, Pressable, View } from 'react-native';
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
import { paginaDelSito, rotte } from '@/content';
import { useTema } from '@/theme';
import { useI18n } from '@/i18n/i18n-provider';
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
 * nessuno. Un post si apre nell'app; **un invito si apre nel browser**, sulla
 * stessa pagina a cui punta la sua email — le schermate native di
 * accettazione non esistono ancora, e due strade per lo stesso invito
 * sarebbero due implementazioni della stessa decisione.
 */
export default function SchermataNotifiche() {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();
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

  const apri = (notifica: NotificaDto) => {
    if (notifica.risorsaTipo === 'POST') {
      router.push(rotte.post(notifica.risorsaId));
    } else {
      const percorso =
        notifica.risorsaTipo === 'INVITO_AULA'
          ? `/app/inviti/${notifica.risorsaId}`
          : `/app/inviti-gruppo/${notifica.risorsaId}`;
      void Linking.openURL(paginaDelSito(percorso, lingua));
    }
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

      <Screen scorrevole>
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
