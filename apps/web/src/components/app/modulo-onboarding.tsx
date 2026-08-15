'use client';

import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { completaMioProfilo, type CompletaProfiloDto } from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { useRouter } from '@/i18n/navigazione';
import { percorsiApp } from '@/lib/percorsi-app';
import { Form, FormInput, FormSubmit } from '@/components/form';
import { SceltaAteneo } from './scelta-ateneo';

/**
 * Onboarding del profilo: nome, cognome, università, corso.
 *
 * I quattro dati stanno in un modulo solo perché sono un dato solo: il profilo
 * è completo se e solo se ci sono tutti e quattro, quindi spezzarli in passi
 * numerati mostrerebbe un avanzamento che il server non riconosce — per lui
 * esiste una scrittura, non tre.
 *
 * L'università si cerca in un elenco ma **si può anche scrivere**: è un dato
 * autodichiarato, e un ateneo che non è nell'elenco non deve impedire di
 * entrare.
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
      universita: z.string().min(2, obbligatorio),
      corso: z.string().min(2, obbligatorio),
    }),
    defaultValues: { nome: '', cognome: '', universita: '', corso: '' },
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

      <SceltaAteneo
        etichetta={t('universita')}
        segnaposto={t('cercaUniversita')}
        nessunRisultato={t('nessunRisultato')}
        valore={form.watch('universita')}
        onScelta={(nome) =>
          form.setValue('universita', nome, { shouldValidate: true, shouldDirty: true })
        }
      />

      <FormInput name="corso" etichetta={t('corso')} segnaposto={t('corsoSegnaposto')} obbligatorio />

      <FormSubmit className="h-[50px] px-7 text-[15px] shadow-marchio">{t('completa')}</FormSubmit>
    </Form>
  );
}
