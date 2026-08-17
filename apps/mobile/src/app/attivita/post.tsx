import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { elencaPost, getElencaPostQueryKey } from '@prome/api-client';
import { pesoLeggibile } from '@prome/app-core';
import type { PostDiBacheca } from '@prome/contenuti';
import type { PostDto } from '@prome/api-client';
import { View } from 'react-native';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { PostCard } from '@/components/contenuti';
import { FoglioCommenti } from '@/components/app/foglio-commenti';
import { Button, Intestazione, Screen, Text } from '@/components/ui';

const PER_PAGINA = 20;

/**
 * I post che ho scritto.
 *
 * **È la bacheca con un filtro, non una schermata nuova**: stessa risorsa,
 * stessa scheda, stesso foglio dei commenti. `?soloMiei=true` toglie una
 * condizione al server invece di aggiungere un endpoint che avrebbe la stessa
 * forma, la stessa paginazione e gli stessi difetti da correggere due volte.
 *
 * Qui compaiono anche i post che le proprie impostazioni di privacy nascondono
 * a tutti gli altri: la visibilità dice chi vede le cose **altrui**, e nessuno
 * si nasconde le proprie.
 */
export default function SchermataMieiPost() {
  const tema = useTema();
  const t = useT();
  const [commentiDi, setCommentiDi] = useState<string | undefined>(undefined);

  const post = useInfiniteQuery({
    queryKey: getElencaPostQueryKey({ limit: PER_PAGINA, soloMiei: true }),
    queryFn: ({ pageParam }) =>
      elencaPost({ page: pageParam, limit: PER_PAGINA, soloMiei: true }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => {
      const pagina = ultima.meta.pagination;
      if (!pagina || pagina.page >= pagina.totalPages) return undefined;
      return pagina.page + 1;
    },
  });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.profilo.tuoiPost')} />

      <Screen scorrevole conAreaSicura={false}>
        <QueryBoundary
          query={post}
          eVuoto={(risposta) => risposta.pages.every((pagina) => pagina.data.length === 0)}
          vuoto={<Text variante="corpoTenue">{t('app.profilo.nessunPost')}</Text>}
        >
          {(risposta) => (
            <View style={{ gap: tema.spaziatura[3] }}>
              {risposta.pages.flatMap((pagina) =>
                pagina.data.map((riga) => (
                  <PostCard
                    key={riga.id}
                    post={perLaScheda(riga, t('comune.utenteRimosso'))}
                    onCommenti={() => setCommentiDi(riga.id)}
                  />
                )),
              )}

              {post.hasNextPage ? (
                <Button
                  titolo={t('app.feed.caricaAltri')}
                  variante="contorno"
                  larghezzaPiena
                  inCaricamento={post.isFetchingNextPage}
                  onPress={() => void post.fetchNextPage()}
                />
              ) : null}
            </View>
          )}
        </QueryBoundary>
      </Screen>

      <FoglioCommenti postId={commentiDi} onChiudi={() => setCommentiDi(undefined)} />
    </>
  );
}

/** La stessa cucitura del feed: la scheda parla la lingua del mockup. */
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
