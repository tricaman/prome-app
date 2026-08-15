'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import {
  creaGruppo,
  getElencaMieiGruppiQueryKey,
  useElencaMieiGruppi,
  type CreaGruppoDtoVisibilita,
  type GruppoDto,
} from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link, useRouter } from '@/i18n/navigazione';
import { Form, FormInput } from '@/components/form';
import { Button, Card, Chip, Icona } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { SceltaVisibilitaGruppo } from './scelta-visibilita-gruppo';

/**
 * I gruppi di cui si fa parte.
 *
 * Non c'è una vetrina dei gruppi altrui, nemmeno dei pubblici: «pubblico» dice
 * chi può vedere un gruppo di cui ha l'indirizzo, non che esista un elenco da
 * sfogliare. Una directory sarebbe una superficie nuova con domande che nessun
 * documento ha aperto — chi finisce in cima, e perché.
 */
export function ElencoGruppi() {
  const t = useTranslations('app.gruppo');
  const [creazioneAperta, setCreazioneAperta] = useState(false);
  const gruppi = useElencaMieiGruppi({ limit: 50 });

  return (
    <>
      <div className="mx-auto w-full max-w-[1000px] px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-[520px] text-[13.5px] leading-relaxed text-testo-tenue">
            {t('sommario')}
          </p>
          <Button
            onPress={() => setCreazioneAperta(true)}
            className="h-[42px] flex-none rounded-[14px] px-5 text-sm"
            iconaSinistra={<Icona nome="piu" dimensione={17} />}
          >
            {t('crea')}
          </Button>
        </div>

        <QueryBoundary
          query={gruppi}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('nessuno')}</p>}
        >
          {(risposta) => (
            <div className="grid gap-4 sm:grid-cols-2">
              {risposta.data.map((gruppo) => (
                <SchedaGruppo key={gruppo.id} gruppo={gruppo} />
              ))}
            </div>
          )}
        </QueryBoundary>
      </div>

      {creazioneAperta ? <ModaleCreaGruppo onChiudi={() => setCreazioneAperta(false)} /> : null}
    </>
  );
}

function SchedaGruppo({ gruppo }: { gruppo: GruppoDto }) {
  const t = useTranslations('app.gruppo');

  return (
    <Card padding="md" className="transition-colors hover:border-tinta-menta-bordo">
      <Link href={percorsiApp.gruppo(gruppo.id)} className="block">
        <div className="mb-2.5 flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-11 flex-none place-items-center rounded-[14px] bg-tinta-menta font-display text-[17px] font-extrabold text-tinta-menta-testo"
          >
            {gruppo.nome.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[16.5px] font-extrabold tracking-[-0.01em] text-testo">
              {gruppo.nome}
            </span>
            <span className="mt-0.5 block text-[12.5px] text-testo-tenue">
              {gruppo.membri === 1 ? t('unMembro') : t('nMembri', { numero: gruppo.membri })}
              {gruppo.ateneo ? ` · ${gruppo.ateneo}` : ''}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip dimensione="sm">{t(`visibilita.${etichettaVisibilita(gruppo.visibilita)}`)}</Chip>
          {gruppo.sonoModeratore ? (
            <Chip tono="menta" dimensione="sm">
              {t('moderatore')}
            </Chip>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}

/** Il contratto parla in maiuscolo, le chiavi dei testi in minuscolo. */
export function etichettaVisibilita(valore: string): 'privato' | 'ateneo' | 'pubblico' {
  if (valore === 'PUBBLICO') return 'pubblico';
  if (valore === 'ATENEO') return 'ateneo';
  return 'privato';
}

const schema = z.object({ nome: z.string().min(1).max(120) });

function ModaleCreaGruppo({ onChiudi }: { onChiudi: () => void }) {
  const t = useTranslations('app.gruppo');
  const tComune = useTranslations('comune');
  const router = useRouter();
  const [visibilita, setVisibilita] = useState<CreaGruppoDtoVisibilita>('PRIVATO');

  const form = useForm({ schema, defaultValues: { nome: '' } });

  const crea = useApiMutation({
    mutationFn: (dati: { nome: string }) => creaGruppo({ nome: dati.nome, visibilita }),
    invalida: [getElencaMieiGruppiQueryKey() as never],
    form,
    onSuccess: ({ data }) => {
      onChiudi();
      router.push(percorsiApp.gruppo(data.id));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Il velo chiude la finestra: è il gesto che tutti provano per primo. */}
      <button
        type="button"
        aria-label={tComune('annulla')}
        onClick={onChiudi}
        className="absolute inset-0 bg-velo"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titolo-crea-gruppo"
        className="relative flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] bg-superficie shadow-xl"
      >
        <header className="flex items-center gap-3 border-b border-bordo px-6 py-4">
          <h2
            id="titolo-crea-gruppo"
            className="font-display text-xl font-extrabold tracking-[-0.02em]"
          >
            {t('crea')}
          </h2>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={tComune('annulla')}
            className="ml-auto grid size-[34px] place-items-center rounded-[11px] bg-superficie-alt-2 text-base font-extrabold text-testo-tenue"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-5">
          <Form form={form} onSubmit={(valori) => crea.mutate(valori)} id="crea-gruppo">
            <FormInput name="nome" etichetta={t('nome')} segnaposto={t('nomeEsempio')} />
          </Form>

          <p className="mb-2.5 mt-5 text-[12.5px] font-extrabold text-testo-tenue">
            {t('chiPuoVederlo')}
          </p>
          <SceltaVisibilitaGruppo valore={visibilita} onScegli={setVisibilita} />
        </div>

        <footer className="flex justify-end gap-2 border-t border-bordo px-6 py-4">
          <Button variante="contorno" onPress={onChiudi} className="h-11 rounded-xl px-4">
            {tComune('annulla')}
          </Button>
          <Button
            type="submit"
            form="crea-gruppo"
            inCaricamento={crea.isPending}
            className="h-11 rounded-xl px-5"
          >
            {t('crea')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
