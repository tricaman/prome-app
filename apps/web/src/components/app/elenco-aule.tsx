'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useElencaAuleStudio, type AulaStudioDto } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { Button, Card, Chip, Icona } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { ModaleCreaAula } from './modale-crea-aula';

/**
 * Le aule studio della persona: prima quelle aperte adesso, poi quelle
 * programmate.
 *
 * La distinzione **non viene dal server**, che non ha alcuno stato di ciclo di
 * vita sull'aula: è derivata qui dalla sola presenza di una data di inizio
 * futura. Un'aula la cui data è passata torna fra quelle sempre aperte, perché
 * la data non apre né chiude nulla — il materiale sopravvive all'incontro.
 */
export function ElencoAule() {
  const t = useTranslations('app.aule');
  const [creazioneAperta, setCreazioneAperta] = useState(false);
  const aule = useElencaAuleStudio({ limit: 50 });

  return (
    <>
      <div className="mx-auto w-full max-w-[1000px] px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
          <Button
            onPress={() => setCreazioneAperta(true)}
            className="h-[42px] rounded-[14px] px-5 text-sm"
            iconaSinistra={<Icona nome="piu" dimensione={17} />}
          >
            {t('crea')}
          </Button>
        </div>

        <QueryBoundary
          query={aule}
          eVuoto={(risposta) => risposta.data.length === 0}
          vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('nessuna')}</p>}
        >
          {(risposta) => {
            const programmate = risposta.data.filter(eProgrammata);
            const aperte = risposta.data.filter((aula) => !eProgrammata(aula));

            return (
              <>
                <SeparatoreSezione testo={t('inCorso', { numero: aperte.length })} />

                <div className="mb-7 grid gap-4 lg:grid-cols-2">
                  {aperte.map((aula) => (
                    <SchedaAula key={aula.id} aula={aula} etichettaEntra={t('entra')} />
                  ))}
                </div>

                {programmate.length ? (
                  <>
                    <SeparatoreSezione testo={t('programmate')} />
                    <Card padding="nessuno" className="overflow-hidden">
                      <ul>
                        {programmate.map((aula, indice) => (
                          <li
                            key={aula.id}
                            className={
                              indice < programmate.length - 1
                                ? 'border-b border-superficie-alt-2'
                                : undefined
                            }
                          >
                            <RigaProgrammata aula={aula} />
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </>
                ) : null}
              </>
            );
          }}
        </QueryBoundary>
      </div>

      {creazioneAperta ? <ModaleCreaAula onChiudi={() => setCreazioneAperta(false)} /> : null}
    </>
  );
}

/** Programmata = ha una data, e quella data non è ancora passata. */
function eProgrammata(aula: AulaStudioDto): boolean {
  return Boolean(aula.dataOraInizio) && new Date(aula.dataOraInizio!).getTime() > Date.now();
}

function SchedaAula({ aula, etichettaEntra }: { aula: AulaStudioDto; etichettaEntra: string }) {
  return (
    <Card padding="md" className="transition-colors hover:border-tinta-menta-bordo">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip tono="menta" indicatore pulsante>
          {etichettaEntra}
        </Chip>
        <Chip>{visibilitaLeggibile(aula.visibilita)}</Chip>
        {aula.ateneo ? <Chip>{aula.ateneo}</Chip> : null}
      </div>

      <Link
        href={percorsiApp.aulaStudio(aula.id)}
        className="block font-display text-[19px] font-extrabold leading-snug tracking-[-0.02em] text-testo hover:text-primario-collegamento"
      >
        {aula.titolo}
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-bold text-testo-tenue">
          {aula.partecipanti === 1 ? '1 partecipante' : `${aula.partecipanti} partecipanti`}
        </span>
        <Link href={percorsiApp.aulaStudio(aula.id)}>
          <Button className="h-9 px-5 text-[13px]">{etichettaEntra}</Button>
        </Link>
      </div>
    </Card>
  );
}

function RigaProgrammata({ aula }: { aula: AulaStudioDto }) {
  const quando = new Date(aula.dataOraInizio!);
  return (
    <Link
      href={percorsiApp.aulaStudio(aula.id)}
      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-superficie-alt"
    >
      {/* La data grande a sinistra: in un elenco di incontri è la prima cosa
          che si cerca. */}
      <span className="w-14 flex-none text-center">
        <span className="block font-display text-xl font-extrabold text-testo">
          {quando.getDate()}
        </span>
        <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-testo-debole">
          {quando.toLocaleDateString('it-IT', { month: 'short' })}
        </span>
      </span>
      <span aria-hidden className="hidden h-9 w-px flex-none bg-bordo sm:block" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-extrabold text-testo">{aula.titolo}</span>
        <span className="mt-0.5 block text-[12.5px] text-testo-didascalia">
          {visibilitaLeggibile(aula.visibilita)}
        </span>
      </span>
      <span className="flex-none text-[13px] font-extrabold text-testo-corpo">
        {quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </Link>
  );
}

const visibilitaLeggibile = (visibilita: string) =>
  visibilita.charAt(0) + visibilita.slice(1).toLowerCase();

function SeparatoreSezione({ testo }: { testo: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
        {testo}
      </span>
      <span aria-hidden className="h-px flex-1 bg-bordo" />
    </div>
  );
}
