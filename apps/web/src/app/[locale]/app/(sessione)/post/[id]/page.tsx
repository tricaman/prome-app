import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BACHECA } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { Commenti } from '@/components/app/commenti';
import { RiquadroLaterale } from '@/components/contenuti';
import { TarghettaAllegato } from '@/components/contenuti';
import { Avatar, Button, Card, Chip, Icona } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

type Parametri = { locale: string; id: string };

export function generateStaticParams() {
  return BACHECA.map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const post = BACHECA.find((voce) => voce.id === id);
  if (!post) notFound();

  const t = await getTranslations({ locale: lingua, namespace: 'app.post' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.post(id),
    titolo: t('titolo', { autore: post.autore }),
    noIndex: true,
  });
}

/**
 * Dettaglio di un post dentro l'app.
 *
 * I post non hanno una versione pubblica: si leggono solo da dentro l'app,
 * perché anche un post con visibilità "Pubblico" è aperto agli studenti
 * iscritti, non al web.
 */
export default async function PaginaPostApp({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;
  const post = BACHECA.find((voce) => voce.id === id);
  if (!post) notFound();

  const t = await getTranslations('app.post');
  const correlati = BACHECA.filter((voce) => voce.id !== post.id);

  return (
    <>
      <AppTopbar
        titolo={
          <>
            <Link
              href={percorsiApp.bacheca()}
              aria-label={t('indietro')}
              className="grid size-10 flex-none place-items-center rounded-xl border border-bordo bg-superficie text-testo-corpo transition-colors hover:bg-superficie-alt"
            >
              <Icona nome="indietro" dimensione={19} />
            </Link>
            <span className="truncate text-[15px] font-extrabold">
              {t('titolo', { autore: post.autore })}
            </span>
          </>
        }
        azioni={
          <Button variante="contorno" className="h-10 rounded-xl px-4 text-[13.5px]">
            {t('condividi')}
          </Button>
        }
      />

      <div className="flex flex-1 justify-center gap-6 px-5 py-6 sm:px-8">
        <div className="w-full max-w-[700px] flex-none">
          <article className="rounded-[18px] border border-bordo bg-superficie p-6 sm:p-7">
            <header className="mb-4 flex flex-wrap items-center gap-3">
              <Avatar nome={post.autore} dimensione={46} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-testo">{post.autore}</p>
                <p className="mt-0.5 text-[12.5px] text-testo-didascalia">{post.contesto}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tag.map((tag) => (
                  <Chip key={tag} dimensione="md">
                    {tag}
                  </Chip>
                ))}
              </div>
            </header>

            <p className="mb-4 text-[16.5px] leading-[1.75] text-testo-corpo">{post.corpo}</p>

            {post.allegato ? (
              <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-bordo bg-superficie-alt p-4">
                <TarghettaAllegato tipo="pdf" className="h-[52px] w-11 text-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-testo">
                    {post.allegato.nome}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-testo-didascalia">
                    {post.allegato.dettaglio}
                  </span>
                </span>
                <span className="flex flex-none gap-2.5">
                  <Button variante="contorno" className="h-10 rounded-xl px-4 text-[13px]">
                    {t('anteprima')}
                  </Button>
                  <Button className="h-10 rounded-xl px-4 text-[13px]">{t('scarica')}</Button>
                </span>
              </div>
            ) : null}

            <footer className="mt-5 flex flex-wrap items-center gap-6 border-t border-superficie-alt-2 pt-4">
              <span className="flex items-center gap-2 text-[13.5px] font-extrabold text-testo-tenue">
                <Icona nome="commento" dimensione={19} />
                {t('commenti', { numero: post.commenti })}
              </span>
              <button
                type="button"
                className="flex items-center gap-2 text-[13.5px] font-extrabold text-testo-tenue hover:text-primario-collegamento"
              >
                <Icona nome="salva" dimensione={19} />
                {t('salvaMateriali')}
              </button>
            </footer>
          </article>

          <Commenti />
        </div>

        <aside className="hidden w-[300px] flex-none flex-col gap-4 xl:flex">
          <Card padding="sm" className="text-center">
            <Avatar nome={post.autore} dimensione={64} className="mx-auto mb-3 text-xl" />
            <p className="font-display text-[17px] font-extrabold">{post.autore}</p>
            <p className="mt-1 text-[12.5px] text-testo-didascalia">{post.contesto}</p>
          </Card>

          <RiquadroLaterale titolo={t('altriPost', { argomento: 'Analisi 2' })}>
            <ul className="flex flex-col gap-3.5">
              {correlati.map((voce) => (
                      <li key={voce.id}>
                        <Link href={percorsiApp.post(voce.id)} className="block">
                          <span className="block text-[13px] font-extrabold leading-snug text-testo">
                            {voce.corpo.slice(0, 60)}…
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-testo-didascalia">
                            {voce.autore} · {voce.commenti} commenti
                          </span>
                        </Link>
                      </li>
                    ))}
            </ul>
          </RiquadroLaterale>
        </aside>
      </div>
    </>
  );
}
