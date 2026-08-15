import { getTranslations } from 'next-intl/server';
import { percorsi } from '@/content';
import { LINEE_GUIDA_IN_BREVE, LINEE_GUIDA_SEZIONI } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole } from '@/lib/schema';
import { Breadcrumb, Container, NavLegale, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { Card, Heading } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.lineeGuida' });
  return creaMetadata({
    lingua,
    percorso: percorsi.lineeGuida(),
    titolo: t('titolo'),
    descrizione: 'Le regole della community: cosa non è ammesso, come segnalare, come bloccare.',
  });
}

/**
 * Linee guida della community.
 *
 * È la pagina a cui rimanda la schermata di segnalazione, e la promessa che
 * fa — contenuti segnalati guardati **entro 24 ore** — è la stessa
 * dell'email che arriva al supporto: se il documento e il prodotto si
 * contraddicono, quello che resta è la sfiducia. Stessa composizione della
 * privacy policy: riepilogo senza legalese, poi le sezioni.
 */
export default async function PaginaLineeGuida({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.lineeGuida');
  const tSito = await getTranslations('sito');

  const voci = [
    { etichetta: tSito('home'), href: percorsi.home() },
    { etichetta: t('titolo') },
  ];

  return (
    <SiteShell sfondo="piena">
      <StructuredData lingua={lingua} oggetti={[briciole(lingua, voci)]} />

      <Container larghezza="media" className="py-8">
        <div className="grid items-start gap-10 lg:grid-cols-[230px_1fr]">
          <nav className="lg:sticky lg:top-24" aria-label={t('documenti')}>
            <NavLegale corrente={percorsi.lineeGuida()} titolo={t('documenti')} />

            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {t('inQuestaPagina')}
            </p>
            <ul className="flex flex-col gap-2">
              {LINEE_GUIDA_SEZIONI.map((sezione) => (
                <li key={sezione.id}>
                  <a
                    href={`#${sezione.id}`}
                    className="text-[12.5px] font-semibold leading-snug text-testo-tenue hover:text-primario-collegamento"
                  >
                    {sezione.titolo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Breadcrumb voci={voci} className="mb-4" />
            <Heading livello={1} taglia="xl">
              {t('titolo')}
            </Heading>

            {lingua !== 'it' ? (
              <p className="mt-4 rounded-2xl border border-tinta-ambra-bordo bg-tinta-ambra px-4 py-3 text-[13.5px] font-semibold text-tinta-ambra-testo">
                {t('soloItaliano')}
              </p>
            ) : null}

            <Card variante="menta" padding="md" className="mt-6 rounded-[18px]">
              <Heading taglia="sm" className="text-tinta-menta-testo">
                {t('inBreve')}
              </Heading>
              <ul className="mt-3 flex flex-col gap-2.5">
                {LINEE_GUIDA_IN_BREVE.map((punto) => (
                  <li key={punto.slice(0, 30)} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-[22px] flex-none place-items-center rounded-full bg-superficie text-xs font-extrabold text-primario-accento"
                    >
                      ✓
                    </span>
                    <span className="text-sm leading-relaxed text-primario-accento">{punto}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="mt-8">
              {LINEE_GUIDA_SEZIONI.map((sezione) => (
                <section key={sezione.id} id={sezione.id} className="mb-7 scroll-mt-24">
                  <Heading taglia="md">{sezione.titolo}</Heading>
                  <p className="mt-3 text-[15.5px] leading-[1.8] text-testo-corpo">
                    {sezione.corpo}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </SiteShell>
  );
}
