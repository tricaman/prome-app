import { getTranslations } from 'next-intl/server';
import { percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { Statistica } from '@/components/contenuti';
import { Avatar, Card, Heading } from '@/components/ui';

/** Il team: da sostituire con foto reali, che qui contano più di ogni testo. */
const TEAM = [
  {
    nome: 'Giulia Ferrari',
    ruolo: 'Prodotto',
    bio: 'Ha studiato Ingegneria informatica a Bologna. Progetta le aule studio partendo dalle sue sessioni di ripasso.',
  },
  {
    nome: 'Marco Villa',
    ruolo: 'Tecnologia',
    bio: 'Si occupa dell’infrastruttura audio e della privacy dei dati. Ex studente del Politecnico di Milano.',
  },
  {
    nome: 'Sara Conti',
    ruolo: 'Community',
    bio: 'Parla ogni settimana con i moderatori dei gruppi per capire cosa manca davvero.',
  },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.chiSiamo' });
  return creaMetadata({
    lingua,
    percorso: percorsi.chiSiamo(),
    titolo: t('titolo'),
    descrizione: t('sommario'),
  });
}

/**
 * Chi siamo.
 *
 * Non è una pagina di traffico ma di fiducia: la leggono gli atenei che
 * valutano un accordo e gli studenti diffidenti. Deve rispondere a tre
 * domande — chi siete, come guadagnate, cosa fate dei miei dati — nel modo
 * più diretto possibile.
 */
export default async function PaginaChiSiamo({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.chiSiamo');
  const tSito = await getTranslations('sito');

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: tSito('nav.chiSiamo') },
  ];

  const statistiche = [
    { valore: '28.000', etichetta: t('statistiche.studenti') },
    { valore: '42', etichetta: t('statistiche.atenei') },
    { valore: '12.400', etichetta: t('statistiche.aule') },
    { valore: '0', etichetta: t('statistiche.dati') },
  ];

  return (
    <SiteShell sfondo="piena">
      <StructuredData lingua={lingua} oggetti={[briciole(lingua, voci)]} />

      <section className="bg-gradient-to-b from-tinta-menta-velo to-superficie px-0 py-16">
        <Container larghezza="media" className="text-center">
          <Heading livello={1} taglia="2xl" className="text-[38px] sm:text-[52px]">
            {t('titolo')}
          </Heading>
          <p className="mx-auto mt-5 max-w-[820px] text-lg leading-relaxed text-testo-tenue">
            {t('sommario')}
          </p>
        </Container>
      </section>

      <Container larghezza="media" className="pb-16">
        <div
          aria-hidden
          className="mb-12 grid h-[300px] place-items-center rounded-3xl bg-gradient-to-br from-tinta-menta to-tinta-menta-bordo"
        >
          <span className="grid h-[130px] w-[200px] place-items-center rounded-[20px] border-[1.5px] border-dashed border-primary-500 bg-superficie/75 text-center text-[11px] font-extrabold uppercase leading-relaxed tracking-widest text-primario-accento">
            {t('fotoTeam')}
          </span>
        </div>

        <div className="mb-13 grid gap-12 md:grid-cols-2">
          {(['motto', 'sostegno'] as const).map((blocco) => (
            <div key={blocco}>
              <Heading taglia="lg" className="mb-3">
                {t(`${blocco}.titolo`)}
              </Heading>
              <p className="mb-3 text-[15.5px] leading-[1.75] text-testo-corpo">
                {t(`${blocco}.p1`)}
              </p>
              <p className="text-[15.5px] leading-[1.75] text-testo-corpo">{t(`${blocco}.p2`)}</p>
            </div>
          ))}
        </div>

        <div className="my-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statistiche.map((voce) => (
            <Statistica
              key={voce.etichetta}
              valore={voce.valore}
              etichetta={voce.etichetta}
              variante="centrata"
            />
          ))}
        </div>

        <Heading taglia="lg" className="mb-5 text-center">
          {t('team')}
        </Heading>
        <ul className="grid gap-5 md:grid-cols-3">
          {TEAM.map((persona) => (
            <li key={persona.nome}>
              <Card padding="lg" className="h-full text-center">
                <Avatar nome={persona.nome} dimensione={80} className="mx-auto mb-3.5 text-2xl" />
                <p className="font-display text-lg font-extrabold">{persona.nome}</p>
                <p className="mt-1 text-[12.5px] font-bold text-primario-collegamento">{persona.ruolo}</p>
                <p className="mt-2.5 text-[13px] leading-relaxed text-testo-didascalia">{persona.bio}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </SiteShell>
  );
}
