'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  accettaInvitoDiGruppo,
  getElencaMieiGruppiQueryKey,
  getLeggiInvitoDiGruppoQueryKey,
  useLeggiInvitoDiGruppo,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { percorsiApp } from '@/lib/percorsi-app';
import { useRouter } from '@/i18n/navigazione';
import { Button, Card } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

/**
 * Chi arriva dall'email di invito.
 *
 * L'accettazione risponde 202: il membro **non** nasce nella stessa
 * transazione (IG3), e fra il sì e l'esserci dentro passano pochi secondi. La
 * finestra si dichiara invece di nasconderla — si dice che stiamo aggiungendo,
 * e si entra nel gruppo solo quando il server conferma che il membro c'è.
 */
export function AccettaInvitoGruppo({ invitoId }: { invitoId: string }) {
  const t = useTranslations('app.gruppo');
  const router = useRouter();
  const invito = useLeggiInvitoDiGruppo(invitoId, {
    query: {
      // Finché il membro non c'è, la risposta va richiesta: è la stessa
      // finestra dichiarata dal dominio, e qui la si aspetta guardandola.
      refetchInterval: (query) =>
        query.state.data?.data.stato === 'ACCETTATO' && !query.state.data.data.membroCreato
          ? 1000
          : false,
    },
  });

  const accetta = useApiMutation({
    mutationFn: () => accettaInvitoDiGruppo(invitoId),
    invalida: [
      getLeggiInvitoDiGruppoQueryKey(invitoId) as never,
      getElencaMieiGruppiQueryKey() as never,
    ],
  });

  // Quando il membro c'è davvero si entra nel gruppo. In un effetto e non
  // durante il disegno: navigare mentre si rende è un effetto collaterale, e
  // qui produrrebbe un salto anche mentre React sta solo riprovando a disegnare.
  const gruppoId = invito.data?.data.gruppoId;
  const membroCreato = invito.data?.data.membroCreato ?? false;
  useEffect(() => {
    if (membroCreato && gruppoId) router.replace(percorsiApp.gruppo(gruppoId));
  }, [membroCreato, gruppoId, router]);

  return (
    <QueryBoundary query={invito} dimensione="piena">
      {({ data }) => {
        // La scadenza la dichiara il server: confrontare qui gli orologi
        // vorrebbe dire tenere due copie della stessa regola, e quella del
        // browser è anche quella sbagliata — l'ora locale è modificabile.
        const scaduto = data.stato === 'SCADUTO';
        const inAttesa = data.stato === 'ACCETTATO' && !data.membroCreato;

        return (
          <div className="mx-auto w-full max-w-[520px] px-5 py-12">
            <Card padding="md" className="text-center">
              <p className="font-display text-[22px] font-extrabold tracking-[-0.02em]">
                {t('invitoTitolo')}
              </p>
              <p className="mt-2 text-[15px] font-bold text-testo">{data.nomeGruppo}</p>

              {scaduto ? (
                <p className="mt-4 text-[13.5px] text-testo-tenue">{t('invitoScaduto')}</p>
              ) : inAttesa ? (
                <p className="mt-4 text-[13.5px] text-testo-tenue">{t('invitoInCorso')}</p>
              ) : (
                <Button
                  className="mt-5 h-11 rounded-xl px-6"
                  inCaricamento={accetta.isPending}
                  onPress={() => accetta.mutate(undefined)}
                >
                  {t('invitoEntra')}
                </Button>
              )}
            </Card>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
