'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { keepPreviousData } from '@tanstack/react-query';
import { useElencaUtentiRegistrati } from '@prome/api-client';
import { Chip, Elenco, RigaElenco } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { PaginazioneAdmin } from './paginazione-admin';

const PER_PAGINA = 50;

/** Registered users, newest first, with the state worth a second look. */
export function UtentiAdmin() {
  const t = useTranslations('app.admin');
  const formato = useFormatter();
  const [pagina, setPagina] = useState(1);
  const utenti = useElencaUtentiRegistrati(
    { page: pagina, limit: PER_PAGINA },
    { query: { placeholderData: keepPreviousData } },
  );

  return (
    <QueryBoundary
      query={utenti}
      eVuoto={(risposta) => risposta.data.length === 0}
      vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('vuoto')}</p>}
    >
      {(risposta) => (
        <>
          <Elenco>
            {risposta.data.map((utente) => (
              <RigaElenco
                key={utente.utenteId}
                etichetta={
                  [utente.nome, utente.cognome].filter(Boolean).join(' ') || t('utenti.senzaNome')
                }
                sottotitolo={[utente.email, utente.corso, utente.universita]
                  .filter(Boolean)
                  .join(' · ')}
                coda={
                  <span className="flex flex-none items-center gap-2">
                    {utente.inCancellazioneDal ? (
                      <Chip tono="rosa">{t('utenti.inCancellazione')}</Chip>
                    ) : !utente.onboardingCompletato ? (
                      <Chip tono="ambra">{t('utenti.onboarding')}</Chip>
                    ) : null}
                    <time dateTime={utente.registratoIl} className="text-xs text-testo-tenue">
                      {formato.dateTime(new Date(utente.registratoIl), 'breve')}
                    </time>
                  </span>
                }
              />
            ))}
          </Elenco>
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
