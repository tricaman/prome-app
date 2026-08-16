import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ATENEI, ateneiPiuAttivi, ateneoDi, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole, organizzazioneEducativa } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import {
  ColonneContenuto,
  RiquadroLaterale,
  RichiamoMenta,
  Statistica,
  TestataPagina,
  TitoloSezione,
  numero,
} from '@/components/contenuti';
import { Button, ButtonLink, Card } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

type Parametri = { locale: string; slug: string };

export function generateStaticParams() {
  return ATENEI.map((ateneo) => ({ slug: ateneo.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { slug } = await params;
  const ateneo = ateneoDi(slug);
  if (!ateneo) notFound();

  const t = await getTranslations({ locale: lingua, namespace: 'pagine.ateneo' });
  return creaMetadata({
    lingua,
    percorso: percorsi.ateneo(ateneo.slug),
    titolo: t('titolo', { nome: ateneo.nome }),
    descrizione: ateneo.descrizione,
  });
}

/**
 * Hub di un ateneo.
 *
 * Racconta quanto il prodotto è vivo in quell'università — numeri aggregati e
 * corsi più attivi — e invita a entrare. Non elenca aule studio, materiali né
 * post: quelli sono contenuti degli utenti e vivono dietro l'accesso, anche
 * quando la loro visibilità è "Pubblico", che nel dominio vuol dire "aperto a
 * tutti gli studenti iscritti", non "aperto al web".
 */
export default async function PaginaAteneo({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDellaRotta(params);
  const { slug } = await params;
  const ateneo = ateneoDi(slug);
  if (!ateneo) notFound();

  const t = await getTranslations('pagine.ateneo');
  const tSito = await getTranslations('sito');
  const altri = ateneiPiuAttivi(6).filter((voce) => voce.slug !== ateneo.slug);

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: tSito('nav.atenei'), href: percorsi.atenei() },
    { etichetta: ateneo.nome },
  ];

  const statistiche = [
    { valore: numero(ateneo.statistiche.studenti), etichetta: t('statistiche.studenti') },
    { valore: numero(ateneo.statistiche.auleStudioMese), etichetta: t('statistiche.aule') },
    { valore: numero(ateneo.statistiche.materiali), etichetta: t('statistiche.materiali') },
    { valore: numero(ateneo.statistiche.gruppi), etichetta: t('statistiche.gruppi') },
  ];

  return (
    <SiteShell>
      <StructuredData
        oggetti={[
          briciole(lingua, voci),
          organizzazioneEducativa(lingua, ateneo.nome, ateneo.citta, percorsi.ateneo(ateneo.slug)),
        ]}
      />

      <TestataPagina
        variante="menta"
        briciole={voci}
        titolo={t('titolo', { nome: ateneo.nome })}
        sommario={ateneo.descrizione}
        fianco={
          <Button
            variante="secondaria"
            className="h-12 bg-superficie-inversa px-6 text-[15px] text-superficie-inversa-testo hover:bg-superficie-inversa/90"
          >
            {t('entra', { breve: ateneo.nomeBreve })}
          </Button>
        }
      />

      <Container className="py-7">
        {/* Numeri aggregati, non contenuti: rispondono all'unica domanda del
            visitatore — "ci sono i miei compagni qui?" — senza esporre nulla
            di ciò che gli studenti hanno scritto. */}
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statistiche.map((voce) => (
            <Statistica key={voce.etichetta} valore={voce.valore} etichetta={voce.etichetta} />
          ))}
        </div>

        <ColonneContenuto
          larghezzaFianco={320}
          fianco={
            <>
              <RiquadroLaterale titolo={t('suQuesto')}>
                <p className="text-[13px] leading-relaxed text-testo-tenue">{ateneo.descrizione}</p>
              </RiquadroLaterale>
              <RiquadroLaterale titolo={t('altri')}>
                <ul className="flex flex-col gap-2.5">
                  {altri.map((voce) => (
                    <li key={voce.slug}>
                      <Link
                        href={percorsi.ateneo(voce.slug)}
                        className="flex items-center gap-2.5 text-[13px] font-bold text-testo-corpo hover:text-primario-collegamento"
                      >
                        <span aria-hidden className="size-6 flex-none rounded-lg bg-superficie-alt-2" />
                        {voce.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </RiquadroLaterale>
            </>
          }
        >
          <section>
            <TitoloSezione>{t('corsi')}</TitoloSezione>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ateneo.corsi.map((corso) => (
                <li key={corso.nome}>
                  <Card
                    padding="nessuno"
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                  >
                    <span aria-hidden className="size-9 flex-none rounded-xl bg-tinta-menta" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-testo">
                        {corso.nome}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-testo-didascalia">
                        {t('studenti', { numero: numero(corso.studenti) })} ·{' '}
                        {t('conAule', { numero: corso.auleStudio })}
                      </span>
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <RichiamoMenta
            className="mt-7"
            titolo={t('entra', { breve: ateneo.nomeBreve })}
            testo={t('elenco.sommario')}
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
