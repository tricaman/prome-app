import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { HubProfilo } from '@/components/app/hub-profilo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.nav' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.profilo(),
    titolo: t('profilo'),
    noIndex: true,
  });
}

/**
 * Il profilo, finalmente una pagina sua.
 *
 * Prima la voce «Profilo» della colonna di navigazione portava alle
 * impostazioni: non esisteva un posto dove vedere chi sei e cosa hai
 * prodotto, solo dove cambiare come funziona l'app. Sono due cose diverse, e
 * sul web possono avere due indirizzi diversi.
 *
 * **La barra non porta più azioni.** Ci stavano «Impostazioni» — una
 * destinazione globale raggiungibile da questa sola schermata, che è il modo
 * più elegante di nascondere una cosa — e «Modifica profilo», unico bottone
 * pieno dello schermo per un gesto che si fa una volta all'anno, a mille pixel
 * dalla scheda che modifica. Le impostazioni ora stanno nella colonna e nel
 * menu account; modificare il profilo si fa sulla scheda, in `HubProfilo`.
 */
export default async function PaginaProfilo({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('nav.profilo')}
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="max-w-[900px]">
          <HubProfilo />
        </div>
      </div>
    </>
  );
}
