import { getTranslations } from 'next-intl/server';
import { ARGOMENTI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole, raccolta } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { TestataPagina } from '@/components/contenuti';
import { Card, Chip, Heading } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.argomento.elenco' });
  return creaMetadata({
    lingua,
    percorso: percorsi.argomenti(),
    titolo: t('titolo'),
    descrizione: t('sommario'),
  });
}

/** Indice degli argomenti: le materie che gli studenti cercano per nome. */
export default async function PaginaArgomenti({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.argomento');
  const tSito = await getTranslations('sito');

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: tSito('nav.argomenti') },
  ];

  return (
    <SiteShell>
      <StructuredData
        oggetti={[
          briciole(lingua, voci),
          raccolta(
            lingua,
            percorsi.argomenti(),
            t('elenco.titolo'),
            t('elenco.sommario'),
            ARGOMENTI.map((argomento) => ({
              nome: argomento.nome,
              percorso: percorsi.argomento(argomento.slug),
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
        <ul className="grid gap-4 lg:grid-cols-2">
          {ARGOMENTI.map((argomento) => (
            <li key={argomento.slug}>
              <Card padding="md" className="h-full transition-colors hover:border-tinta-menta-bordo">
                <Heading taglia="sm">
                  <Link
                    href={percorsi.argomento(argomento.slug)}
                    className="text-testo hover:text-primario-collegamento"
                  >
                    {argomento.nome}
                  </Link>
                </Heading>
                <p className="mt-2 text-sm leading-relaxed text-testo-tenue">
                  {argomento.sommario}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {argomento.sottoArgomenti.slice(0, 4).map((sotto) => (
                    <Chip key={sotto} dimensione="md" className="normal-case">
                      {sotto}
                    </Chip>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </SiteShell>
  );
}
