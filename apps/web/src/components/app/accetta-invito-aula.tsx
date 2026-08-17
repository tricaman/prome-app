'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  accettaInvito,
  getElencaAuleStudioQueryKey,
  getLeggiInvitoQueryKey,
  rifiutaInvito,
  useLeggiInvito,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { percorsiApp } from '@/lib/percorsi-app';
import { useRouter } from '@/i18n/navigazione';
import { Button, Card } from '@/components/ui';
import { statusErrore } from '@prome/app-core';
import { ErrorState, QueryBoundary, RisorsaNonTrovata } from '@/components/feedback';

/**
 * Chi arriva dall'email di invito a un'aula studio.
 *
 * **Questa pagina non esisteva.** L'email la nomina dal giorno in cui gli
 * inviti sono stati messi in esercizio — il collegamento è
 * `.../app/inviti/<id>` — e chi lo apriva trovava «Pagina non trovata». Il
 * server faceva la sua parte da sempre: mancava soltanto il posto dove
 * atterrare, ed è il tipo di difetto che nessun test dell'API può vedere,
 * perché non è l'API a essere rotta.
 *
 * L'accettazione risponde 202: il partecipante **non** nasce nella stessa
 * transazione (IA3), e fra il sì e l'essere dentro passano pochi secondi. La
 * finestra si dichiara — «ti stiamo facendo entrare» — invece di nasconderla
 * dietro un caricamento muto, e nella sala si entra quando il server conferma
 * che il partecipante c'è.
 *
 * **Le risposte sono due.** Il rifiuto risponde 200 e chiude l'invito: non c'è
 * niente da attendere, e non parte alcun avviso verso chi ha invitato — sapere
 * di essere stati rifiutati vorrebbe dire, per chi ha scritto a un indirizzo a
 * caso, sapere che dietro quell'indirizzo c'è qualcuno.
 */
export function AccettaInvitoAula({ invitoId }: { invitoId: string }) {
  const t = useTranslations('app.invito');
  const router = useRouter();

  const invito = useLeggiInvito(invitoId, {
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
    mutationFn: () => accettaInvito(invitoId),
    invalida: [
      getLeggiInvitoQueryKey(invitoId) as never,
      getElencaAuleStudioQueryKey() as never,
    ],
  });

  // Il rifiuto non tocca l'elenco delle aule: non ne fa entrare né uscire da
  // nessuna. Si rilegge il solo invito, che è l'unica cosa cambiata.
  const rifiuta = useApiMutation({
    mutationFn: () => rifiutaInvito(invitoId),
    invalida: [getLeggiInvitoQueryKey(invitoId) as never],
  });

  const aulaId = invito.data?.data.aulaStudioId;
  const partecipanteCreato = invito.data?.data.partecipanteCreato ?? false;
  useEffect(() => {
    if (partecipanteCreato && aulaId) router.replace(percorsiApp.aulaStudio(aulaId));
  }, [partecipanteCreato, aulaId, router]);

  return (
    <QueryBoundary query={invito} dimensione="piena"
      errore={(errore, riprova) =>
        statusErrore(errore) === 404 ? (
          <RisorsaNonTrovata />
        ) : (
          <ErrorState errore={errore} onRiprova={riprova} />
        )
      }
    >
      {({ data }) => {
        // La scadenza la dichiara il server: l'ora del browser è modificabile,
        // e sarebbe una seconda copia della stessa regola.
        const scaduto = data.stato === 'SCADUTO';
        const rifiutato = data.stato === 'RIFIUTATO';
        const inAttesa = data.stato === 'ACCETTATO' && !data.partecipanteCreato;

        return (
          <div className="mx-auto w-full max-w-[520px] px-5 py-12">
            <Card padding="md" className="text-center">
              <p className="font-display text-[22px] font-extrabold tracking-[-0.02em]">
                {t('titolo')}
              </p>
              <p className="mt-2 text-[15px] font-bold text-testo">{data.titoloAula}</p>

              {scaduto ? (
                <p className="mt-4 text-[13.5px] text-testo-tenue">{t('scaduto')}</p>
              ) : rifiutato ? (
                <p className="mt-4 text-[13.5px] text-testo-tenue">{t('rifiutato')}</p>
              ) : inAttesa ? (
                <p className="mt-4 text-[13.5px] text-testo-tenue">{t('inCorso')}</p>
              ) : (
                // Le due risposte stanno **una accanto all'altra**: un invito
                // senza un modo di dire di no si chiude solo abbandonando la
                // pagina, e chi lo fa resta a chiedersi se abbia accettato.
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    className="h-11 rounded-xl px-6"
                    inCaricamento={accetta.isPending}
                    isDisabled={rifiuta.isPending}
                    onPress={() => accetta.mutate(undefined)}
                  >
                    {t('entra')}
                  </Button>
                  <Button
                    variante="contorno"
                    className="h-11 rounded-xl px-6"
                    inCaricamento={rifiuta.isPending}
                    isDisabled={accetta.isPending}
                    onPress={() => rifiuta.mutate(undefined)}
                  >
                    {t('rifiuta')}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
