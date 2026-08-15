'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { completaMioProfilo, type CompletaProfiloDto } from '@prome/api-client';
import { ATENEI } from '@/content';
import { useApiMutation, useForm } from '@/hooks';
import { useRouter } from '@/i18n/navigazione';
import { percorsiApp } from '@/lib/percorsi-app';
import { Form, FormInput, FormSubmit } from '@/components/form';
import { Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

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

/**
 * Campo dell'ateneo: si scrive, e intanto compaiono i suggerimenti.
 *
 * Si completa da tastiera — ↑↓ per scorrere, Invio per scegliere — perché è il
 * campo con più opzioni del modulo e passare al mouse per un elenco di quattro
 * righe rompe la compilazione.
 */
function SceltaAteneo({
  etichetta,
  segnaposto,
  nessunRisultato,
  valore,
  onScelta,
}: {
  etichetta: string;
  segnaposto: string;
  nessunRisultato: string;
  valore: string;
  onScelta: (nome: string) => void;
}) {
  const [evidenziato, setEvidenziato] = useState(0);
  const [aperto, setAperto] = useState(false);

  const risultati = useMemo(() => {
    const termine = valore.trim().toLowerCase();
    const trovati = termine
      ? ATENEI.filter((ateneo) => ateneo.nome.toLowerCase().includes(termine))
      : ATENEI;
    return trovati.slice(0, 4);
  }, [valore]);

  // Chi ha già scritto il nome esatto ha finito: l'elenco sparisce invece di
  // restare aperto sopra il campo successivo.
  const gaScelto = risultati.length === 1 && risultati[0]?.nome === valore;

  const gestisciTasto = (tasto: string, previeni: () => void) => {
    if (tasto === 'ArrowDown') {
      previeni();
      setEvidenziato((corrente) => Math.min(corrente + 1, risultati.length - 1));
    } else if (tasto === 'ArrowUp') {
      previeni();
      setEvidenziato((corrente) => Math.max(corrente - 1, 0));
    } else if (tasto === 'Enter' && aperto && risultati[evidenziato]) {
      previeni();
      onScelta(risultati[evidenziato]!.nome);
      setAperto(false);
    }
  };

  return (
    // Gli eventi stanno sul contenitore e non sul campo: `FormInput` gestisce
    // da sé fuoco e uscita per la validazione, e sovrascriverli lì
    // spegnerebbe il comportamento del form.
    <div
      className="relative"
      onFocusCapture={() => setAperto(true)}
      // La chiusura è ritardata di poco: senza, il clic su un suggerimento
      // arriverebbe dopo che l'elenco è già sparito.
      onBlurCapture={() => window.setTimeout(() => setAperto(false), 120)}
      onKeyDown={(evento) => gestisciTasto(evento.key, () => evento.preventDefault())}
    >
      <FormInput
        name="universita"
        etichetta={etichetta}
        segnaposto={segnaposto}
        obbligatorio
      />

      {aperto && !gaScelto ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-bordo bg-superficie shadow-lg">
          {risultati.length ? (
            <ul>
              {risultati.map((ateneo, indice) => (
                <li key={ateneo.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      onScelta(ateneo.nome);
                      setAperto(false);
                    }}
                    onMouseEnter={() => setEvidenziato(indice)}
                    className={cn(
                      'flex w-full items-center gap-3.5 border-b border-superficie-alt-2 px-4 py-3 text-left transition-colors last:border-b-0',
                      indice === evidenziato ? 'bg-superficie-alt' : 'bg-superficie',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-9 flex-none place-items-center rounded-xl bg-tinta-menta text-xs font-extrabold text-primario-accento"
                    >
                      {ateneo.nomeBreve.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold text-testo">
                        {ateneo.nome}
                      </span>
                      <span className="block truncate text-xs text-testo-didascalia">
                        {ateneo.citta}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-testo-tenue">
              <Icona nome="cerca" dimensione={16} />
              {nessunRisultato}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
