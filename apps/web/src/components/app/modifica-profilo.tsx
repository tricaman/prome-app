'use client';

import { useTranslations } from 'next-intl';
import { z } from 'zod';
import {
  completaMioProfilo,
  getLeggiMioProfiloQueryKey,
  useLeggiMioProfilo,
  type CompletaProfiloDto,
  type ProfiloDto,
} from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { Form, FormInput } from '@/components/form';
import { Button, Card } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { SceltaCorso } from './scelta-corso';

/**
 * Correggere i propri dati.
 *
 * Il dominio lo prevede da sempre — «i quattro dati restano modificabili ma
 * mai svuotabili: un cognome sbagliato si corregge» (P3) — e l'endpoint
 * esisteva già. Mancava la schermata, e la conseguenza non era estetica:
 * **l'università decide chi vede i tuoi contenuti** e a quali aule sei
 * ammesso, quindi un errore di battitura nell'onboarding restava per sempre e
 * cambiava in silenzio il tuo pubblico.
 *
 * I campi si mandano insieme perché insieme sono un dato solo: il profilo è
 * completo se e solo se ci sono tutti, e il server non conosce un
 * aggiornamento parziale.
 */
export function ModificaProfilo() {
  const profilo = useLeggiMioProfilo();

  return (
    <QueryBoundary query={profilo}>
      {({ data }) => (
        <Modulo
          // Il modulo nasce con i valori del server: rimontarlo quando
          // cambiano evita di lasciare a schermo una copia vecchia.
          key={`${data.nome}-${data.cognome}-${data.corso?.id ?? ''}`}
          profilo={data}
        />
      )}
    </QueryBoundary>
  );
}

function Modulo({ profilo }: { profilo: ProfiloDto }) {
  const t = useTranslations('app.impostazioni.profilo');
  const tCampi = useTranslations('app.onboarding');
  const tValidazione = useTranslations('validazione');

  const obbligatorio = { message: tValidazione('obbligatorio') };
  const form = useForm({
    schema: z.object({
      nome: z.string().min(1, obbligatorio),
      cognome: z.string().min(1, obbligatorio),
      corsoId: z.string().min(1, obbligatorio),
    }),
    defaultValues: {
      nome: profilo.nome ?? '',
      cognome: profilo.cognome ?? '',
      corsoId: profilo.corso?.id ?? '',
    },
  });

  const salva = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (dati: CompletaProfiloDto) => completaMioProfilo(dati),
    invalida: [getLeggiMioProfiloQueryKey() as never],
    form,
  });

  return (
    <Card padding="md" className="mb-6">
      <p className="text-[15px] font-extrabold text-testo">{t('titolo')}</p>
      <p className="mb-4 mt-1 text-[12.5px] leading-relaxed text-testo-tenue">{t('testo')}</p>

      <Form form={form} onSubmit={(valori) => salva.mutate(valori)} id="modifica-profilo">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            name="nome"
            etichetta={tCampi('nome')}
            autoComplete="given-name"
            obbligatorio
          />
          <FormInput
            name="cognome"
            etichetta={tCampi('cognome')}
            autoComplete="family-name"
            obbligatorio
          />
        </div>

        <SceltaCorso
          ateneoIniziale={profilo.universita}
          corsoIniziale={profilo.corso}
          onCorso={(corsoId) =>
            form.setValue('corsoId', corsoId, { shouldValidate: true, shouldDirty: true })
          }
          errore={form.formState.errors.corsoId?.message}
        />
      </Form>

      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          form="modifica-profilo"
          inCaricamento={salva.isPending}
          className="h-11 rounded-xl px-5"
        >
          {t('salva')}
        </Button>
      </div>
    </Card>
  );
}
