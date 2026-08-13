import { pesoLeggibile } from '@prome/app-core';
import { useElencaPost, type PostDto } from '@prome/api-client';
import type { PostDiBacheca } from '@prome/contenuti';
import { QueryBoundary } from '@/components/feedback';
import { PostCard } from './post-card';

/**
 * La bacheca, dai dati veri.
 *
 * Ordine cronologico e nessun ranking: lo decide il server, e il client non
 * riordina. Attesa, errore e stato vuoto li gestisce il confine di query — qui
 * resta solo il caso «ci sono i post».
 */
export function FeedBacheca() {
  const post = useElencaPost({ limit: 20 });

  return (
    <QueryBoundary query={post} eVuoto={(risposta) => risposta.data.length === 0}>
      {(risposta) =>
        risposta.data.map((riga) => <PostCard key={riga.id} post={perLaScheda(riga)} />)
      }
    </QueryBoundary>
  );
}

/**
 * Dalla forma dell'API a quella della scheda.
 *
 * Cucitura temporanea e dichiarata, gemella di quella del web: la scheda nasce
 * dal mockup e parla ancora la lingua dei dati dimostrativi. Quando arriveranno
 * i commenti — che sono un aggregato a sé, non un campo del post — la scheda
 * leggerà direttamente la risposta e questa funzione sparirà.
 */
function perLaScheda(post: PostDto): PostDiBacheca {
  const autore = [post.autore.nome, post.autore.cognome].filter(Boolean).join(' ');
  const primoAllegato = post.allegati[0];

  return {
    id: post.id,
    autore: autore || '—',
    contesto: [post.autore.universita, quando(post.creatoIl)].filter(Boolean).join(' · '),
    corpo: post.testo,
    tag: [],
    commenti: 0,
    allegato: primoAllegato
      ? { nome: primoAllegato.nome, dettaglio: pesoLeggibile(primoAllegato.dimensione) }
      : undefined,
  };
}

/** «2 h fa» invece di una data: in bacheca conta quanto è recente, non quando. */
function quando(iso: string): string {
  const minuti = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minuti < 1) return 'adesso';
  if (minuti < 60) return `${minuti} min fa`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  return `${Math.round(ore / 24)} g fa`;
}
