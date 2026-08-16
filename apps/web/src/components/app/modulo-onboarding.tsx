'use client';

import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { completaMioProfilo, type CompletaProfiloDto } from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { useRouter } from '@/i18n/navigazione';
import { percorsiApp } from '@/lib/percorsi-app';
import { Form, FormInput, FormSubmit } from '@/components/form';
import { SceltaCorso } from './scelta-corso';

/**
 * Onboarding del profilo: nome, cognome e corso di studi.
 *
 * I dati stanno in un modulo solo perché sono un dato solo: il profilo è
 * completo se e solo se ci sono tutti, quindi spezzarli in passi numerati
 * mostrerebbe un avanzamento che il server non riconosce — per lui esiste una
 * scrittura, non tre.
 *
 * L'università non è un campo a sé: si sceglie per arrivare al corso, e al
 * server arriva il corso, che se la porta dietro. Il catalogo è **chiuso**,
 * quindi qui non si scrive niente a mano — si sceglie.
 */
export function ModuloOnboarding() {
  const t = useTranslations('app.onboarding');
  const tValidazione = useTranslations('validazione');
  const router = useRouter();

  const obbligatorio = { message: tValidazione('obbligatorio') };
  const form = useForm({
    schema: z.object({
      nome: z.string().min(1, obbligatorio),
      cognome: z.string().min(1, obbligatorio),
      corsoId: z.string().min(1, obbligatorio),
    }),
    defaultValues: { nome: '', cognome: '', corsoId: '' },
  });

  const completa = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (dati: CompletaProfiloDto) => completaMioProfilo(dati),
    form,
    onSuccess: () => router.replace(percorsiApp.bacheca()),
  });

  return (
    <Form form={form} onSubmit={(valori) => completa.mutate(valori)} className="max-w-[640px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput name="nome" etichetta={t('nome')} autoComplete="given-name" obbligatorio />
        <FormInput name="cognome" etichetta={t('cognome')} autoComplete="family-name" obbligatorio />
      </div>

      <SceltaCorso
        onCorso={(corsoId) =>
          form.setValue('corsoId', corsoId, { shouldValidate: true, shouldDirty: true })
        }
        errore={form.formState.errors.corsoId?.message}
      />

      <FormSubmit className="h-[50px] px-7 text-[15px] shadow-marchio">{t('completa')}</FormSubmit>
    </Form>
  );
}
