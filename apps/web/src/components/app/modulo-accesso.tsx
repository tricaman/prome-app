'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from '@/hooks';
import { Form, FormInput, FormSubmit } from '@/components/form';
import { Button, Heading } from '@/components/ui';
import { cn } from '@/lib/utils';

const LUNGHEZZA_CODICE = 6;

/**
 * Accesso a Prome.
 *
 * Un solo modo di entrare: si scrive l'email, arriva un codice, si entra. Non
 * c'è una password da scegliere né da dimenticare, e non c'è una registrazione
 * separata — chi arriva per la prima volta percorre queste stesse due caselle
 * e l'account nasce di conseguenza. È il motivo per cui la schermata non ha un
 * commutatore di metodo e non chiede «hai già un account?»: la domanda non ha
 * risposte diverse.
 *
 * I due passi stanno in una schermata sola, perché il secondo ha senso solo
 * subito dopo il primo e serve poter tornare all'email senza perdere il posto.
 */
export function ModuloAccesso() {
  const [emailInviata, setEmailInviata] = useState<string | null>(null);

  return (
    <div className="w-full max-w-[420px]">
      {emailInviata === null ? (
        <PassoEmail onInviato={setEmailInviata} />
      ) : (
        <PassoCodice email={emailInviata} onCambiaEmail={() => setEmailInviata(null)} />
      )}
    </div>
  );
}

/** Titolo e sommario del passo in corso: uno solo per volta, e sempre vero. */
function Intestazione({ titolo, sommario }: { titolo: string; sommario: string }) {
  return (
    <div className="mb-7">
      <Heading livello={1} taglia="xl">
        {titolo}
      </Heading>
      <p className="mt-2.5 text-[15.5px] leading-relaxed text-testo-tenue">{sommario}</p>
    </div>
  );
}

/** Primo passo: l'unica cosa che chiediamo per entrare. */
function PassoEmail({ onInviato }: { onInviato: (email: string) => void }) {
  const t = useTranslations('app.accesso');

  const form = useForm({
    schema: z.object({ email: z.email({ message: 'validation.INVALID_EMAIL' }) }),
    defaultValues: { email: '' },
  });

  return (
    <>
      <Intestazione titolo={t('titolo')} sommario={t('sommario')} />
      <Form form={form} onSubmit={(valori) => onInviato(valori.email)}>
        <FormInput
          name="email"
          tipo="email"
          etichetta={t('email')}
          segnaposto="nome.cognome@studenti.unibo.it"
          autoComplete="email"
          obbligatorio
        />

        <FormSubmit className="h-[50px] w-full justify-center text-[15.5px] shadow-marchio">
          {t('inviaCodice')}
        </FormSubmit>

        <p className="text-[13px] leading-relaxed text-testo-tenue">{t('primoAccesso')}</p>
      </Form>
    </>
  );
}

/** Secondo passo: il codice appena arrivato, con la via di uscita se l'email era sbagliata. */
function PassoCodice({ email, onCambiaEmail }: { email: string; onCambiaEmail: () => void }) {
  const t = useTranslations('app.accesso');

  return (
    <div className="flex flex-col gap-5">
      <Intestazione titolo={t('codiceTitolo')} sommario={t('codiceSommario', { email })} />

      <CampoCodice etichetta={t('codice')} aiuto={t('codiceAiuto')} />

      <Button className="h-[50px] w-full justify-center text-[15.5px] shadow-marchio">
        {t('entra')}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <button
          type="button"
          onClick={onCambiaEmail}
          className="font-bold text-primario-collegamento"
        >
          {t('cambiaEmail')}
        </button>
        <span className="text-testo-tenue">
          {t('nonArrivato')}{' '}
          <button type="button" className="font-bold text-primario-collegamento">
            {t('reinvia')}
          </button>
        </span>
      </div>
    </div>
  );
}

/**
 * Codice a sei cifre.
 *
 * Ogni cifra ha la sua casella e il fuoco avanza da solo: è l'unico modo per
 * inserirlo senza guardare la tastiera. Incollare il codice intero riempie
 * tutte le caselle, perché è così che arriva dalla mail.
 */
function CampoCodice({ etichetta, aiuto }: { etichetta: string; aiuto: string }) {
  const [cifre, setCifre] = useState<string[]>(Array<string>(LUNGHEZZA_CODICE).fill(''));
  const caselle = useRef<(HTMLInputElement | null)[]>([]);

  const scrivi = (indice: number, valore: string) => {
    const pulito = valore.replace(/\D/g, '');
    if (!pulito) {
      setCifre((precedenti) => precedenti.map((c, i) => (i === indice ? '' : c)));
      return;
    }

    setCifre((precedenti) => {
      const prossime = [...precedenti];
      // Incollando il codice intero si riempiono le caselle da qui in poi.
      for (let scorrimento = 0; scorrimento < pulito.length; scorrimento += 1) {
        const posizione = indice + scorrimento;
        if (posizione < LUNGHEZZA_CODICE) prossime[posizione] = pulito[scorrimento]!;
      }
      return prossime;
    });

    const prossimaVuota = Math.min(indice + pulito.length, LUNGHEZZA_CODICE - 1);
    caselle.current[prossimaVuota]?.focus();
  };

  const gestisciTasto = (indice: number, tasto: string) => {
    if (tasto === 'Backspace' && !cifre[indice] && indice > 0) {
      caselle.current[indice - 1]?.focus();
    }
  };

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[12.5px] font-extrabold text-testo-tenue">{etichetta}</legend>
      <div className="flex gap-2">
        {cifre.map((cifra, indice) => (
          <input
            key={indice}
            ref={(elemento) => {
              caselle.current[indice] = elemento;
            }}
            value={cifra}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus={indice === 0}
            aria-label={`${etichetta} — ${indice + 1}`}
            onChange={(evento) => scrivi(indice, evento.target.value)}
            onKeyDown={(evento) => gestisciTasto(indice, evento.key)}
            className={cn(
              'h-14 w-full rounded-[14px] border-2 bg-superficie text-center text-[22px] font-extrabold outline-none transition-colors',
              cifra ? 'border-tinta-menta-bordo' : 'border-bordo-forte',
              'focus:border-primary-500',
            )}
          />
        ))}
      </div>
      <p className="text-[12.5px] text-testo-didascalia">{aiuto}</p>
    </fieldset>
  );
}
