import { getTranslations } from 'next-intl/server';
import { EMAIL_PRIVACY, percorsi } from '@/content';
import { config } from '@/lib/config';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { briciole, paginaChiSiamo } from '@/lib/schema';
import { Container, SiteShell } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { Statistica } from '@/components/contenuti';
import { Avatar, Card, Heading } from '@/components/ui';

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
 * Chi siamo — che poi è chi sono.
 *
 * Non è una pagina di traffico ma di fiducia: la leggono gli atenei che
 * valutano un accordo e gli studenti diffidenti. Deve rispondere a tre
 * domande — chi c'è dietro, come si mantiene, cosa fate dei miei dati — nel
 * modo più diretto possibile.
 *
 * Fino a oggi rispondeva alla prima con tre persone inventate e a un pubblico
 * fatto di numeri altrettanto inventati. Erano l'unica parte del sito che
 * chiunque poteva smentire, ed erano proprio sulla pagina che esiste per
 * essere creduta. Ora c'è una persona sola, con nome e città, e i quattro
 * numeri sono fatti verificabili invece di conteggi: è anche ciò che tiene in
 * piedi il `Person` dei dati strutturati, che di questa pagina fa la sua casa.
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

  // Quattro fatti, non quattro conteggi: un numero che non possiamo mostrare
  // non vale la pena di scriverlo, e questi restano veri anche domani.
  const statistiche = [
    { valore: '1', etichetta: t('statistiche.persone') },
    { valore: '0', etichetta: t('statistiche.dati') },
    { valore: '0', etichetta: t('statistiche.cookie') },
    { valore: 'UE', etichetta: t('statistiche.dove') },
  ];

  return (
    <SiteShell sfondo="piena">
      <StructuredData oggetti={[briciole(lingua, voci), paginaChiSiamo(lingua)]} />

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

      <Container larghezza="media" className="pb-16 pt-12">
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
        <Card padding="lg" className="mx-auto max-w-[560px] text-center">
          <Avatar nome={config.autore.nome} dimensione={80} className="mx-auto mb-3.5 text-2xl" />
          <p className="font-display text-lg font-extrabold">{config.autore.nome}</p>
          <p className="mt-1 text-[12.5px] font-bold text-primario-collegamento">{t('ruolo')}</p>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-testo-didascalia">{t('bio')}</p>
          <a
            href={`mailto:${EMAIL_PRIVACY}`}
            className="mt-4 inline-block rounded-full bg-primario px-5 py-2.5 text-[13px] font-extrabold text-primario-testo"
          >
            {t('scrivimi')}
          </a>
        </Card>
      </Container>
    </SiteShell>
  );
}
