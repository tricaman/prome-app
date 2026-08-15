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
import { Card } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { cn } from '@/lib/utils';

const OPZIONI: readonly {
  valore: AggiornaPrivacyDtoVisibilita;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', chiave: 'privato' },
  { valore: 'ATENEO', chiave: 'ateneo' },
  { valore: 'PUBBLICO', chiave: 'pubblico' },
];

/**
 * Chi vede quello che scrivi: la sola impostazione di privacy che oggi ha un
 * effetto, e quindi la sola che si può mostrare.
 *
 * **Non c'è stato locale.** Il valore a schermo è quello che il server ha
 * confermato: fino alla risposta resta quello vecchio, e se la scrittura
 * fallisce non cambia niente. Su una decisione di privacy un valore mostrato ma
 * non salvato è la bugia peggiore possibile — chi legge «Pubblico» crede di
 * essere visibile, e nessuno gli dirà mai il contrario. Questa schermata l'ha
 * già detta: mostrava «Ateneo» a chiunque mentre il valore vero era «Privato»,
 * e nessuna scelta veniva salvata da nessuna parte.
 *
 * L'altro asse del modello — chi può contattarti — **non è qui di proposito**:
 * il valore si salva (l'API lo accetta, IP2/IP3 sono provate dai test) ma
 * nessuna regola lo legge ancora. Gli inviti viaggiano per indirizzo email, e
 * un indirizzo può non avere un account: verificarlo lì racconterebbe a chi
 * invita se quella persona è iscritta a Prome. Finché non c'è qualcosa che lo
 * applica davvero, un interruttore che non protegge da niente è peggio di un
 * interruttore che manca.
 */
export function ImpostazioniPrivacy() {
  const t = useTranslations('app.impostazioni');
  const queryClient = useQueryClient();
  const profilo = useLeggiMioProfilo();

  const salva = useApiMutation({
    mutationFn: (visibilita: AggiornaPrivacyDtoVisibilita) => aggiornaMiaPrivacy({ visibilita }),
    // La risposta è il profilo aggiornato: si mette in cache quello, non una
    // previsione. L'invalidazione dopo resta perché la stessa lettura la
    // guardano altre schermate.
    onSuccess: (risposta) => {
      queryClient.setQueryData<LeggiMioProfilo200>(getLeggiMioProfiloQueryKey(), risposta);
    },
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

  return (
    <QueryBoundary query={profilo}>
      {({ data }) => (
        <Card padding="md" className="mb-6">
          <p className="text-[15.5px] font-extrabold text-testo">{t('contenuti.titolo')}</p>
          <p className="mb-3.5 mt-1 text-[13px] leading-relaxed text-testo-tenue">
            {t('contenuti.testo')}
          </p>

          <div
            role="radiogroup"
            aria-label={t('contenuti.titolo')}
            aria-busy={salva.isPending}
            className="grid gap-2.5 sm:grid-cols-3"
          >
            {OPZIONI.map((opzione) => {
              const scelta = opzione.valore === data.impostazioniPrivacy.visibilita;
              return (
                <button
                  key={opzione.valore}
                  type="button"
                  role="radio"
                  aria-checked={scelta}
                  disabled={salva.isPending}
                  // Riscegliere ciò che è già scelto non è un cambio: evita una
                  // richiesta e un avviso che confermerebbe una cosa già vera.
                  onClick={() => !scelta && salva.mutate(opzione.valore)}
                  className={cn(
                    'rounded-[14px] border-2 p-3.5 text-left transition-colors',
                    scelta
                      ? 'border-primary-500 bg-tinta-menta'
                      : 'border-bordo bg-superficie hover:border-tinta-menta-bordo',
                    salva.isPending && 'cursor-progress opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'block text-[13.5px] font-extrabold',
                      scelta ? 'text-tinta-menta-testo' : 'text-testo',
                    )}
                  >
                    {t(`visibilita.${opzione.chiave}`)}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-testo-tenue">
                    {t(`contenuti.${opzione.chiave}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </QueryBoundary>
  );
}
