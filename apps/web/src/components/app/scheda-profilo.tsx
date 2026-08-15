'use client';

import { useTranslations } from 'next-intl';
import { useLeggiMioProfilo } from '@prome/api-client';
import { Avatar, Card } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

/**
 * Chi sei, in cima alle impostazioni.
 *
 * I quattro dati sono quelli dell'onboarding, letti dal server. Non c'è
 * l'email: la sessione porta solo un identificativo, e il profilo non la
 * espone — scriverla a schermo vorrebbe dire farla uscire da Accesso, che è
 * l'unico posto dove sta.
 */
export function SchedaProfilo() {
  const t = useTranslations('app.impostazioni');
  const profilo = useLeggiMioProfilo();

  return (
    <QueryBoundary query={profilo}>
      {({ data }) => {
        const nome = [data.nome, data.cognome].filter(Boolean).join(' ');
        const studi = [data.corso, data.universita].filter(Boolean).join(' · ');

        return (
          <Card padding="md" className="mb-6 flex flex-wrap items-center gap-4">
            <Avatar nome={nome || '?'} dimensione={76} className="text-2xl" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[22px] font-extrabold tracking-[-0.02em]">
                {nome || t('senzaNome')}
              </p>
              {studi ? <p className="mt-1 text-[13.5px] text-testo-tenue">{studi}</p> : null}
            </div>
          </Card>
        );
      }}
    </QueryBoundary>
  );
}
