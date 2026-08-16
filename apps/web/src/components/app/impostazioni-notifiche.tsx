'use client';

import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import {
  aggiornaPreferenzeNotifiche,
  getLeggiPreferenzeNotificheQueryKey,
  useLeggiPreferenzeNotifiche,
  type AggiornaPreferenzeDto,
  type LeggiPreferenzeNotifiche200,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Card, Switch } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

const ASSI = ['commenti', 'inviti'] as const;

/**
 * Cosa vuoi sapere: le due sole occasioni in cui il prodotto ti interrompe.
 *
 * **Non sono gli interruttori tolti a luglio.** Quelli non salvavano niente e
 * si dicevano attivi; questi salvano davvero, e il server li rilegge
 * nell'istante dell'invio — chi spegne i commenti non riceve l'avviso di un
 * commento arrivato un attimo prima. Da quando esiste la casella, governano i
 * canali che interrompono — l'email del commento oggi, il push quando ci sarà
 * un fornitore — **mai la campanella**, dove le notifiche arrivano sempre:
 * spegnere un asse significa «non disturbarmi», non «nascondimi
 * l'informazione». La scheda lo dice in prima riga.
 *
 * I due assi sono **indipendenti** come quelli della privacy, e si cambiano
 * uno per volta: il gesto manda solo l'asse toccato, quindi l'altro non può
 * essere azzerato per sbaglio da una risposta lenta o da una scrittura
 * concorrente.
 *
 * Nessuno stato locale: a schermo c'è ciò che il server ha confermato. Se la
 * scrittura fallisce l'interruttore torna dov'era, che è l'unico modo di non
 * far credere spento qualcosa che è rimasto acceso.
 */
export function ImpostazioniNotifiche() {
  const t = useTranslations('app.impostazioni.notifiche');
  const queryClient = useQueryClient();
  const preferenze = useLeggiPreferenzeNotifiche();

  const salva = useApiMutation({
    mutationFn: (cambio: AggiornaPreferenzeDto) => aggiornaPreferenzeNotifiche(cambio),
    onSuccess: (risposta) => {
      queryClient.setQueryData<LeggiPreferenzeNotifiche200>(
        getLeggiPreferenzeNotificheQueryKey(),
        risposta,
      );
    },
  });

  return (
    <QueryBoundary query={preferenze}>
      {({ data }) => (
        <Card padding="md" className="mb-6">
          <p className="text-[15.5px] font-extrabold text-testo">{t('titolo')}</p>
          <p className="mb-4 mt-1 text-[13px] leading-relaxed text-testo-tenue">{t('stato')}</p>

          <div className="grid gap-3.5">
            {ASSI.map((asse) => (
              <div key={asse} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-testo">{t(`${asse}.titolo`)}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-testo-tenue">
                    {t(`${asse}.testo`)}
                  </p>
                </div>
                <Switch
                  etichetta={t(`${asse}.titolo`)}
                  attivo={data[asse]}
                  disabilitato={salva.isPending}
                  onChange={(attivo) => salva.mutate({ [asse]: attivo })}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </QueryBoundary>
  );
}
