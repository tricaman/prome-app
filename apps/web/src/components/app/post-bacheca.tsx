'use client';

import { useTranslations } from 'next-intl';
import type { PostDiBacheca } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { Avatar, Card, Chip, Icona } from '@/components/ui';
import { TarghettaAllegato } from '@/components/contenuti';

/**
 * Post nella bacheca.
 *
 * Le tre azioni in fondo sono commentare, salvare e condividere: non c'è un
 * "mi piace", perché il motto del prodotto è tradotto in una regola precisa —
 * niente classifiche, niente approvazione sociale, solo cose che servono a
 * ritrovare un contenuto o a passarlo a qualcuno.
 */
export function PostBacheca({ post }: { post: PostDiBacheca }) {
  const t = useTranslations('app.feed');

  return (
    <Card come="article" padding="md">
      <header className="flex items-center gap-3">
        <Avatar nome={post.autore} dimensione={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-extrabold text-testo">{post.autore}</p>
          <p className="mt-0.5 truncate text-xs text-testo-didascalia">{post.contesto}</p>
        </div>
        <button
          type="button"
          aria-label="Altre azioni"
          className="px-1 text-base font-extrabold text-testo-debole"
        >
          ···
        </button>
      </header>

      <p className="mt-3.5 text-[15.5px] leading-[1.7] text-testo-corpo">{post.corpo}</p>

      {post.tag.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tag.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      ) : null}

      {post.allegato ? (
        <div className="mt-3.5 flex items-center gap-3 rounded-[14px] border border-bordo bg-superficie-alt px-4 py-3.5">
          <TarghettaAllegato tipo="pdf" className="h-11 w-[38px] text-[9px]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-extrabold text-testo">
              {post.allegato.nome}
            </span>
            <span className="mt-0.5 block text-[11.5px] text-testo-didascalia">
              {post.allegato.dettaglio}
            </span>
          </span>
          <Chip tono="menta" dimensione="md" className="normal-case">
            {t('apri')}
          </Chip>
        </div>
      ) : null}

      {post.immagini ? (
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {Array.from({ length: post.immagini }).map((_, indice) => (
            <span
              key={indice}
              aria-hidden
              className="block h-[150px] rounded-[14px] bg-gradient-to-br from-segnaposto to-segnaposto-fondo"
            />
          ))}
        </div>
      ) : null}

      <footer className="mt-4 flex items-center gap-6 border-t border-superficie-alt-2 pt-3.5">
        <Link
          href={percorsiApp.post(post.id)}
          className="flex items-center gap-2 text-[13px] font-extrabold text-testo-tenue hover:text-primario-collegamento"
        >
          <Icona nome="commento" dimensione={19} />
          {t('commenti', { numero: post.commenti })}
        </Link>
        <button
          type="button"
          className="flex items-center gap-2 text-[13px] font-extrabold text-testo-tenue hover:text-primario-collegamento"
        >
          <Icona nome="salva" dimensione={19} />
          {t('salva')}
        </button>
        <button
          type="button"
          className="ml-auto flex items-center gap-2 text-[13px] font-extrabold text-testo-tenue hover:text-primario-collegamento"
        >
          <Icona nome="condividi" dimensione={19} />
          {t('condividi')}
        </button>
      </footer>
    </Card>
  );
}
