'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { keepPreviousData } from '@tanstack/react-query';
import { useElencaTuttiIPost } from '@prome/api-client';
import { QueryBoundary } from '@/components/feedback';
import { perLaScheda } from '../feed-bacheca';
import { PostBacheca } from '../post-bacheca';
import { PaginazioneAdmin } from './paginazione-admin';

const PER_PAGINA = 20;

/**
 * Every post, newest first, privacy ignored, drawn with the feed card. Its
 * comments link opens the normal detail page, which may 404 for a post the
 * admin could not see in the feed.
 */
export function PostAdmin() {
  const t = useTranslations('app.admin');
  const tComune = useTranslations('comune');
  const [pagina, setPagina] = useState(1);
  const post = useElencaTuttiIPost(
    { page: pagina, limit: PER_PAGINA },
    { query: { placeholderData: keepPreviousData } },
  );

  return (
    <QueryBoundary
      query={post}
      eVuoto={(risposta) => risposta.data.length === 0}
      vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('vuoto')}</p>}
    >
      {(risposta) => (
        <>
          <div className="flex flex-col gap-4">
            {risposta.data.map((riga) => (
              <PostBacheca key={riga.id} post={perLaScheda(riga, tComune('utenteRimosso'))} />
            ))}
          </div>
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
