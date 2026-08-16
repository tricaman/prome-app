'use client';

import { useFormatter, useTranslations } from 'next-intl';
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
import { percorsiApp } from '@/lib/percorsi-app';
import { useRouter } from '@/i18n/navigazione';
import { Button, Elenco, RigaElenco, type NomeIcona } from '@/components/ui';
import { QueryBoundary, EmptyState } from '@/components/feedback';

const ICONE: Record<NotificaDto['tipo'], NomeIcona> = {
  COMMENTO: 'commento',
  INVITO_AULA: 'aule',
  INVITO_GRUPPO: 'gruppi',
};

/** Dove porta il tocco: la destinazione si costruisce qui, mai sul server. */
const destinazioneDi = (notifica: NotificaDto): string => {
  switch (notifica.risorsaTipo) {
    case 'POST':
      return percorsiApp.post(notifica.risorsaId);
    case 'INVITO_AULA':
      return percorsiApp.invito(notifica.risorsaId);
    case 'INVITO_GRUPPO':
      return percorsiApp.invitoGruppo(notifica.risorsaId);
  }
};

/**
 * L'elenco delle notifiche: cosa è successo, dal più recente.
 *
 * I testi si traducono dal `tipo`, qui sul client: la riga non porta nomi né
 * frasi — «qualcuno ha commentato», e chi sia quel qualcuno si scopre aprendo
 * il post, dove le regole di visibilità valgono ancora.
 *
 * **Il click naviga subito e segna letta senza aspettare**: la lettura è un
 * effetto del gesto, non il gesto — e un errore nel segnarla non deve
 * trattenere nessuno. Niente `useApiMutation` qui: un toast «notifica letta»
 * a ogni click sarebbe rumore, e la mutazione non ha un esito da raccontare.
 */
export function ElencoNotifiche() {
  const t = useTranslations('app.notifiche');
  const formato = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const notifiche = useElencaNotifiche({ limit: 50 });
  // Il conteggio e basta: il socket lo tiene già vivo la campanella nella
  // barra, e aprirne un secondo sulla stessa pagina sarebbe una connessione
  // in più per lo stesso campanello. La query invece è la stessa, condivisa.
  const conteggio = useContaNotificheNonLette();
  const nonLette = conteggio.data?.data.nonLette ?? 0;

  const invalida = () => {
    void queryClient.invalidateQueries({ queryKey: getContaNotificheNonLetteQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getElencaNotificheQueryKey() });
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
      {nonLette > 0 ? (
        <div className="mb-4 flex justify-end">
          <Button variante="contorno" size="sm" onPress={segnaTutte}>
            {t('segnaTutte')}
          </Button>
        </div>
      ) : null}

      <QueryBoundary
        query={notifiche}
        eVuoto={(risposta) => risposta.data.length === 0}
        vuoto={<EmptyState titolo={t('vuoto.titolo')} descrizione={t('vuoto.descrizione')} />}
      >
        {(risposta) => (
          <Elenco>
            {risposta.data.map((notifica) => (
              <RigaElenco
                key={notifica.id}
                icona={ICONE[notifica.tipo]}
                tinta={notifica.letta ? 'neutra' : 'menta'}
                etichetta={t(`tipo.${notifica.tipo}.titolo`)}
                sottotitolo={t(`tipo.${notifica.tipo}.corpo`)}
                valore={formato.relativeTime(new Date(notifica.creatoIl))}
                coda={
                  notifica.letta ? null : (
                    <span
                      role="status"
                      aria-label={t('nonLetta')}
                      className="size-2 flex-none rounded-full bg-primario"
                    />
                  )
                }
                onPress={() => apri(notifica)}
                className={notifica.letta ? 'opacity-70' : undefined}
              />
            ))}
          </Elenco>
        )}
      </QueryBoundary>
    </>
  );
}
