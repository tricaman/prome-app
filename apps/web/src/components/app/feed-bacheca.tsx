'use client';

import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import { elencaPost, getElencaPostQueryKey, type PostDto } from '@prome/api-client';
import type { PostDiBacheca } from '@/content';
import { useEffect, useRef } from 'react';
import { QueryBoundary } from '@/components/feedback';
import { Button } from '@/components/ui';
import { PostBacheca } from './post-bacheca';

/**
 * La bacheca, dai dati veri.
 *
 * Ordine cronologico e nessun ranking: è il server a deciderlo, e il client
 * non riordina nulla. Attesa, errore e stato vuoto li gestisce il confine di
 * query — qui resta solo il caso «ci sono i post».
 */
const PER_PAGINA = 20;

export function FeedBacheca() {
  const t = useTranslations('app.feed');
  const tComune = useTranslations('comune');

  /**
   * Le pagine si accumulano invece di sostituirsi: scendendo si continua a
   * leggere, e tornando indietro si ritrova dov'era. Il server dice quante
   * pagine ci sono, quindi il client non deve indovinare quando fermarsi.
   */
  const post = useInfiniteQuery({
    queryKey: getElencaPostQueryKey({ limit: PER_PAGINA }),
    queryFn: ({ pageParam }) => elencaPost({ page: pageParam, limit: PER_PAGINA }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => {
      const pagina = ultima.meta.pagination;
      if (!pagina || pagina.page >= pagina.totalPages) return undefined;
      return pagina.page + 1;
    },
  });

  return (
    <QueryBoundary
      query={post}
      eVuoto={(risposta) => risposta.pages.every((p) => p.data.length === 0)}
      vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('vuoto')}</p>}
    >
      {(risposta) => (
        <>
          {risposta.pages.flatMap((pagina) =>
            pagina.data.map((riga) => (
              <PostBacheca key={riga.id} post={perLaScheda(riga, tComune('utenteRimosso'))} />
            )),
          )}
          <SentinellaFine
            attiva={post.hasNextPage}
            inCorso={post.isFetchingNextPage}
            onVicino={() => void post.fetchNextPage()}
            etichetta={t('caricaAltri')}
          />
        </>
      )}
    </QueryBoundary>
  );
}

/**
 * Chiede la pagina successiva quando la fine del feed sta per comparire.
 *
 * Il bottone resta, e non è ridondante: l'osservatore non scatta per chi
 * naviga da tastiera o con uno screen reader, e senza il bottone quelle
 * persone non avrebbero alcun modo di andare avanti.
 */
function SentinellaFine({
  attiva,
  inCorso,
  onVicino,
  etichetta,
}: {
  attiva: boolean;
  inCorso: boolean;
  onVicino: () => void;
  etichetta: string;
}) {
  const ancora = useRef<HTMLDivElement>(null);
  const chiama = useRef(onVicino);

  // Il riferimento si aggiorna in un effetto e non durante il disegno: così
  // l'osservatore qui sotto vede sempre l'ultima funzione senza essere
  // ricreato a ogni ridisegno del feed.
  useEffect(() => {
    chiama.current = onVicino;
  });

  useEffect(() => {
    const elemento = ancora.current;
    if (!elemento || !attiva) return;

    const osservatore = new IntersectionObserver(
      ([voce]) => {
        if (voce?.isIntersecting) chiama.current();
      },
      // Si parte prima che la fine sia visibile: la pagina successiva arriva
      // mentre si sta ancora leggendo, invece che dopo un vuoto.
      { rootMargin: '600px' },
    );
    osservatore.observe(elemento);
    return () => osservatore.disconnect();
  }, [attiva]);

  if (!attiva) return null;

  return (
    <div ref={ancora} className="py-4 text-center">
      <Button variante="contorno" isDisabled={inCorso} inCaricamento={inCorso} onPress={onVicino}>
        {etichetta}
      </Button>
    </div>
  );
}

/**
 * Dalla forma dell'API a quella della scheda.
 *
 * È una cucitura temporanea e dichiarata: la scheda nasce dal mockup e parla
 * ancora la lingua dei dati dimostrativi (una riga di contesto già composta,
 * il numero di commenti). Quando arriveranno i commenti — che sono un
 * aggregato a sé, non un campo del post — la scheda leggerà direttamente la
 * risposta e questa funzione sparirà.
 */
function perLaScheda(post: PostDto, utenteRimosso: string): PostDiBacheca {
  // Un autore senza nome è un account cancellato (contenuto anonimizzato) o
  // in corso di cancellazione: il contenuto resta, la persona no.
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

/** «2 ore fa» invece di una data: in bacheca conta quanto è recente, non quando. */
function quando(iso: string): string {
  const minuti = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minuti < 1) return 'adesso';
  if (minuti < 60) return `${minuti} min fa`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  return `${Math.round(ore / 24)} g fa`;
}

function pesoLeggibile(byte: number): string {
  const mb = byte / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}
