import { getTranslations } from 'next-intl/server';
import { ELIMINA_ACCOUNT_IN_BREVE, ELIMINA_ACCOUNT_SEZIONI, percorsi } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { DocumentoLegale } from '@/components/contenuti';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'pagine.eliminaAccount' });
  return creaMetadata({
    lingua,
    percorso: percorsi.eliminaAccount(),
    titolo: t('titolo'),
    descrizione: t('descrizione'),
  });
}

/**
 * Come si elimina l'account.
 *
 * **È una pagina che esiste per un requisito degli store**, e vale la pena
 * saperlo prima di ritoccarla: Google Play pretende un indirizzo web pubblico
 * dove chiedere la cancellazione dell'account, raggiungibile **senza
 * installare l'app**. Una schermata dentro l'app non basta — è dove il gesto
 * vive, non dove chi non ce l'ha può arrivare — e nemmeno il paragrafo della
 * privacy policy, che spiega il trattamento e non è un posto dove si fa
 * qualcosa.
 *
 * Per questo non è raggiungibile solo dai documenti legali ma anche dal piè di
 * pagina: un indirizzo che esiste e che nessuno trova non soddisfa il
 * requisito, e soprattutto non serve alla persona che lo sta cercando.
 */
export default async function PaginaEliminaAccount({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const lingua = await linguaDellaRotta(params);
  const t = await getTranslations('pagine.eliminaAccount');
  const tSito = await getTranslations('sito');

  return (
    <DocumentoLegale
      lingua={lingua}
      percorso={percorsi.eliminaAccount()}
      voci={[{ etichetta: tSito('home'), href: percorsi.home() }, { etichetta: t('titolo') }]}
      titolo={t('titolo')}
      etichette={{
        documenti: t('documenti'),
        inQuestaPagina: t('inQuestaPagina'),
        inBreve: t('inBreve'),
        soloItaliano: t('soloItaliano'),
      }}
      inBreve={ELIMINA_ACCOUNT_IN_BREVE}
      sezioni={ELIMINA_ACCOUNT_SEZIONI}
    />
  );
}
