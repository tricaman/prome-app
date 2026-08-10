import { getTranslations } from 'next-intl/server';
import { percorsi } from '@/content';
import { ButtonLink, Card, Heading } from '@/components/ui';
import { Container, SiteShell } from '@/components/layout';

/** Pagina inesistente dentro una lingua: la scritta resta nella sua lingua. */
export default async function NonTrovato() {
  const t = await getTranslations('errori.nonTrovato');

  return (
    <SiteShell>
      <Container larghezza="stretta" className="flex min-h-[60vh] items-center justify-center py-16">
        <Card padding="lg" className="w-full text-center">
          <Heading livello={1} taglia="lg">
            {t('titolo')}
          </Heading>
          <p className="mt-3 text-testo-tenue">{t('descrizione')}</p>
          <ButtonLink href={percorsi.home()} className="mt-6">
            {t('azione')}
          </ButtonLink>
        </Card>
      </Container>
    </SiteShell>
  );
}
