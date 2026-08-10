import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GUIDE, guidaDi, percorsi } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import type { BloccoArticolo } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { articolo, briciole } from '@/lib/schema';
import { Breadcrumb, Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { RichiamoMenta } from '@/components/contenuti';
import { Avatar, ButtonLink, Chip, Heading } from '@/components/ui';

type Parametri = { locale: string; slug: string };

export function generateStaticParams() {
  return GUIDE.map((guida) => ({ slug: guida.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { slug } = await params;
  const guida = guidaDi(slug);
  if (!guida) notFound();

  return creaMetadata({
    lingua,
    percorso: percorsi.guida(guida.slug),
    titolo: guida.titolo,
    descrizione: guida.sommario,
  });
}

/**
 * Articolo di una guida.
 *
 * Colonna stretta e interlinea ampia: qui si legge davvero, non si scorre.
 * Tre elementi rompono il testo a intervalli regolari — citazione, punti
 * numerati, richiamo finale — e nient'altro entra se non aggiunge un dato.
 */
export default async function PaginaGuida({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDellaRotta(params);
  const { slug } = await params;
  const guida = guidaDi(slug);
  if (!guida) notFound();

  const t = await getTranslations('pagine.guide');
  const tSito = await getTranslations('sito');

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: t('titolo'), href: percorsi.guide() },
    { etichetta: guida.titolo },
  ];

  return (
    <SiteShell sfondo="piena">
      <StructuredData
        lingua={lingua}
        oggetti={[briciole(lingua, voci), articolo(lingua, guida, percorsi.guida(guida.slug))]}
      />

      <Container larghezza="stretta" className="py-8">
        <Breadcrumb voci={voci} className="mb-4" />
        <Chip tono="menta" dimensione="md" className="normal-case">
          {guida.categoria}
        </Chip>
        <Heading livello={1} taglia="2xl" className="mt-4 text-[36px] sm:text-[44px]">
          {guida.titolo}
        </Heading>

        <div className="mt-5 flex items-center gap-3 border-b border-bordo pb-5">
          <Avatar nome={guida.autore} dimensione={42} soloColore />
          <div>
            <p className="text-sm font-extrabold text-testo">{guida.autore}</p>
            <p className="mt-0.5 text-[12.5px] text-testo-didascalia">
              {guida.data} · {t('lettura', { minuti: guida.minutiLettura })}
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="my-8 grid h-[280px] place-items-center rounded-[20px] bg-gradient-to-br from-tinta-menta to-tinta-menta-bordo text-[11px] font-extrabold uppercase tracking-widest text-primario-accento"
        >
          {t('immagine')}
        </div>

        {guida.corpo?.map((blocco, indice) => <Blocco key={indice} blocco={blocco} />)}

        {!guida.corpo ? (
          <p className="text-[17px] leading-[1.8] text-testo-corpo">{guida.sommario}</p>
        ) : null}

        <RichiamoMenta
          className="mt-8"
          titolo={t('provaAula.titolo')}
          testo={t('provaAula.testo', { numero: 3 })}
          azioni={
            <ButtonLink
              href={percorsiApp.accedi()}
              variante="secondaria"
              className="h-12 bg-superficie-inversa px-6 text-[15px] text-superficie-inversa-testo"
            >
              {t('provaAula.titolo')}
            </ButtonLink>
          }
        />
      </Container>
    </SiteShell>
  );
}

/** Un blocco per volta: il testo di un articolo non è mai un'unica stringa. */
function Blocco({ blocco }: { blocco: BloccoArticolo }) {
  switch (blocco.tipo) {
    case 'occhiello':
      return (
        <p className="mb-5 text-[19px] font-semibold leading-[1.7] text-testo-corpo">
          {blocco.testo}
        </p>
      );
    case 'paragrafo':
      return <p className="mb-5 text-[17px] leading-[1.8] text-testo-corpo">{blocco.testo}</p>;
    case 'titolo':
      return (
        <Heading taglia="lg" className="mb-3.5 mt-9">
          {blocco.testo}
        </Heading>
      );
    case 'citazione':
      return (
        <blockquote className="mb-6 rounded-r-2xl border-l-4 border-primary-500 bg-tinta-menta-velo px-6 py-5">
          <p className="text-[17px] font-semibold italic leading-relaxed text-primario-accento">
            {blocco.testo}
          </p>
        </blockquote>
      );
    case 'punti':
      return (
        <ol className="mb-6 flex flex-col gap-3">
          {blocco.punti.map((punto, indice) => (
            <li
              key={punto.titolo}
              className="flex gap-3.5 rounded-2xl border border-bordo bg-superficie-alt px-5 py-4"
            >
              <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-tinta-menta text-sm font-extrabold text-primario-accento">
                {indice + 1}
              </span>
              <span>
                <span className="block text-[15.5px] font-extrabold text-testo">
                  {punto.titolo}
                </span>
                <span className="mt-1 block text-[14.5px] leading-relaxed text-testo-tenue">
                  {punto.testo}
                </span>
              </span>
            </li>
          ))}
        </ol>
      );
  }
}
