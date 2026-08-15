import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { AccettaInvitoGruppo } from '@/components/app/accetta-invito-gruppo';

type Parametri = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const t = await getTranslations({ locale: lingua, namespace: 'app.gruppo' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.invitoGruppo(id),
    titolo: t('invitoTitolo'),
    noIndex: true,
  });
}

/** L'atterraggio di chi apre l'invito ricevuto per email. */
export default async function PaginaInvitoGruppo({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;
  const t = await getTranslations('app.gruppo');

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
        <AccettaInvitoGruppo invitoId={id} />
      </div>
    </>
  );
}
