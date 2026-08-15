'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { pesoLeggibile } from '@prome/app-core';
import {
  eliminaPost,
  getElencaPostQueryKey,
  getLeggiPostQueryKey,
  modificaPost,
  useLeggiPost,
  type AllegatoDto,
  type PostDto,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_POST } from '@prome/contracts';
import { useApiMutation } from '@/hooks';
import { useRouter } from '@/i18n/navigazione';
import { percorsiApp } from '@/lib/percorsi-app';
import { Button } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { TarghettaAllegato } from '@/components/contenuti';
import { Avatar, Card, Heading, Icona } from '@/components/ui';
import { Commenti } from './commenti';

/**
 * Dettaglio di un post.
 *
 * Il post e la sua discussione sono due richieste, non una: i commenti sono un
 * aggregato autonomo, e chiederli insieme al post li farebbe sembrare un suo
 * campo — con la conseguenza pratica che ogni nuovo commento invaliderebbe
 * anche il post.
 */
export function DettaglioPost({ postId }: { postId: string }) {
  const t = useTranslations('app.post');
  const tComune = useTranslations('comune');
  const post = useLeggiPost(postId);

  return (
    <QueryBoundary query={post}>
      {({ data }) => {
        const autore =
          [data.autore.nome, data.autore.cognome].filter(Boolean).join(' ') ||
          tComune('utenteRimosso');

        return (
          <div className="flex flex-col gap-5">
            <Card padding="md">
              <div className="flex items-center gap-3">
                <Avatar nome={autore} dimensione={44} />
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-testo">{autore}</p>
                  <p className="text-[12.5px] text-testo-didascalia">
                    {[data.autore.universita, new Date(data.creatoIl).toLocaleString()]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>

              {data.puoModificare ? (
                <AzioniAutore post={data} />
              ) : (
                <p className="mt-4 whitespace-pre-wrap text-[16.5px] leading-[1.75] text-testo-corpo">
                  {data.testo}
                </p>
              )}

              {data.allegati.length ? (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {data.allegati.map((allegato) => (
                    <li key={allegato.id}>
                      <VisoreAllegato allegato={allegato} etichettaApri={t('scarica')} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            <Card padding="md">
              <div className="mb-4 flex items-baseline gap-2.5">
                <Heading taglia="xs">{t('titoloCommenti')}</Heading>
                <span className="text-xs text-testo-debole">{t('ordine')}</span>
              </div>
              <Commenti postId={postId} />
            </Card>
          </div>
        );
      }}
    </QueryBoundary>
  );
}

/**
 * Un allegato.
 *
 * Le immagini si vedono qui, il resto si apre: un PDF incorporato nella
 * pagina occuperebbe lo spazio della discussione senza essere leggibile, e chi
 * lo vuole leggere davvero lo apre comunque a schermo intero.
 */
function VisoreAllegato({
  allegato,
  etichettaApri,
}: {
  allegato: AllegatoDto;
  etichettaApri: string;
}) {
  if (allegato.tipo === 'IMMAGINE') {
    return (
      <a href={allegato.url} target="_blank" rel="noreferrer" className="block">
        {/* `img` e non `next/image`: l'immagine sta nell'archivio, dietro un
            indirizzo che cambia per ambiente, e ottimizzarla vorrebbe dire far
            passare dal server contenuti che il caricamento tiene apposta fuori.
            Le dimensioni non sono note in anticipo, quindi si vincola solo
            l'altezza massima invece di imporre un riquadro che taglia. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={allegato.url}
          alt={allegato.nome}
          className="max-h-[520px] w-full rounded-[14px] border border-bordo object-contain"
        />
      </a>
    );
  }

  return (
    <a
      href={allegato.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-[14px] border border-bordo bg-superficie-alt px-3.5 py-3 transition-colors hover:border-tinta-menta-bordo"
    >
      <TarghettaAllegato tipo={allegato.tipo === 'PDF' ? 'pdf' : 'testo'} className="h-[38px] w-[32px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-extrabold text-testo">{allegato.nome}</span>
        <span className="block text-xs text-testo-didascalia">
          {pesoLeggibile(allegato.dimensione)}
        </span>
      </span>
      <span className="flex flex-none items-center gap-1.5 text-[13px] font-bold text-primario-collegamento">
        <Icona nome="carica" dimensione={16} />
        {etichettaApri}
      </span>
    </a>
  );
}

/**
 * Il testo del post per il suo autore: si legge, e si può correggere sul posto.
 *
 * La modifica non apre un'altra pagina perché non è un'altra cosa: è lo stesso
 * testo, con il cursore dentro. Portare altrove per cambiare una parola fa
 * perdere il contesto della discussione che sta sotto.
 */
function AzioniAutore({ post }: { post: PostDto }) {
  const t = useTranslations('app.post');
  const router = useRouter();
  const [inModifica, setInModifica] = useState(false);
  const [bozza, setBozza] = useState(post.testo);

  const salva = useApiMutation({
    mutationFn: () => modificaPost(post.id, { testo: bozza }),
    invalida: [getLeggiPostQueryKey(post.id), getElencaPostQueryKey()],
    onSuccess: () => setInModifica(false),
  });

  const elimina = useApiMutation({
    mutationFn: () => eliminaPost(post.id),
    invalida: [getElencaPostQueryKey()],
    // Si torna alla bacheca: restare su un post che non esiste più mostrerebbe
    // un errore per una cosa andata a buon fine.
    onSuccess: () => router.replace(percorsiApp.bacheca()),
  });

  if (inModifica) {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <textarea
          autoFocus
          rows={6}
          value={bozza}
          maxLength={LUNGHEZZA_MASSIMA_POST}
          onChange={(evento) => setBozza(evento.target.value)}
          className="w-full resize-none rounded-[14px] border-2 border-bordo bg-superficie px-4 py-3 text-[15.5px] leading-relaxed outline-none focus:border-primary-500"
        />
        <div className="flex items-center gap-2.5">
          <Button
            isDisabled={!bozza.trim()}
            inCaricamento={salva.isPending}
            onPress={() => salva.mutate(undefined)}
          >
            {t('salva')}
          </Button>
          <Button
            variante="fantasma"
            onPress={() => {
              setBozza(post.testo);
              setInModifica(false);
            }}
          >
            {t('annulla')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 whitespace-pre-wrap text-[16.5px] leading-[1.75] text-testo-corpo">
        {post.testo}
      </p>
      <div className="mt-4 flex items-center gap-2.5 border-t border-superficie-alt-2 pt-3.5">
        <Button variante="fantasma" onPress={() => setInModifica(true)}>
          {t('modifica')}
        </Button>
        <Button
          variante="fantasma"
          className="text-errore"
          inCaricamento={elimina.isPending}
          onPress={() => elimina.mutate(undefined)}
        >
          {t('elimina')}
        </Button>
      </div>
    </>
  );
}
