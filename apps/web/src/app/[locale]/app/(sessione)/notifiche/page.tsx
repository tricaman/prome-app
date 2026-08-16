import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { ElencoNotifiche } from '@/components/app/elenco-notifiche';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.notifiche' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.notifiche(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * Le notifiche: la destinazione della campanella.
 *
 * Una pagina e non un pannello al volo: ha un indirizzo, il tasto indietro
 * funziona, e la stessa forma esiste sul telefono. Il click su una riga
 * naviga alla risorsa e la segna letta strada facendo.
 */
export default async function PaginaNotifiche({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.notifiche');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="max-w-[680px]">
          <ElencoNotifiche />
        </div>
      </div>
    </>
  );
}
