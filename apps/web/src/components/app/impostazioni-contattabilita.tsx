'use client';

import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import {
  aggiornaMiaPrivacy,
  getLeggiMioProfiloQueryKey,
  useLeggiMioProfilo,
  type AggiornaPrivacyDtoVisibilita,
  type LeggiMioProfilo200,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Card, SceltaRadio } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

const VALORI = ['PRIVATO', 'ATENEO', 'PUBBLICO'] as const;
const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

/**
 * Chi può contattarti — **adesso si sceglie, e adesso vale qualcosa**.
 *
 * Fino a ieri questa scheda era spenta con la pastiglia «Presto», e la ragione
 * era buona: nessuna regola leggeva il valore, e un interruttore che non
 * protegge da niente è peggio di un interruttore che manca. Applicarlo agli
 * inviti per indirizzo sarebbe stato peggio ancora — un rifiuto avrebbe detto
 * a chiunque se una certa email ha un account su Prome.
 *
 * Ora esiste il gesto in cui la regola può decidere **senza raccontare
 * niente**: invitare una persona che si sta già guardando nella sala di
 * un'aula aperta. Lì chi invita sa già che quella persona esiste, e il rifiuto
 * non aggiunge nulla a ciò che ha davanti. Per questo la scheda si accende: la
 * scelta si salva e viene applicata da subito.
 *
 * **Nessuno stato locale**, come per la visibilità: il valore a schermo è
 * quello che il server ha confermato. Su una decisione di privacy un valore
 * mostrato ma non salvato è la bugia peggiore che una schermata possa dire.
 */
export function ImpostazioniContattabilita() {
  const t = useTranslations('app.impostazioni');
  const queryClient = useQueryClient();
  const profilo = useLeggiMioProfilo();

  const salva = useApiMutation({
    mutationFn: (contattabilita: AggiornaPrivacyDtoVisibilita) =>
      aggiornaMiaPrivacy({ contattabilita }),
    onSuccess: (risposta) => {
      queryClient.setQueryData<LeggiMioProfilo200>(getLeggiMioProfiloQueryKey(), risposta);
    },
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

  const opzioni = VALORI.map((valore) => ({
    valore: valore as AggiornaPrivacyDtoVisibilita,
    etichetta: t(`visibilita.${CHIAVI[valore]}`),
    descrizione: t(`contattabilita.${CHIAVI[valore]}`),
  }));

  return (
    <QueryBoundary query={profilo}>
      {({ data }) => (
        <Card padding="md" className="mb-6">
          <p className="text-[15.5px] font-extrabold text-testo">{t('contattabilita.titolo')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-testo-tenue">
            {t('contattabilita.testo')}
          </p>
          {/* Dove vale davvero, detto per esteso: una regola di privacy che non
              dice il proprio perimetro si legge più larga di quello che è. */}
          <p className="mb-3.5 mt-1.5 text-[12.5px] leading-relaxed text-testo-didascalia">
            {t('contattabilita.ambito')}
          </p>

          <SceltaRadio
            opzioni={opzioni}
            valore={data.impostazioniPrivacy.contattabilita}
            etichetta={t('contattabilita.titolo')}
            inCorso={salva.isPending}
            onScegli={(valore) => salva.mutate(valore)}
          />
        </Card>
      )}
    </QueryBoundary>
  );
}
