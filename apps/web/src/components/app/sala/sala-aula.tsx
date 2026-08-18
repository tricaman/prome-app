'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApriSalaAulaStudio, useLeggiMioProfilo, type SalaDto } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { Avatar, Chip, Icona } from '@/components/ui';
import { statusErrore } from '@prome/app-core';
import { ErrorState, QueryBoundary, RisorsaNonTrovata } from '@/components/feedback';
import { cn } from '@/lib/utils';
import { ChatAula } from './chat-aula';
import { MaterialiAula } from './materiali-aula';
import { TabellaPermessi } from './tabella-permessi';
import { BarraAudio } from './barra-audio';
import { InvitaInAula } from './invita-in-aula';
import { EsciDallAula, ImpostazioniAula } from './impostazioni-aula';

type Scheda = 'chat' | 'materiali' | 'partecipanti' | 'impostazioni';

/**
 * La sala di un'aula studio.
 *
 * Tutto ciò che serve per entrare arriva in **una sola risposta composta**:
 * partecipanti con i loro permessi, argomenti e materiali. Il client non
 * orchestra chiamate e non ricalcola permessi — li dichiara il server, e
 * tenerne una seconda copia qui significherebbe avere due risposte alla stessa
 * domanda, di cui una aggirabile.
 *
 * La chat è in tempo reale ma non dipende dal tempo reale: i messaggi sono
 * persistiti, e col trasporto spento la conversazione resta leggibile.
 */
export function SalaAula({ aulaId }: { aulaId: string }) {
  const t = useTranslations('app.sala');
  const tComune = useTranslations('comune');
  const [scheda, setScheda] = useState<Scheda>('chat');
  const sala = useApriSalaAulaStudio(aulaId);
  // Serve per sapere quale riga dei partecipanti sono io, e quindi per uscire.
  const io = useLeggiMioProfilo();

  return (
    <QueryBoundary query={sala}
      errore={(errore, riprova) =>
        statusErrore(errore) === 404 ? (
          <RisorsaNonTrovata />
        ) : (
          <ErrorState errore={errore} onRiprova={riprova} />
        )
      }
    >
      {({ data }) => (
        <>
          <Intestazione
            sala={data}
            scheda={scheda}
            onScheda={setScheda}
            etichette={{ indietro: tComune('indietro'), t }}
          />

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col border-r border-bordo">
              {scheda === 'chat' ? (
                <ChatAula aulaId={aulaId} puoScrivere={data.mieiPermessi.scrivere} />
              ) : null}
              {scheda === 'materiali' ? (
                <MaterialiAula
                  aulaId={aulaId}
                  argomenti={data.argomenti}
                  allegati={data.allegati}
                  puoCaricare={data.mieiPermessi.caricare}
                  sonoModeratore={data.sonoModeratore}
                />
              ) : null}
              {scheda === 'partecipanti' ? (
                <div className="flex-1 overflow-y-auto bg-sfondo px-6 py-5">
                  <TabellaPermessi
                    aulaId={aulaId}
                    partecipanti={data.partecipanti}
                    sonoModeratore={data.sonoModeratore}
                  />
                </div>
              ) : null}
              {scheda === 'impostazioni' ? (
                <div className="flex-1 overflow-y-auto bg-sfondo px-6 py-5">
                  {/* Le impostazioni le vede chi modera; l'uscita chiunque:
                      è la sola operazione che riguarda ogni partecipante. */}
                  {data.sonoModeratore ? <ImpostazioniAula aula={data.aula} /> : null}
                  {io.data ? (
                    <EsciDallAula aulaId={aulaId} utenteId={io.data.data.utenteId} />
                  ) : null}
                </div>
              ) : null}
            </div>

            <aside className="hidden w-[280px] flex-none flex-col gap-5 bg-superficie p-5 xl:flex">
              <BarraAudio aulaId={aulaId} puoParlare={data.mieiPermessi.parlare} />

              <section>
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
                  {t('schede.partecipanti')}
                </p>
                <ul className="flex flex-col gap-3">
                  {data.partecipanti.map((partecipante) => {
                    const nome =
                      [partecipante.nome, partecipante.cognome].filter(Boolean).join(' ') ||
                      tComune('utenteRimosso');
                    return (
                      <li key={partecipante.utenteId} className="flex items-center gap-2.5">
                        <Avatar nome={nome} dimensione={32} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-testo">
                          {nome}
                        </span>
                        <span className="flex-none text-[10px] font-extrabold uppercase text-testo-debole">
                          {partecipante.moderatore
                            ? t('ruoli.moderatore')
                            : partecipante.solaLettura
                              ? t('ruoli.solaLettura')
                              : t('ruoli.partecipante')}
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
      )}
    </QueryBoundary>
  );
}

function Intestazione({
  sala,
  scheda,
  onScheda,
  etichette,
}: {
  sala: SalaDto;
  scheda: Scheda;
  onScheda: (scheda: Scheda) => void;
  etichette: { indietro: string; t: ReturnType<typeof useTranslations<'app.sala'>> };
}) {
  const { t } = etichette;
  const schede: readonly { chiave: Scheda; conteggio: number | null }[] = [
    { chiave: 'chat', conteggio: null },
    { chiave: 'materiali', conteggio: sala.allegati.length },
    { chiave: 'partecipanti', conteggio: sala.partecipanti.length },
    { chiave: 'impostazioni', conteggio: null },
  ];

  return (
    <header className="flex-none border-b border-bordo bg-superficie px-5 pt-4 sm:px-7">
      <div className="flex items-start gap-3.5">
        <Link
          href={percorsiApp.auleStudio()}
          aria-label={etichette.indietro}
          className="mt-0.5 grid size-[38px] flex-none place-items-center rounded-xl border border-bordo bg-superficie text-testo-corpo transition-colors hover:bg-superficie-alt"
        >
          <Icona nome="indietro" dimensione={18} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[22px] font-extrabold tracking-[-0.025em]">
              {sala.aula.titolo}
            </h1>
            <Chip>
              {sala.aula.visibilita.charAt(0) + sala.aula.visibilita.slice(1).toLowerCase()}
            </Chip>
          </div>
          <p className="mt-1 text-[12.5px] text-testo-didascalia">
            {sala.aula.partecipanti === 1
              ? t('unPartecipante')
              : t('nPartecipanti', { numero: sala.aula.partecipanti })}
            {sala.aula.dataOraInizio
              ? ` · ${new Date(sala.aula.dataOraInizio).toLocaleString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        </div>

        {sala.sonoModeratore ? <InvitaInAula aulaId={sala.aula.id} /> : null}
      </div>

      <div role="tablist" aria-label={sala.aula.titolo} className="mt-4 flex gap-6 overflow-x-auto">
        {schede.map((voce) => {
          const attiva = voce.chiave === scheda;
          return (
            <button
              key={voce.chiave}
              type="button"
              role="tab"
              aria-selected={attiva}
              onClick={() => onScheda(voce.chiave)}
              className={cn(
                'flex flex-none items-center gap-2 border-b-[2.5px] pb-3 text-sm transition-colors',
                attiva
                  ? 'border-primary-500 font-extrabold text-primario-accento'
                  : 'border-transparent font-semibold text-testo-tenue hover:text-testo',
              )}
            >
              {t(`schede.${voce.chiave}`)}
              {voce.conteggio !== null ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-extrabold',
                    attiva
                      ? 'bg-tinta-menta text-primario-accento'
                      : 'bg-superficie-alt-2 text-testo-debole',
                  )}
                >
                  {voce.conteggio}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </header>
  );
}
