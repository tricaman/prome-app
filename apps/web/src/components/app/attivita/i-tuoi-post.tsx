'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { elencaPost, getElencaPostQueryKey, type PostDto } from '@prome/api-client';
import { pesoLeggibile } from '@prome/app-core';
import type { PostDiBacheca } from '@/content';
import { Button } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { PostBacheca } from '../post-bacheca';

const PER_PAGINA = 20;

/**
 * I post che ho scritto.
 *
 * **È la bacheca con un filtro, non una pagina nuova**: stessa risorsa
 * (`?soloMiei=true`), stessa scheda, stesso modo di caricare le pagine. Un
 * endpoint dedicato avrebbe avuto la stessa forma e gli stessi difetti da
 * correggere due volte.
 *
 * Qui compaiono anche i post che le proprie impostazioni di privacy nascondono
 * a tutti gli altri: la visibilità dice chi vede le cose **altrui**, e nessuno
 * si nasconde le proprie.
 */
export function ITuoiPost() {
  const t = useTranslations('app.profilo');
  const tFeed = useTranslations('app.feed');
  const tComune = useTranslations('comune');

  const post = useInfiniteQuery({
    queryKey: getElencaPostQueryKey({ limit: PER_PAGINA, soloMiei: true }),
    queryFn: ({ pageParam }) => elencaPost({ page: pageParam, limit: PER_PAGINA, soloMiei: true }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => {
      const pagina = ultima.meta.pagination;
      if (!pagina || pagina.page >= pagina.totalPages) return undefined;
      return pagina.page + 1;
    },
  });

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-6 sm:px-8">
      <QueryBoundary
        query={post}
        eVuoto={(risposta) => risposta.pages.every((pagina) => pagina.data.length === 0)}
        vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('nessunPost')}</p>}
      >
        {(risposta) => (
          <div className="grid gap-4">
            {risposta.pages.flatMap((pagina) =>
              pagina.data.map((riga) => (
                <PostBacheca key={riga.id} post={perLaScheda(riga, tComune('utenteRimosso'))} />
              )),
            )}

            {post.hasNextPage ? (
              <Button
                variante="contorno"
                className="h-11 w-full rounded-2xl"
                inCaricamento={post.isFetchingNextPage}
                onPress={() => void post.fetchNextPage()}
              >
                {tFeed('caricaAltri')}
              </Button>
            ) : null}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

/** La stessa cucitura del feed: la scheda parla ancora la lingua del mockup. */
function perLaScheda(post: PostDto, utenteRimosso: string): PostDiBacheca {
  const autore = [post.autore.nome, post.autore.cognome].filter(Boolean).join(' ');
  const primoAllegato = post.allegati[0];

  return {
    id: post.id,
    autore: autore || utenteRimosso,
    contesto: new Date(post.creatoIl).toLocaleDateString(),
    corpo: post.testo,
    foto: post.autore.foto,
    allegato: primoAllegato
      ? { nome: primoAllegato.nome, dettaglio: pesoLeggibile(primoAllegato.dimensione) }
      : undefined,
    commenti: post.commenti,
  };
}
