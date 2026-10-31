'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { keepPreviousData } from '@tanstack/react-query';
import { useElencaSegnalazioniRicevute } from '@prome/api-client';
import { Card, Chip } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { PaginazioneAdmin } from './paginazione-admin';

const PER_PAGINA = 20;

/**
 * Reports, newest first, with the content as it is now. Ids are shown in full
 * because acting on a report still happens in the database.
 */
export function SegnalazioniAdmin() {
  const t = useTranslations('app.admin');
  const tMotivi = useTranslations('app.segnala.motivi');
  const tComune = useTranslations('comune');
  const formato = useFormatter();
  const [pagina, setPagina] = useState(1);
  const segnalazioni = useElencaSegnalazioniRicevute(
    { page: pagina, limit: PER_PAGINA },
    { query: { placeholderData: keepPreviousData } },
  );

  return (
    <QueryBoundary
      query={segnalazioni}
      eVuoto={(risposta) => risposta.data.length === 0}
      vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('vuoto')}</p>}
    >
      {(risposta) => (
        <>
          <ul className="flex flex-col gap-3">
            {risposta.data.map((segnalazione) => (
              <Card key={segnalazione.id} come="li" padding="md">
                <header className="flex flex-wrap items-center gap-2">
                  <Chip tono="rosa">{tMotivi(segnalazione.motivo)}</Chip>
                  <Chip tono="neutro">{t(`segnalazioni.tipo.${segnalazione.tipo}`)}</Chip>
                  <time
                    dateTime={segnalazione.creatoIl}
                    className="ml-auto text-xs text-testo-didascalia"
                  >
                    {formato.dateTime(new Date(segnalazione.creatoIl), 'conOra')}
                  </time>
                </header>

                {segnalazione.testo === null ? (
                  <p className="mt-3 text-sm italic text-testo-tenue">
                    {t('segnalazioni.eliminato')}
                  </p>
                ) : (
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-testo-corpo">
                    {segnalazione.testo}
                  </p>
                )}

                <dl className="mt-4 flex flex-col gap-1.5 border-t border-superficie-alt-2 pt-3 text-xs">
                  <Voce
                    termine={t('segnalazioni.autore')}
                    nome={segnalazione.autoreNome ?? tComune('utenteRimosso')}
                    id={segnalazione.autoreId}
                  />
                  <Voce
                    termine={t('segnalazioni.segnalante')}
                    nome={segnalazione.segnalanteNome ?? tComune('utenteRimosso')}
                    id={segnalazione.segnalanteId}
                  />
                  <Voce termine={t('segnalazioni.soggetto')} id={segnalazione.soggettoId} />
                </dl>
              </Card>
            ))}
          </ul>
          {risposta.meta.pagination ? (
            <PaginazioneAdmin
              pagina={risposta.meta.pagination.page}
              pagine={risposta.meta.pagination.totalPages}
              totale={risposta.meta.pagination.total}
              onCambia={setPagina}
            />
          ) : null}
        </>
      )}
    </QueryBoundary>
  );
}

function Voce({ termine, nome, id }: { termine: string; nome?: string; id: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <dt className="font-extrabold text-testo-tenue">{termine}</dt>
      <dd className="text-testo-corpo">
        {nome}
        {id ? <code className="ml-2 font-mono text-testo-didascalia select-all">{id}</code> : null}
      </dd>
    </div>
  );
}
