import { getTranslations } from 'next-intl/server';
import { ATENEI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole, raccolta } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { TestataPagina, numero } from '@/components/contenuti';
import { Card, Heading } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.ateneo.elenco' });
  return creaMetadata({
    lingua,
    percorso: percorsi.atenei(),
    titolo: t('titolo'),
    descrizione: t('sommario'),
  });
}

/**
 * Indice degli atenei: la porta d'ingresso agli hub per università, che sono
 * le pagine con l'intento di ricerca più alto del sito.
 */
export default async function PaginaAtenei({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.ateneo');
  const tSito = await getTranslations('sito');

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: tSito('nav.atenei') },
  ];

  return (
    <SiteShell>
      <StructuredData
        lingua={lingua}
        oggetti={[
          briciole(lingua, voci),
          raccolta(
            lingua,
            percorsi.atenei(),
            t('elenco.titolo'),
            t('elenco.sommario'),
            ATENEI.map((ateneo) => ({
              nome: ateneo.nome,
              percorso: percorsi.ateneo(ateneo.slug),
            })),
          ),
        ]}
      />

      <TestataPagina
        briciole={voci}
        titolo={t('elenco.titolo')}
        sommario={t('elenco.sommario')}
      />

      <Container className="py-7">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ATENEI.map((ateneo) => (
            <li key={ateneo.slug}>
              <Card padding="sm" className="h-full transition-colors hover:border-tinta-menta-bordo">
                <Link href={percorsi.ateneo(ateneo.slug)} className="block">
                  <span
                    aria-hidden
                    className="mb-3.5 grid size-14 place-items-center rounded-2xl bg-tinta-menta font-display text-lg font-extrabold text-primario-accento"
                  >
                    {ateneo.nomeBreve.slice(0, 2).toUpperCase()}
                  </span>
                  <Heading taglia="xs" className="text-testo">
                    {ateneo.nome}
                  </Heading>
                  <p className="mt-1 text-[12.5px] text-testo-didascalia">{ateneo.citta}</p>
                  <p className="mt-3 text-[12.5px] font-bold text-testo-tenue">
                    {t('studenti', { numero: numero(ateneo.statistiche.studenti) })} ·{' '}
                    {t('conAule', { numero: ateneo.statistiche.auleStudioMese })}
                  </p>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </SiteShell>
  );
}
