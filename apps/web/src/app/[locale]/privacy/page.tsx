import { getTranslations } from 'next-intl/server';
import { percorsi } from '@/content';
import {
  DOCUMENTI_LEGALI,
  EMAIL_PRIVACY,
  PRIVACY_IN_BREVE,
  PRIVACY_SEZIONI,
} from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole } from '@/lib/schema';
import { Breadcrumb, Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { Card, Heading } from '@/components/ui';
import { Link } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.privacy' });
  return creaMetadata({
    lingua,
    percorso: percorsi.privacy(),
    titolo: t('titolo'),
    descrizione:
      'Quali dati raccogliamo, perché, per quanto tempo e come esercitare i tuoi diritti.',
  });
}

/**
 * Privacy policy.
 *
 * Due livelli di lettura: il riepilogo senza legalese, per essere capiti, e il
 * testo completo, per essere conformi. Le pagine legali si indicizzano: sono
 * un segnale di affidabilità, non una formalità da nascondere.
 */
export default async function PaginaPrivacy({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.privacy');
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
          {/* Le legali si consultano per punti, non si leggono in sequenza. */}
          <nav className="lg:sticky lg:top-24" aria-label={t('documenti')}>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {t('documenti')}
            </p>
            <ul className="mb-6 flex flex-col gap-0.5">
              {DOCUMENTI_LEGALI.map((documento) => (
                <li key={documento.titolo}>
                  <Link
                    href={documento.href}
                    aria-current={documento.attivo ? 'page' : undefined}
                    className={cn(
                      'block rounded-[11px] px-3 py-2.5 text-[13px]',
                      documento.attivo
                        ? 'bg-tinta-menta font-extrabold text-primario-accento'
                        : 'font-semibold text-testo-tenue hover:bg-superficie-alt',
                    )}
                  >
                    {documento.titolo}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {t('inQuestaPagina')}
            </p>
            <ul className="flex flex-col gap-2">
              {PRIVACY_SEZIONI.map((sezione) => (
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
            <p className="mt-2.5 text-[13.5px] font-bold text-testo-debole">{t('vigore')}</p>

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
                {PRIVACY_IN_BREVE.map((punto) => (
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
              {PRIVACY_SEZIONI.map((sezione) => (
                <section key={sezione.id} id={sezione.id} className="mb-7 scroll-mt-24">
                  <Heading taglia="md">{sezione.titolo}</Heading>
                  <p className="mt-3 text-[15.5px] leading-[1.8] text-testo-corpo">
                    {sezione.corpo}
                  </p>
                </section>
              ))}
            </div>

            <Card variante="tenue" padding="md">
              <p className="text-[15px] font-extrabold text-testo">{t('contatto.titolo')}</p>
              <p className="mt-2 text-sm leading-relaxed text-testo-tenue">{t('contatto.testo')}</p>
              <a
                href={`mailto:${EMAIL_PRIVACY}`}
                className="mt-3.5 inline-block rounded-full bg-primario px-5 py-3 text-sm font-extrabold text-primario-testo"
              >
                {EMAIL_PRIVACY}
              </a>
            </Card>
          </div>
        </div>
      </Container>
    </SiteShell>
  );
}
