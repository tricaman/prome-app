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
import { useRouter } from '@/i18n/navigazione';
import { percorsiApp } from '@/lib/percorsi-app';
import {
  SEGNAPOSTO_ANNO_CORSO,
  SEGNAPOSTO_AVATAR,
  SEGNAPOSTO_BIO,
  gestoSospeso,
} from '@/lib/segnaposto';
import { Form, FormInput } from '@/components/form';
import { Avatar, Button, Card, Chip, Icona, Input, SectionLabel, Textarea } from '@/components/ui';
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
 *
 * Da scheda dentro le impostazioni è diventata **una pagina propria**, con la
 * barra delle azioni in cima: qui si cambia chi sei, nelle impostazioni come
 * funziona l'app, e sono due compiti che si affrontano in momenti diversi.
 * L'email non è qui perché è una credenziale, non un dato del profilo — e
 * perché il profilo non la espone affatto.
 *
 * SEGNAPOSTO: foto, biografia e anno di corso. Nessuno dei tre esiste nel
 * modello di dominio; restano a schermo, spenti, perché il disegno li prevede
 * e sparire non li renderebbe meno mancanti.
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
  const tModifica = useTranslations('app.impostazioni.modificaProfilo');
  const tCampi = useTranslations('app.onboarding');
  const tComune = useTranslations('comune');
  const tValidazione = useTranslations('validazione');
  const router = useRouter();

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
    // Salvato, si torna al profilo: il modulo ha finito il suo compito.
    onSuccess: () => router.push(percorsiApp.profilo()),
  });

  const nome = [profilo.nome, profilo.cognome].filter(Boolean).join(' ');

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2.5">
          <Button
            variante="contorno"
            onPress={() => router.push(percorsiApp.profilo())}
            className="h-10 rounded-xl px-4"
          >
            {tComune('annulla')}
          </Button>
          <Button
            type="submit"
            form="modifica-profilo"
            inCaricamento={salva.isPending}
            className="h-10 rounded-xl px-5"
          >
          {t('salva')}
        </Button>
      </div>

      {/* Al posto della foto ci sono le iniziali su un colore ricavato dal
          nome: non è un ripiego provvisorio, è quello che il prodotto usa
          ovunque. Il bottone resta spento perché non esiste un endpoint a cui
          mandare i byte. */}
      <Card padding="md" className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar nome={nome || '?'} dimensione={64} className="text-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold text-testo">{tModifica('foto')}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-testo-tenue">
            {tModifica('fotoTesto')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variante="contorno"
            size="sm"
            isDisabled
            onPress={gestoSospeso(SEGNAPOSTO_AVATAR)}
            iconaSinistra={<Icona nome="fotocamera" dimensione={16} />}
          >
            {tModifica('carica')}
          </Button>
          <Chip tono="ambra" dimensione="sm">
            {tComune('presto')}
          </Chip>
        </div>
      </Card>

      <Card padding="md" className="mb-6">
        <SectionLabel>{tModifica('datiPersonali')}</SectionLabel>

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
        </Form>

        <div className="mt-4">
          <Textarea
            etichetta={tModifica('bio')}
            aiuto={tModifica('bioTesto')}
            righe={3}
            disabilitato
            valore=""
            onChange={gestoSospeso(SEGNAPOSTO_BIO)}
          />
        </div>
      </Card>

      <Card padding="md" className="mb-6">
        <SectionLabel>{tModifica('studi')}</SectionLabel>
        <p className="mb-4 text-[12.5px] leading-relaxed text-testo-tenue">{t('testo')}</p>

        <SceltaCorso
          ateneoIniziale={profilo.universita}
          corsoIniziale={profilo.corso}
          onCorso={(corsoId) =>
            form.setValue('corsoId', corsoId, { shouldValidate: true, shouldDirty: true })
          }
          errore={form.formState.errors.corsoId?.message}
        />

        <div className="mt-4">
          <Input
            etichetta={tModifica('anno')}
            disabilitato
            valore=""
            onChange={gestoSospeso(SEGNAPOSTO_ANNO_CORSO)}
          />
        </div>
      </Card>

      <Card variante="tenue" padding="md" className="mb-6 flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid size-9 flex-none place-items-center rounded-xl bg-tinta-blu text-tinta-blu-testo"
        >
          <Icona nome="posta" dimensione={18} />
        </span>
        <p className="text-[12.5px] leading-relaxed text-testo-corpo">
          {tModifica('emailAltrove')}
        </p>
      </Card>

    </>
  );
}
