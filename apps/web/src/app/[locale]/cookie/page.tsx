import { getTranslations } from 'next-intl/server';
import { COOKIE_IN_BREVE, COOKIE_SEZIONI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { DocumentoLegale } from '@/components/contenuti';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.cookie' });
  return creaMetadata({
    lingua,
    percorso: percorsi.cookie(),
    titolo: t('titolo'),
    descrizione: t('descrizione'),
  });
}

/**
 * Cookie policy.
 *
 * È il documento più corto perché il sito è povero di tracciamento, e questo è
 * il punto: dire che non c'è niente vale quanto elencare ciò che c'è, ma solo
 * se resta vero. Il giorno in cui arriva uno strumento di misurazione, questa
 * pagina cambia **prima** che lo strumento sia acceso.
 */
export default async function PaginaCookie({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.cookie');
  const tSito = await getTranslations('sito');

  return (
    <DocumentoLegale
      lingua={lingua}
      percorso={percorsi.cookie()}
      voci={[{ etichetta: tSito('home'), href: percorsi.home() }, { etichetta: t('titolo') }]}
      titolo={t('titolo')}
      vigore={t('vigore')}
      etichette={{
        documenti: t('documenti'),
        inQuestaPagina: t('inQuestaPagina'),
        inBreve: t('inBreve'),
        soloItaliano: t('soloItaliano'),
      }}
      inBreve={COOKIE_IN_BREVE}
      sezioni={COOKIE_SEZIONI}
    />
  );
}
