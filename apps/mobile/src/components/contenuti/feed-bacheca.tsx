import { useInfiniteQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { pesoLeggibile } from '@prome/app-core';
import { elencaPost, getElencaPostQueryKey, type PostDto } from '@prome/api-client';
import type { PostDiBacheca } from '@prome/contenuti';
import { useT } from '@/hooks';
import { useTema } from '@/theme';
import { QueryBoundary } from '@/components/feedback';
import { Button } from '@/components/ui';
import { PostCard } from './post-card';

const PER_PAGINA = 20;

/**
 * La bacheca, dai dati veri.
 *
 * Ordine cronologico e nessun ranking: lo decide il server, e il client non
 * riordina. Attesa, errore e stato vuoto li gestisce il confine di query — qui
 * resta solo il caso «ci sono i post».
 *
 * **Le pagine si accumulano**, come sul web. Prima ne caricava una sola: il
 * ventunesimo post non esisteva per chi usava il telefono, e non c'era modo di
 * accorgersene — il feed finiva, e sembrava che non ci fosse altro.
 */
export function FeedBacheca() {
  const t = useT();

  const post = useInfiniteQuery({
    queryKey: getElencaPostQueryKey({ limit: PER_PAGINA }),
    queryFn: ({ pageParam }) => elencaPost({ page: pageParam, limit: PER_PAGINA }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => {
      // Quante pagine ci siano lo dice il server: il client non lo indovina
      // contando i risultati, che è il modo tipico di sbagliare l'ultima.
      const pagina = ultima.meta.pagination;
      if (!pagina || pagina.page >= pagina.totalPages) return undefined;
      return pagina.page + 1;
    },
  });

  return (
    <QueryBoundary
      query={post}
      eVuoto={(risposta) => risposta.pages.every((pagina) => pagina.data.length === 0)}
    >
      {(risposta) => (
        <>
          {risposta.pages.flatMap((pagina) =>
            pagina.data.map((riga) => (
              <PostCard key={riga.id} post={perLaScheda(riga, t('comune.utenteRimosso'))} />
            )),
          )}

          {post.hasNextPage ? (
            <AltriPost
              inCorso={post.isFetchingNextPage}
              etichetta={t('app.feed.caricaAltri')}
              onPress={() => void post.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </QueryBoundary>
  );
}

/**
 * Un bottone e non uno scorrimento infinito automatico.
 *
 * Sul telefono il caricamento a scatto d'occhio è più fragile — la lista sta
 * dentro uno `ScrollView` che non sa dire quanto manca alla fine — e un gesto
 * esplicito è anche più onesto: dice che c'è dell'altro, invece di lasciarlo
 * indovinare.
 */
function AltriPost({
  inCorso,
  etichetta,
  onPress,
}: {
  inCorso: boolean;
  etichetta: string;
  onPress: () => void;
}) {
  const tema = useTema();

  return (
    <View style={{ paddingVertical: tema.spaziatura[2] }}>
      <Button
        titolo={etichetta}
        variante="contorno"
        larghezzaPiena
        inCaricamento={inCorso}
        onPress={onPress}
      />
    </View>
  );
}

/**
 * Dalla forma dell'API a quella della scheda.
 *
 * Cucitura dichiarata, gemella di quella del web: la scheda nasce dal mockup e
 * parla ancora la lingua di allora, ma non porta più campi che il feed non
 * conosce — i commenti sono un aggregato a sé e si contano nel dettaglio.
 */
function perLaScheda(post: PostDto, utenteRimosso: string): PostDiBacheca {
  // Un autore senza nome è un account cancellato (contenuto anonimizzato) o in
  // corso di cancellazione: il contenuto resta, la persona no.
  const autore = [post.autore.nome, post.autore.cognome].filter(Boolean).join(' ');
  const primoAllegato = post.allegati[0];

  return {
    id: post.id,
    autore: autore || utenteRimosso,
    contesto: [post.autore.universita, quando(post.creatoIl)].filter(Boolean).join(' · '),
    corpo: post.testo,
    allegato: primoAllegato
      ? { nome: primoAllegato.nome, dettaglio: pesoLeggibile(primoAllegato.dimensione) }
      : undefined,
  };
}

/** «2 ore fa» invece di una data: in bacheca conta quanto è recente. */
function quando(iso: string): string {
  const minuti = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minuti < 1) return 'adesso';
  if (minuti < 60) return `${minuti} min fa`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  return `${Math.round(ore / 24)} g fa`;
}
