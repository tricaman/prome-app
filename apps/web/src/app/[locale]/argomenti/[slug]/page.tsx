import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ARGOMENTI, argomentoDi, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import {
  ColonneContenuto,
  RichiamoMenta,
  RiquadroLaterale,
  Statistica,
  TestataPagina,
  numero,
} from '@/components/contenuti';
import { ButtonLink, Card, Chip, Heading } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

type Parametri = { locale: string; slug: string };

export function generateStaticParams() {
  return ARGOMENTI.map((argomento) => ({ slug: argomento.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { slug } = await params;
  const argomento = argomentoDi(slug);
  if (!argomento) notFound();

  return creaMetadata({
    lingua,
    percorso: percorsi.argomento(argomento.slug),
    titolo: argomento.nome,
    descrizione: argomento.sommario,
  });
}

/**
 * Hub di un argomento.
 *
 * È una pagina redazionale: racconta come si studia quella materia e quanto è
 * frequentata su Prome. Non elenca post, materiali né aule studio — sono
 * contenuti degli utenti, e restano dietro l'accesso anche quando la loro
 * visibilità è "Pubblico", che nel dominio significa "aperto a tutti gli
 * studenti iscritti".
 *
 * Il testo redazionale è anche ciò che le dà una ragione di esistere: senza,
 * sarebbe una pagina vuota con un invito a registrarsi.
 */
export default async function PaginaArgomento({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDellaRotta(params);
  const { slug } = await params;
  const argomento = argomentoDi(slug);
  if (!argomento) notFound();

  const t = await getTranslations('pagine.argomento');
  const tSito = await getTranslations('sito');

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: tSito('nav.argomenti'), href: percorsi.argomenti() },
    { etichetta: argomento.nome },
  ];

  const conteggi = [
    { valore: numero(argomento.conteggi.post), etichetta: 'post' },
    { valore: numero(argomento.conteggi.materiali), etichetta: 'materiali' },
    { valore: numero(argomento.conteggi.auleStudio), etichetta: 'aule studio' },
    { valore: numero(argomento.conteggi.atenei), etichetta: 'atenei' },
  ];

  return (
    <SiteShell>
      <StructuredData oggetti={[briciole(lingua, voci)]} />

      <TestataPagina briciole={voci} titolo={argomento.nome} sommario={argomento.sommario}>
        <div className="mt-4 flex flex-wrap gap-2">
          {argomento.sottoArgomenti.map((sotto) => (
            <Chip key={sotto} dimensione="md" className="normal-case">
              {sotto}
            </Chip>
          ))}
        </div>
      </TestataPagina>

      <Container className="py-7">
        <ColonneContenuto
          larghezzaFianco={320}
          fianco={
            <>
              <RiquadroLaterale titolo={t('collegati')}>
                <div className="flex flex-wrap gap-2">
                  {argomento.collegati.map((nome) => (
                    <Chip key={nome} dimensione="md" className="normal-case">
                      {nome}
                    </Chip>
                  ))}
                </div>
              </RiquadroLaterale>

              <RiquadroLaterale titolo={tSito('nav.argomenti')}>
                <ul className="flex flex-col gap-2.5">
                  {ARGOMENTI.filter((voce) => voce.slug !== argomento.slug).map((voce) => (
                    <li key={voce.slug}>
                      <Link
                        href={percorsi.argomento(voce.slug)}
                        className="text-[13px] font-bold text-testo-corpo hover:text-primario-collegamento"
                      >
                        {voce.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </RiquadroLaterale>
            </>
          }
        >
          {/* Quanto è vivo l'argomento, senza mostrare cosa contiene. */}
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            {conteggi.map((voce) => (
              <Statistica key={voce.etichetta} valore={voce.valore} etichetta={voce.etichetta} />
            ))}
          </div>

          <Card padding="md">
            <Heading taglia="sm">{t('comeSiStudia', { nome: argomento.nome })}</Heading>
            {argomento.introduzione.map((paragrafo) => (
              <p
                key={paragrafo.slice(0, 40)}
                className="mt-2.5 text-[14.5px] leading-[1.75] text-testo-corpo"
              >
                {paragrafo}
              </p>
            ))}
          </Card>

          <RichiamoMenta
            className="mt-6"
            titolo={t('segui')}
            testo={argomento.sommario}
            azioni={
              <ButtonLink href={percorsi.home()} dimensione="lg" className="h-12 px-6 text-base">
                {tSito('iniziaGratis')}
              </ButtonLink>
            }
          />
        </ColonneContenuto>
      </Container>
    </SiteShell>
  );
}
