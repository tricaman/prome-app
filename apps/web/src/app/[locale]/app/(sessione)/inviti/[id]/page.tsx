import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { AccettaInvitoAula } from '@/components/app/accetta-invito-aula';

type Parametri = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const t = await getTranslations({ locale: lingua, namespace: 'app.invito' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.invito(id),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * L'atterraggio di chi apre l'invito a un'aula ricevuto per email.
 *
 * Sta dentro il gruppo `(sessione)`, quindi chi non è ancora entrato viene
 * mandato all'accesso **e riportato qui dopo**: è il caso normale, non
 * l'eccezione — si invita anche chi non ha ancora un account, e l'invito lo
 * aspetta.
 */
export default async function PaginaInvitoAula({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;
  const t = await getTranslations('app.invito');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AccettaInvitoAula invitoId={id} />
      </div>
    </>
  );
}
