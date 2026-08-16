import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { TestataPannello } from '@/components/app/testata-pannello';
import { ImpostazioniNotifiche } from '@/components/app/impostazioni-notifiche';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.impostazioni' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.impostazioniNotifiche(),
    titolo: `${t('notifiche.titolo')} · ${t('titolo')}`,
    noIndex: true,
  });
}

/**
 * Gli avvisi.
 *
 * Due assi e non quattro: il disegno ne mostrava anche i promemoria delle aule
 * programmate e un riepilogo giornaliero dei materiali, che nel contratto delle
 * preferenze non esistono. Non sono stati aggiunti spenti come le altre righe
 * segnaposto perché qui l'inganno sarebbe doppio — su una scheda che parla di
 * cosa ti arriva, una voce in più suggerisce che qualcosa arrivi.
 */
export default async function PaginaNotifiche({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni');

  return (
    <>
      <TestataPannello titolo={t('notifiche.titolo')} sommario={t('pannello.notifiche')} />
      <ImpostazioniNotifiche />
    </>
  );
}
