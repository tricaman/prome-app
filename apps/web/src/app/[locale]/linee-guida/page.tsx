import { getTranslations } from 'next-intl/server';
import { LINEE_GUIDA_IN_BREVE, LINEE_GUIDA_SEZIONI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { DocumentoLegale } from '@/components/contenuti';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.lineeGuida' });
  return creaMetadata({
    lingua,
    percorso: percorsi.lineeGuida(),
    titolo: t('titolo'),
    descrizione: t('descrizione'),
  });
}

/**
 * Linee guida della community.
 *
 * È la pagina a cui rimanda la schermata di segnalazione, e la promessa che
 * fa — contenuti segnalati guardati **entro 24 ore** — è la stessa
 * dell'email che arriva al supporto: se il documento e il prodotto si
 * contraddicono, quello che resta è la sfiducia.
 */
export default async function PaginaLineeGuida({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.lineeGuida');
  const tSito = await getTranslations('sito');

  return (
    <DocumentoLegale
      lingua={lingua}
      percorso={percorsi.lineeGuida()}
      voci={[{ etichetta: tSito('home'), href: percorsi.home() }, { etichetta: t('titolo') }]}
      titolo={t('titolo')}
      etichette={{
        documenti: t('documenti'),
        inQuestaPagina: t('inQuestaPagina'),
        inBreve: t('inBreve'),
        soloItaliano: t('soloItaliano'),
      }}
      inBreve={LINEE_GUIDA_IN_BREVE}
      sezioni={LINEE_GUIDA_SEZIONI}
    />
  );
}
