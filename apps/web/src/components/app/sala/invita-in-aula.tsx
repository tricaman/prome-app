'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { invitaInAulaStudio } from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { Form, FormInput, FormSubmit } from '@/components/form';
import { Button, Icona } from '@/components/ui';

/**
 * L'invito a un'aula: un indirizzo email, e nient'altro.
 *
 * Si invita **anche chi non ha ancora un account**: l'invito resta in attesa
 * finché quella persona non si registra e completa il profilo. Non è uno stato
 * degenere, è il caso normale — si invita un amico, non un utente.
 */
export function InvitaInAula({ aulaId }: { aulaId: string }) {
  const t = useTranslations('app.sala');
  const [aperto, setAperto] = useState(false);

  const schema = z.object({ destinatario: z.string().email() });
  const form = useForm({ schema, defaultValues: { destinatario: '' } });

  const invita = useApiMutation({
    mutationFn: (dati: { destinatario: string }) => invitaInAulaStudio(aulaId, dati),
    form,
    onSuccess: () => {
      form.reset();
      setAperto(false);
    },
  });

  if (!aperto) {
    return (
      <Button
        variante="contorno"
        className="hidden h-10 flex-none rounded-xl px-4 text-[13.5px] sm:flex"
        iconaSinistra={<Icona nome="condividi" dimensione={16} />}
        onPress={() => setAperto(true)}
      >
        {t('invita')}
      </Button>
    );
  }

  return (
    <div className="flex w-full max-w-[420px] flex-none items-start gap-2 sm:w-auto">
      <Form form={form} onSubmit={(valori) => invita.mutate(valori)} className="flex-1">
        <FormInput name="destinatario" etichetta={t('invita')} segnaposto="nome@studenti.it" />
        <div className="mt-2 flex gap-2">
          <FormSubmit>{t('invia')}</FormSubmit>
          <Button variante="fantasma" onPress={() => setAperto(false)}>
            {t('annulla')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
