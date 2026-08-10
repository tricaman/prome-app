'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PARTECIPANTI } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { Avatar, Button, Chip, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';
import { BarraAudio } from './barra-audio';
import { ChatAula } from './chat-aula';
import { MaterialiAula } from './materiali-aula';
import { TabellaPermessi } from './tabella-permessi';
import {
  eSolaLettura,
  permessiDi,
  permessiIniziali,
  type NomePermesso,
  type Permessi,
} from './permessi';

type Scheda = 'chat' | 'materiali' | 'partecipanti';

export interface SalaAulaProps {
  titolo: string;
  contesto: string;
  gruppo?: { nome: string; slug: string };
}

/**
 * La sala di un'aula studio: chat, materiali e partecipanti sotto lo stesso
 * tetto, con l'audio che continua qualunque scheda si stia guardando.
 *
 * I permessi vivono qui perché servono a due parti diverse — decidono cosa
 * può fare la persona nella chat e sono ciò che il Moderatore modifica nella
 * tabella — e tenerli in un punto solo evita che le due viste si contraddicano.
 */
export function SalaAula({ titolo, contesto, gruppo }: SalaAulaProps) {
  const t = useTranslations('app.sala');
  const tAula = useTranslations('pagine.aula');
  const tComune = useTranslations('comune');
  const [scheda, setScheda] = useState<Scheda>('chat');
  const [permessi, setPermessi] = useState<Record<string, Permessi>>(() =>
    permessiIniziali(PARTECIPANTI),
  );
  const [inAudio, setInAudio] = useState(false);
  const [microfonoSpento, setMicrofonoSpento] = useState(false);

  const io = PARTECIPANTI.find((partecipante) => partecipante.sonoIo);
  const mieiPermessi = io ? permessiDi(io, permessi) : undefined;

  const cambiaPermesso = (id: string, permesso: NomePermesso, attivo: boolean) => {
    setPermessi((precedenti) => ({
      ...precedenti,
      [id]: { ...(precedenti[id] ?? { parlare: true, scrivere: true, caricare: true }), [permesso]: attivo },
    }));
  };

  const inAudioOra = PARTECIPANTI.filter(
    (partecipante) => !partecipante.sonoIo && permessiDi(partecipante, permessi).parlare,
  ).slice(0, 4);

  const soloChat = PARTECIPANTI.filter((partecipante) => {
    const suoi = permessiDi(partecipante, permessi);
    return !suoi.parlare || partecipante.sonoIo;
  });

  const schede: readonly { chiave: Scheda; conteggio: number }[] = [
    { chiave: 'chat', conteggio: 126 },
    { chiave: 'materiali', conteggio: 6 },
    { chiave: 'partecipanti', conteggio: PARTECIPANTI.length },
  ];

  return (
    <>
      <header className="flex-none border-b border-bordo bg-superficie px-5 pt-4 sm:px-7">
        <div className="flex items-start gap-3.5">
          <Link
            href={percorsiApp.auleStudio()}
            aria-label={tComune('indietro')}
            className="mt-0.5 grid size-[38px] flex-none place-items-center rounded-xl border border-bordo bg-superficie text-testo-corpo transition-colors hover:bg-superficie-alt"
          >
            <Icona nome="indietro" dimensione={18} />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[22px] font-extrabold tracking-[-0.025em]">
                {titolo}
              </h1>
              <Chip tono="menta" indicatore pulsante>
                {tAula('inCorso')}
              </Chip>
              <Chip>Privato</Chip>
            </div>
            <p className="mt-1 text-[12.5px] text-testo-didascalia">
              {contesto}
              {gruppo ? (
                <>
                  {' · '}
                  {t('nelGruppo')}{' '}
                  <Link
                    href={percorsiApp.gruppo(gruppo.slug)}
                    className="font-bold text-primario-collegamento"
                  >
                    {gruppo.nome}
                  </Link>
                </>
              ) : null}
            </p>
          </div>

          <Button
            variante="contorno"
            className="hidden h-10 flex-none rounded-xl px-4 text-[13.5px] sm:flex"
            iconaSinistra={<Icona nome="condividi" dimensione={16} />}
          >
            {t('invita')}
          </Button>
        </div>

        <div role="tablist" aria-label={titolo} className="mt-4 flex gap-6 overflow-x-auto">
          {schede.map((voce) => {
            const attiva = voce.chiave === scheda;
            return (
              <button
                key={voce.chiave}
                type="button"
                role="tab"
                aria-selected={attiva}
                onClick={() => setScheda(voce.chiave)}
                className={cn(
                  'flex flex-none items-center gap-2 border-b-[2.5px] pb-3 text-sm transition-colors',
                  attiva
                    ? 'border-primary-500 font-extrabold text-primario-accento'
                    : 'border-transparent font-semibold text-testo-tenue hover:text-testo',
                )}
              >
                {t(`schede.${voce.chiave}`)}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-extrabold',
                    attiva ? 'bg-tinta-menta text-primario-accento' : 'bg-superficie-alt-2 text-testo-debole',
                  )}
                >
                  {voce.conteggio}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r border-bordo">
          {scheda === 'chat' ? <ChatAula puoScrivere={mieiPermessi?.scrivere ?? true} /> : null}
          {scheda === 'materiali' ? <MaterialiAula /> : null}
          {scheda === 'partecipanti' ? (
            <div className="flex-1 overflow-y-auto bg-sfondo px-6 py-5">
              <TabellaPermessi permessi={permessi} onCambia={cambiaPermesso} />
            </div>
          ) : null}

          <BarraAudio
            inAudio={inAudio}
            microfonoSpento={microfonoSpento}
            puoParlare={mieiPermessi?.parlare ?? true}
            personeInAudio={inAudioOra.map((partecipante) => partecipante.nome)}
            partecipantiTotali={PARTECIPANTI.length}
            onEntra={() => setInAudio(true)}
            onEsci={() => {
              setInAudio(false);
              setMicrofonoSpento(false);
            }}
            onAlternaMicrofono={() => setMicrofonoSpento((spento) => !spento)}
          />
        </div>

        <aside className="hidden w-[280px] flex-none flex-col gap-5 bg-superficie p-5 xl:flex">
          <section>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {t('inAudio', { numero: inAudioOra.length })}
            </p>
            <ul className="flex flex-col gap-3">
              {inAudioOra.map((partecipante, indice) => (
                <li key={partecipante.id} className="flex items-center gap-2.5">
                  <Avatar
                    nome={partecipante.nome}
                    dimensione={32}
                    className={indice === 0 ? 'ring-[2.5px] ring-primary-500' : undefined}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-testo">
                    {partecipante.nome}
                  </span>
                  <Icona nome="microfono" dimensione={15} className="text-primary-600" />
                </li>
              ))}
            </ul>
          </section>

          <span aria-hidden className="h-px bg-bordo" />

          <section>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {t('soloChat', { numero: soloChat.length })}
            </p>
            <ul className="flex flex-col gap-3">
              {soloChat.map((partecipante) => {
                const suoi = permessiDi(partecipante, permessi);
                return (
                  <li key={partecipante.id} className="flex items-center gap-2.5">
                    <Avatar nome={partecipante.nome} dimensione={32} className="opacity-75" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-testo-tenue">
                      {partecipante.nome}
                    </span>
                    <span className="flex-none text-[10px] font-extrabold uppercase text-testo-debole">
                      {partecipante.moderatore
                        ? 'MOD'
                        : eSolaLettura(suoi)
                          ? 'LEGGE'
                          : 'SCRIVE'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="mt-auto rounded-[14px] border border-bordo bg-superficie-alt p-3.5">
            <p className="mb-1.5 text-[12.5px] font-extrabold text-testo-corpo">
              {t('tuoiPermessi')}
            </p>
            <p className="text-[11.5px] leading-relaxed text-testo-tenue">
              {t('tuoiPermessiTesto')}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
