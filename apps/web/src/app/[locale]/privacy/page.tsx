import { getTranslations } from 'next-intl/server';
import { EMAIL_PRIVACY, PRIVACY_IN_BREVE, PRIVACY_SEZIONI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { DocumentoLegale } from '@/components/contenuti';
import { Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.privacy' });
  return creaMetadata({
    lingua,
    percorso: percorsi.privacy(),
    titolo: t('titolo'),
    descrizione: t('descrizione'),
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

  return (
    <DocumentoLegale
      lingua={lingua}
      percorso={percorsi.privacy()}
      voci={[{ etichetta: tSito('home'), href: percorsi.home() }, { etichetta: t('titolo') }]}
      titolo={t('titolo')}
      vigore={t('vigore')}
      etichette={{
        documenti: t('documenti'),
        inQuestaPagina: t('inQuestaPagina'),
        inBreve: t('inBreve'),
        soloItaliano: t('soloItaliano'),
      }}
      inBreve={PRIVACY_IN_BREVE}
      sezioni={PRIVACY_SEZIONI}
    >
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
    </DocumentoLegale>
  );
}
