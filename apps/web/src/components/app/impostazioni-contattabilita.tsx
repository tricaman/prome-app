'use client';

import { useTranslations } from 'next-intl';
import type { AggiornaPrivacyDtoVisibilita } from '@prome/api-client';
import { SEGNAPOSTO_CONTATTABILITA, gestoSospeso } from '@/lib/segnaposto';
import { Card, Chip, SceltaRadio } from '@/components/ui';

const VALORI = ['PRIVATO', 'ATENEO', 'PUBBLICO'] as const;
const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

/**
 * Chi può contattarti: l'asse che il modello ha e il prodotto non applica.
 *
 * Fino a ieri non era a schermo affatto, e la ragione scritta allora resta
 * vera: **nessuna regola lo legge**. L'API lo accetta e lo salva, ma gli inviti
 * viaggiano per indirizzo email — che può non avere un account — e verificarlo
 * lì racconterebbe a chi invita se quella persona è iscritta a Prome. Un
 * interruttore che non protegge da niente è peggio di un interruttore che
 * manca.
 *
 * Perché allora è tornato: perché **spento e dichiarato non è un interruttore,
 * è una dichiarazione**. Le scelte non si possono toccare e la scheda dice in
 * chiaro che la scelta non è ancora applicata — la stessa forma con cui il
 * pannello degli avvisi racconta di non avere un fornitore. Quello che non si
 * fa, e che sarebbe il difetto vero, è **salvarla**: chi la impostasse su
 * «Privato» crederebbe di essersi protetto, e nessuno lo smentirebbe.
 */
export function ImpostazioniContattabilita() {
  const t = useTranslations('app.impostazioni');
  const tComune = useTranslations('comune');

  const opzioni = VALORI.map((valore) => ({
    valore: valore as AggiornaPrivacyDtoVisibilita,
    etichetta: t(`visibilita.${CHIAVI[valore]}`),
    descrizione: t(`contattabilita.${CHIAVI[valore]}`),
  }));

  return (
    <Card padding="md" className="mb-6">
      <div className="flex items-center gap-2.5">
        <p className="text-[15.5px] font-extrabold text-testo">{t('contattabilita.titolo')}</p>
        <Chip tono="ambra" dimensione="sm">
          {tComune('presto')}
        </Chip>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-testo-tenue">
        {t('contattabilita.testo')}
      </p>
      <p className="mb-3.5 mt-2 text-[12.5px] leading-relaxed text-tinta-ambra-testo">
        {t('contattabilita.nonApplicata')}
      </p>

      <SceltaRadio
        opzioni={opzioni}
        valore={null}
        etichetta={t('contattabilita.titolo')}
        disabilitato
        onScegli={gestoSospeso(SEGNAPOSTO_CONTATTABILITA)}
      />
    </Card>
  );
}
