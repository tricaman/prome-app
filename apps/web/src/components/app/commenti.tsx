'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  commentaPost,
  eliminaCommento,
  getElencaCommentiQueryKey,
  useElencaCommenti,
  type CommentoDto,
  getElencaPostQueryKey,
  useLeggiMioProfilo,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_COMMENTO } from '@prome/contracts';
import { useApiMutation } from '@/hooks';
import { SegnalaEBlocca } from './segnala-e-blocca';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Icona } from '@/components/ui';

/**
 * La discussione sotto un post.
 *
 * I commenti sono un aggregato a sé, non un campo del post: si leggono con la
 * loro richiesta e si scrivono con la loro, e il post non viene riscritto ogni
 * volta che qualcuno risponde. Si leggono dal più vecchio, perché una
 * discussione ha un ordine.
 */
export function Commenti({ postId }: { postId: string }) {
  const t = useTranslations('app.post');
  const commenti = useElencaCommenti(postId, { limit: 50 });
  const chiave = getElencaCommentiQueryKey(postId, { limit: 50 });

  return (
    <section className="flex flex-col gap-4">
      <QueryBoundary
        query={commenti}
        eVuoto={(risposta) => risposta.data.length === 0}
        vuoto={<p className="text-sm text-testo-tenue">{t('nessunCommento')}</p>}
      >
        {(risposta) => (
          <ul className="flex flex-col gap-3">
            {risposta.data.map((commento) => (
              <li key={commento.id}>
                <RigaCommento commento={commento} chiaveElenco={chiave} />
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <ModuloCommento postId={postId} chiaveElenco={chiave} />
    </section>
  );
}

function RigaCommento({
  commento,
  chiaveElenco,
}: {
  commento: CommentoDto;
  chiaveElenco: readonly unknown[];
}) {
  const t = useTranslations('app.post');
  const tComune = useTranslations('comune');
  const profilo = useLeggiMioProfilo();
  const autore =
    [commento.autore.nome, commento.autore.cognome].filter(Boolean).join(' ') ||
    tComune('utenteRimosso');

  const elimina = useApiMutation({
    mutationFn: () => eliminaCommento(commento.id),
    invalida: [chiaveElenco as never],
  });

  // «Segnala» compare sui commenti degli ALTRI, non dove manca il permesso di
  // eliminare: `puoEliminare` è vero anche per il proprietario del post sui
  // commenti altrui — che è esattamente chi deve potersi difendere da un
  // commento molesto sotto casa propria. X e «Segnala» convivono.
  const mio = profilo.data?.data.utenteId === commento.autore.utenteId;
  const segnalabile = !mio && !commento.autore.rimosso;

  return (
    <div className="flex items-start gap-3">
      <Avatar nome={autore} dimensione={34} />
      <div className="min-w-0 flex-1 rounded-[16px] border border-bordo bg-superficie-alt px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-extrabold text-testo">{autore}</span>
          <span className="ml-auto flex items-center gap-2.5">
            {segnalabile ? (
              <SegnalaEBlocca
                tipo="COMMENTO"
                soggettoId={commento.id}
                autore={{ utenteId: commento.autore.utenteId, nome: autore }}
                // Bloccato l'autore del commento, spariscono i suoi commenti
                // QUI e i suoi post dal feed: si invalidano entrambi.
                invalidaAlBlocco={[chiaveElenco, getElencaPostQueryKey()]}
              />
            ) : null}
            {/* Il permesso arriva dal server: ricalcolarlo qui vorrebbe dire
                tenere due copie della stessa regola, e questa sarebbe aggirabile. */}
            {commento.puoEliminare ? (
              <button
                type="button"
                onClick={() => elimina.mutate(undefined)}
                disabled={elimina.isPending}
                aria-label={t('eliminaCommento')}
                className="text-testo-debole transition-colors hover:text-errore"
              >
                <Icona nome="chiudi" dimensione={14} />
              </button>
            ) : null}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-testo-corpo">
          {commento.testo}
        </p>
      </div>
    </div>
  );
}

function ModuloCommento({
  postId,
  chiaveElenco,
}: {
  postId: string;
  chiaveElenco: readonly unknown[];
}) {
  const t = useTranslations('app.post');
  const [testo, setTesto] = useState('');

  const invia = useApiMutation({
    mutationFn: () => commentaPost(postId, { testo }),
    invalida: [chiaveElenco as never],
    onSuccess: () => setTesto(''),
  });

  return (
    <div className="flex items-end gap-2.5">
      <textarea
        rows={2}
        value={testo}
        maxLength={LUNGHEZZA_MASSIMA_COMMENTO}
        onChange={(evento) => setTesto(evento.target.value)}
        placeholder={t('scriviCommento')}
        className="flex-1 resize-none rounded-[14px] border-2 border-bordo bg-superficie px-4 py-2.5 text-[14px] outline-none focus:border-primary-500"
      />
      <Button
        className="h-[46px] rounded-[14px] px-5"
        isDisabled={!testo.trim()}
        inCaricamento={invia.isPending}
        onPress={() => invia.mutate(undefined)}
      >
        {t('invia')}
      </Button>
    </div>
  );
}
