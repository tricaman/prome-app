'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import {
  creaAulaStudio,
  getElencaAuleStudioQueryKey,
  useElencaMieiGruppi,
  type CreaAulaStudioDtoVisibilita,
} from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { useRouter } from '@/i18n/navigazione';
import { percorsiApp } from '@/lib/percorsi-app';
import { Form, FormInput } from '@/components/form';
import { Button, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';

const VISIBILITA: readonly {
  valore: CreaAulaStudioDtoVisibilita;
  etichetta: string;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', etichetta: 'Privato', chiave: 'privato' },
  { valore: 'ATENEO', etichetta: 'Ateneo', chiave: 'ateneo' },
  { valore: 'PUBBLICO', etichetta: 'Pubblico', chiave: 'pubblico' },
];

/**
 * Creazione di un'aula studio.
 *
 * Un titolo basta ad aprirla: tutto il resto ha un valore predefinito
 * ragionevole, perché il momento in cui si crea un'aula è quasi sempre il
 * momento in cui si vuole già studiare.
 *
 * La visibilità è una scelta esplicita fra tre opzioni descritte, non un
 * interruttore "pubblico sì/no": è la decisione che l'utente non può
 * disfare per i contenuti già visti da altri.
 */
export function ModaleCreaAula({ onChiudi }: { onChiudi: () => void }) {
  const t = useTranslations('app.aule.modale');
  const router = useRouter();
  const [visibilita, setVisibilita] = useState<CreaAulaStudioDtoVisibilita>('PRIVATO');
  const [programmata, setProgrammata] = useState(false);
  const [quando, setQuando] = useState('');
  const [gruppoId, setGruppoId] = useState('');
  // Solo i gruppi di cui si fa parte: l'API esige l'appartenenza, quindi
  // proporne altri sarebbe un rifiuto annunciato.
  const gruppi = useElencaMieiGruppi({ limit: 50 });

  const schema = z.object({
    titolo: z.string().min(1).max(200),
  });
  const form = useForm({ schema, defaultValues: { titolo: '' } });

  const apri = useApiMutation({
    mutationFn: (dati: { titolo: string }) =>
      creaAulaStudio({
        titolo: dati.titolo,
        visibilita,
        // Assente = estemporanea: è la sola differenza fra le due, e non
        // esiste alcuno stato dietro.
        ...(programmata && quando ? { dataOraInizio: new Date(quando).toISOString() } : {}),
        ...(gruppoId ? { gruppoId } : {}),
      }),
    invalida: [getElencaAuleStudioQueryKey() as never],
    form,
    onSuccess: ({ data }) => {
      onChiudi();
      router.push(percorsiApp.aulaStudio(data.id));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Il velo chiude la finestra: è il gesto che tutti provano per primo. */}
      <button
        type="button"
        aria-label={t('annulla')}
        onClick={onChiudi}
        className="absolute inset-0 bg-velo"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titolo-crea-aula"
        className="relative flex max-h-full w-full max-w-[600px] flex-col overflow-hidden rounded-[20px] bg-superficie shadow-xl"
      >
        <header className="flex items-center gap-3 border-b border-bordo px-6 py-4">
          <h2 id="titolo-crea-aula" className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </h2>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={t('annulla')}
            className="ml-auto grid size-[34px] place-items-center rounded-[11px] bg-superficie-alt-2 text-base font-extrabold text-testo-tenue"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-5">
          <Form form={form} onSubmit={(valori) => apri.mutate(valori)} id="crea-aula">
            <FormInput name="titolo" etichetta={t('campoTitolo')} segnaposto={t('segnaposto')} />
          </Form>

          <p className="mb-2.5 mt-5 text-[12.5px] font-extrabold text-testo-tenue">
            {t('chiPuoEntrare')}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {VISIBILITA.map((opzione) => {
              const scelta = opzione.valore === visibilita;
              return (
                <button
                  key={opzione.valore}
                  type="button"
                  aria-pressed={scelta}
                  onClick={() => setVisibilita(opzione.valore)}
                  className={cn(
                    'rounded-[14px] border-2 p-3.5 text-left transition-colors',
                    scelta
                      ? 'border-primary-500 bg-tinta-menta-velo'
                      : 'border-bordo bg-superficie hover:border-tinta-menta-bordo',
                  )}
                >
                  <span className="mb-1.5 flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-[18px] place-items-center rounded-full border-2',
                        scelta ? 'border-primary-500' : 'border-bordo-forte',
                      )}
                    >
                      {scelta ? <span className="size-2.5 rounded-full bg-primary-600" /> : null}
                    </span>
                    <span className="text-[13.5px] font-extrabold text-testo">
                      {opzione.etichetta}
                    </span>
                  </span>
                  <span className="block text-[11.5px] leading-snug text-testo-tenue">
                    {t(`visibilita.${opzione.chiave}`)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-bordo bg-superficie-alt px-4 py-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-testo">{t('programma')}</span>
              <span className="mt-0.5 block text-xs text-testo-tenue">{t('programmaAiuto')}</span>
            </span>
            <Switch
              etichetta={t('programma')}
              attivo={programmata}
              onChange={setProgrammata}
            />
          </div>

          {programmata ? (
            <div className="mt-3">
              <input
                type="datetime-local"
                aria-label={t('programma')}
                value={quando}
                onChange={(evento) => setQuando(evento.target.value)}
                className="h-[46px] w-full rounded-[14px] border-2 border-bordo-forte bg-superficie px-3.5 text-sm font-bold text-testo"
              />
            </div>
          ) : null}

          {/* Era un riquadro con l'aria di essere cliccabile e non lo era:
              un div con dentro «Nessuno» e una freccia. Ora colloca davvero, e
              propone solo i gruppi di cui si fa parte — gli altri sarebbero un
              rifiuto annunciato, perché l'API esige l'appartenenza. */}
          <div className="mt-3 rounded-2xl border border-bordo bg-superficie-alt px-4 py-4">
            <label className="block">
              <span className="block text-sm font-extrabold text-testo">{t('colloca')}</span>
              <span className="mb-2.5 mt-0.5 block text-xs text-testo-tenue">
                {t('collocaAiuto')}
              </span>
              <select
                value={gruppoId}
                onChange={(evento) => setGruppoId(evento.target.value)}
                className="h-[42px] w-full rounded-xl border-2 border-bordo bg-superficie px-3 text-[14px] outline-none focus:border-primary-500"
              >
                <option value="">{t('nessuno')}</option>
                {(gruppi.data?.data ?? []).map((gruppo) => (
                  <option key={gruppo.id} value={gruppo.id}>
                    {gruppo.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-3.5 px-0.5 text-[11.5px] leading-relaxed text-testo-debole">
            {t.rich('nota', {
              forte: (parti) => <strong className="text-testo-tenue">{parti}</strong>,
            })}
          </p>
        </div>

        <footer className="flex justify-end gap-2.5 border-t border-bordo bg-superficie-alt px-6 py-4">
          <Button variante="contorno" className="h-[46px] border-2 px-5" onPress={onChiudi}>
            {t('annulla')}
          </Button>
          <Button
            type="submit"
            form="crea-aula"
            className="h-[46px] px-6"
            inCaricamento={apri.isPending}
          >
            {programmata ? t('programmaCta') : t('apri')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
