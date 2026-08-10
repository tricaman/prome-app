import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { eLinguaSupportata } from '@prome/i18n';
import { ateneiPiuAttivi, percorsi } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { creaMetadata } from '@/lib/seo';
import { Container, SiteShell } from '@/components/layout';
import { RichiamoMenta } from '@/components/contenuti';
import { AnteprimaAula } from '@/components/marketing/anteprima-aula';
import { ButtonLink, Card, Chip, Heading } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!eLinguaSupportata(locale)) notFound();
  return creaMetadata({ lingua: locale, percorso: '/' });
}

/**
 * Pagina iniziale.
 *
 * Ogni sezione risponde a una domanda del visitatore, nell'ordine in cui se le
 * pone: cosa fa, per chi, come funziona, come inizio.
 *
 * Non mostra contenuti degli utenti: nessuna aula studio, nessun post, nessun
 * profilo. Il prodotto si racconta, non si espone.
 */
export default async function PaginaHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!eLinguaSupportata(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const atenei = ateneiPiuAttivi(6);
  const funzioni = ['bacheca', 'aule', 'gruppi'] as const;
  const passi = ['apri', 'invita', 'studiate'] as const;

  return (
    <SiteShell sfondo="piena">
      <section className="relative overflow-hidden bg-gradient-to-b from-tinta-menta-velo to-superficie px-0 py-16 sm:py-20">
        {/* Alone del marchio: dà profondità senza un'immagine da caricare. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-64 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(50,224,196,.28),rgba(50,224,196,0)_68%)]"
        />
        <Container className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Chip tono="menta" dimensione="md" className="normal-case">
              {t('occhiello')}
            </Chip>
            <Heading livello={1} taglia="2xl" className="mt-5 text-[44px] sm:text-[60px]">
              {t('titolo')}
            </Heading>
            <p className="mt-5 max-w-[480px] text-lg leading-relaxed text-testo-tenue">
              {t('sommario')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink
                href={percorsiApp.accedi()}
                dimensione="lg"
                className="h-[52px] px-6 text-base shadow-marchio"
              >
                {t('ctaPrincipale')}
              </ButtonLink>
              <ButtonLink
                href={percorsi.chiSiamo()}
                variante="contorno"
                dimensione="lg"
                className="h-[52px] px-6 text-base"
              >
                {t('ctaSecondaria')}
              </ButtonLink>
            </div>
            <div className="mt-7 flex items-center gap-3.5">
              {/* Cerchi colorati, non persone: rappresentano una quantità di
                  studenti, e chiamarli con dei nomi lascerebbe credere che
                  siano profili veri mostrati sul sito. */}
              <span aria-hidden className="flex">
                {['bg-riempimento-1', 'bg-riempimento-2', 'bg-riempimento-3', 'bg-riempimento-4'].map(
                  (tinta, indice) => (
                    <span
                      key={tinta}
                      className={cn(
                        'size-8 rounded-full ring-[2.5px] ring-superficie',
                        tinta,
                        indice > 0 && '-ml-[11px]',
                      )}
                    />
                  ),
                )}
              </span>
              <p className="text-[13px] font-semibold text-testo-tenue">
                {t.rich('prova', {
                  forte: (parti) => <strong className="text-testo-corpo">{parti}</strong>,
                })}
              </p>
            </div>
          </div>
          <AnteprimaAula />
        </Container>
      </section>

      <section className="bg-superficie py-14">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-10 pb-11 opacity-50">
            {atenei.map((ateneo) => (
              <Link
                key={ateneo.slug}
                href={percorsi.ateneo(ateneo.slug)}
                className="font-display text-[15px] font-extrabold tracking-tight text-testo-tenue"
              >
                {ateneo.nomeBreve}
              </Link>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {funzioni.map((chiave) => (
              <Card key={chiave} padding="lg">
                <div className="mb-4 grid size-[46px] place-items-center rounded-[14px] bg-tinta-menta text-primario-accento">
                  <IconaFunzione chiave={chiave} />
                </div>
                <Heading taglia="sm">{t(`funzioni.${chiave}.titolo`)}</Heading>
                <p className="mt-2.5 text-sm leading-relaxed text-testo-tenue">
                  {t(`funzioni.${chiave}.testo`)}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/*
        Qui il disegno mostrava le aule studio aperte in quel momento. Non si
        può: un'aula "pubblica" è aperta agli studenti iscritti, non al web, e
        pubblicarne titoli e partecipanti significherebbe esporre contenuti
        degli utenti a chi non ha un account. Al loro posto spieghiamo come
        funziona un'aula studio — che è anche il modo per dire, in chiaro, chi
        può entrarci.
      */}
      <section className="border-t border-bordo bg-superficie-alt py-14">
        <Container>
          <div className="mb-6 max-w-[640px]">
            <Heading taglia="xl">{t('comeFunziona.titolo')}</Heading>
            <p className="mt-2 text-[15px] text-testo-tenue">{t('comeFunziona.sommario')}</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {passi.map((passo, indice) => (
              <li key={passo}>
                <Card padding="lg" className="h-full">
                  <span
                    aria-hidden
                    className="mb-4 grid size-9 place-items-center rounded-xl bg-tinta-menta font-display text-base font-extrabold text-primario-accento"
                  >
                    {indice + 1}
                  </span>
                  <Heading taglia="sm">{t(`comeFunziona.passi.${passo}.titolo`)}</Heading>
                  <p className="mt-2.5 text-sm leading-relaxed text-testo-tenue">
                    {t(`comeFunziona.passi.${passo}.testo`)}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-superficie py-16">
        <Container>
          <RichiamoMenta
            titolo={t.rich('chiusura.titolo', {
              accento: (parti) => <span className="text-primario-collegamento">{parti}</span>,
            })}
            testo={t('chiusura.testo')}
            azioni={
              <>
                <ButtonLink
                  href={percorsiApp.accedi()}
                  variante="secondaria"
                  dimensione="lg"
                  className="h-[52px] bg-superficie-inversa px-6 text-base text-superficie-inversa-testo"
                >
                  {t('ctaPrincipale')}
                </ButtonLink>
                <ButtonLink
                  href={percorsi.chiSiamo()}
                  variante="contorno"
                  dimensione="lg"
                  className="h-[52px] border-primary-300 bg-superficie/70 px-6 text-base text-primario-accento"
                >
                  {t('ctaSecondaria')}
                </ButtonLink>
              </>
            }
          />
        </Container>
      </section>
    </SiteShell>
  );
}

/** Icone delle tre funzioni: tratti semplici, nessuna libreria da caricare. */
function IconaFunzione({ chiave }: { chiave: 'bacheca' | 'aule' | 'gruppi' }) {
  const tracciati = {
    bacheca: 'M3 4.5h18v15H3zM7 9h6M7 13h10',
    aule: 'M9 2.5h6v11H9zM5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5',
    gruppi:
      'M9 8.5a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8M3.5 20.5c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5M16 5.6a3.2 3.2 0 010 6',
  } as const;

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={tracciati[chiave]} />
    </svg>
  );
}
