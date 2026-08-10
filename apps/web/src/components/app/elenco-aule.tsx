'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AULE_IN_CORSO, AULE_PROGRAMMATE } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { AvatarGroup, Button, Card, Chip, Icona } from '@/components/ui';
import { FiltriChip } from './filtri-chip';
import { ModaleCreaAula } from './modale-crea-aula';

/**
 * Le aule studio della persona: prima quelle aperte adesso, poi quelle
 * programmate.
 *
 * L'ordine non è una preferenza estetica: un'aula in corso è un'azione
 * possibile subito, una programmata è solo un promemoria. Metterle insieme
 * costringerebbe a leggere lo stato di ognuna per capire cosa si può fare.
 */
export function ElencoAule() {
  const t = useTranslations('app.aule');
  const [creazioneAperta, setCreazioneAperta] = useState(false);

  const filtri = ['Tutte', 'Ora attive', 'Programmate', 'Del mio ateneo', 'Dei miei gruppi'];

  return (
    <>
      <div className="mx-auto w-full max-w-[1000px] px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <FiltriChip opzioni={filtri} etichetta={t('titolo')} className="flex-1" />
          <Button
            onPress={() => setCreazioneAperta(true)}
            className="h-[42px] rounded-[14px] px-5 text-sm"
            iconaSinistra={<Icona nome="piu" dimensione={17} />}
          >
            {t('crea')}
          </Button>
        </div>

        <SeparatoreSezione testo={t('inCorso', { numero: AULE_IN_CORSO.length })} />

        <div className="mb-7 grid gap-4 lg:grid-cols-2">
          {AULE_IN_CORSO.map((aula) => (
            <Card key={aula.id} padding="md" className="transition-colors hover:border-tinta-menta-bordo">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Chip tono="menta" indicatore pulsante>
                  {t('entra')}
                </Chip>
                <Chip>{aula.visibilita}</Chip>
                {aula.gruppo ? <Chip>{aula.gruppo}</Chip> : null}
              </div>

              <Link
                href={percorsiApp.aulaStudio(aula.id)}
                className="block font-display text-[19px] font-extrabold leading-snug tracking-[-0.02em] text-testo hover:text-primario-collegamento"
              >
                {aula.titolo}
              </Link>
              <p className="mt-1.5 text-[12.5px] text-testo-didascalia">{aula.contesto}</p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <AvatarGroup
                    nomi={['Giulia Ferrari', 'Luca Bianchi', 'Sara Conti']}
                    dimensione={28}
                  />
                  <span className="text-[12.5px] font-bold text-testo-tenue">
                    {aula.partecipanti}
                  </span>
                </span>
                <Link href={percorsiApp.aulaStudio(aula.id)}>
                  <Button className="h-9 px-5 text-[13px]">{t('entra')}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <SeparatoreSezione testo={t('programmate')} />

        <Card padding="nessuno" className="overflow-hidden">
          <ul>
            {AULE_PROGRAMMATE.map((aula, indice) => (
              <li
                key={aula.id}
                className={
                  indice < AULE_PROGRAMMATE.length - 1
                    ? 'border-b border-superficie-alt-2'
                    : undefined
                }
              >
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  {/* La data grande a sinistra: in un elenco di eventi è la
                      prima cosa che si cerca. */}
                  <span className="w-14 flex-none text-center">
                    <span className="block font-display text-xl font-extrabold text-testo">
                      {aula.giorno}
                    </span>
                    <span className="block text-[10.5px] font-extrabold tracking-wider text-testo-debole">
                      {aula.mese}
                    </span>
                  </span>
                  <span aria-hidden className="hidden h-9 w-px flex-none bg-bordo sm:block" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-extrabold text-testo">
                      {aula.titolo}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-testo-didascalia">
                      {aula.contesto}
                    </span>
                  </span>
                  <span className="flex-none text-[13px] font-extrabold text-testo-corpo">
                    {aula.ora}
                  </span>
                  <Button
                    variante="contorno"
                    className="h-9 flex-none border-tinta-menta-bordo bg-tinta-menta-velo px-4 text-[12.5px] text-primario-accento"
                  >
                    {t('avvisami')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {creazioneAperta ? <ModaleCreaAula onChiudi={() => setCreazioneAperta(false)} /> : null}
    </>
  );
}

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
