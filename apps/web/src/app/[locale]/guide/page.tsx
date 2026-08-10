import { getTranslations } from 'next-intl/server';
import { GUIDE, guidaInEvidenza, guideSecondarie, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole, raccolta } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { TestataPagina } from '@/components/contenuti';
import { Avatar, Card, Chip } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.guide' });
  return creaMetadata({
    lingua,
    percorso: percorsi.guide(),
    titolo: t('titolo'),
    descrizione: t('sommario'),
  });
}

/**
 * Indice delle guide.
 *
 * Intercetta le ricerche informative che precedono il bisogno del prodotto.
 * La regola redazionale è una sola: ogni guida deve poter finire con un
 * rimando naturale a un'aula studio o a un argomento reale.
 */
export default async function PaginaGuide({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.guide');
  const tSito = await getTranslations('sito');

  const evidenza = guidaInEvidenza();
  const altre = guideSecondarie();

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: t('titolo') },
  ];

  return (
    <SiteShell>
      <StructuredData
        lingua={lingua}
        oggetti={[
          briciole(lingua, voci),
          raccolta(
            lingua,
            percorsi.guide(),
            t('titolo'),
            t('sommario'),
            GUIDE.map((guida) => ({ nome: guida.titolo, percorso: percorsi.guida(guida.slug) })),
          ),
        ]}
      />

      <TestataPagina briciole={voci} titolo={t('titolo')} sommario={t('sommario')} />

      <Container className="py-7">
        {evidenza ? (
          <Link
            href={percorsi.guida(evidenza.slug)}
            className="mb-6 grid overflow-hidden rounded-[20px] border border-bordo bg-superficie transition-colors hover:border-tinta-menta-bordo lg:grid-cols-[1.1fr_1fr]"
          >
            <span
              aria-hidden
              className="grid h-[220px] place-items-center bg-gradient-to-br from-tinta-menta to-tinta-menta-bordo text-[11px] font-extrabold uppercase tracking-widest text-primario-accento lg:h-auto"
            >
              {t('immagine')}
            </span>
            <span className="flex flex-col justify-center p-7 sm:p-9">
              <span className="mb-3.5 flex flex-wrap gap-2">
                <Chip tono="menta" dimensione="md">
                  {t('inEvidenza')}
                </Chip>
                <Chip dimensione="md">{evidenza.categoria}</Chip>
              </span>
              <span className="block font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-testo">
                {evidenza.titolo}
              </span>
              <span className="mt-3 block text-[15px] leading-relaxed text-testo-tenue">
                {evidenza.sommario}
              </span>
              <span className="mt-4 flex items-center gap-2.5">
                <Avatar nome={evidenza.autore} dimensione={32} soloColore />
                <span className="text-[12.5px] font-semibold text-testo-didascalia">
                  {evidenza.autore} · {t('lettura', { minuti: evidenza.minutiLettura })} ·{' '}
                  {evidenza.data}
                </span>
              </span>
            </span>
          </Link>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {altre.map((guida) => (
            <li key={guida.slug}>
              <Card padding="nessuno" className="h-full overflow-hidden transition-colors hover:border-tinta-menta-bordo">
                <Link href={percorsi.guida(guida.slug)} className="block">
                  <span
                    aria-hidden
                    className="block h-[150px] bg-gradient-to-br from-tinta-menta to-tinta-menta-bordo"
                  />
                  <span className="block p-5">
                    <Chip>{guida.categoria}</Chip>
                    <span className="mt-3 block font-display text-lg font-extrabold leading-snug tracking-[-0.02em] text-testo">
                      {guida.titolo}
                    </span>
                    <span className="mt-2 block text-[13.5px] leading-relaxed text-testo-didascalia">
                      {guida.sommario}
                    </span>
                    <span className="mt-3.5 block text-[11.5px] font-bold text-testo-debole">
                      {t('lettura', { minuti: guida.minutiLettura })} · {guida.data}
                    </span>
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </SiteShell>
  );
}
