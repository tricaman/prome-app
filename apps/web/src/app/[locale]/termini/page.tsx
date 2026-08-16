import { getTranslations } from 'next-intl/server';
import { EMAIL_PRIVACY, TERMINI_IN_BREVE, TERMINI_SEZIONI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { DocumentoLegale } from '@/components/contenuti';
import { Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.termini' });
  return creaMetadata({
    lingua,
    percorso: percorsi.termini(),
    titolo: t('titolo'),
    descrizione: t('descrizione'),
  });
}

/**
 * Termini di servizio.
 *
 * Il documento che mancava: il piè di pagina lo nominava da sempre e il
 * collegamento portava alla privacy policy, che parla d'altro. Dice due cose
 * che un progetto di una persona sola deve dire per iscritto — i contenuti
 * restano di chi li scrive, e il servizio non garantisce continuità — invece
 * di lasciarle intuire.
 */
export default async function PaginaTermini({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.termini');
  const tSito = await getTranslations('sito');

  return (
    <DocumentoLegale
      lingua={lingua}
      percorso={percorsi.termini()}
      voci={[{ etichetta: tSito('home'), href: percorsi.home() }, { etichetta: t('titolo') }]}
      titolo={t('titolo')}
      vigore={t('vigore')}
      etichette={{
        documenti: t('documenti'),
        inQuestaPagina: t('inQuestaPagina'),
        inBreve: t('inBreve'),
        soloItaliano: t('soloItaliano'),
      }}
      inBreve={TERMINI_IN_BREVE}
      sezioni={TERMINI_SEZIONI}
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
