import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { ModificaProfilo } from '@/components/app/modifica-profilo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({
    locale: lingua,
    namespace: 'app.impostazioni.modificaProfilo',
  });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.modificaProfilo(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * Modifica profilo, in una pagina sua.
 *
 * Non è un modale: i campi sono cinque e uno è una ricerca con suggerimenti,
 * che dentro un dialog sta stretta e obbliga a due livelli di scorrimento.
 * È la stessa scelta fatta sul telefono, dove è una schermata intera.
 *
 * La colonna resta stretta e non si allarga con la finestra: una riga di
 * campo lunga tutto lo schermo è illeggibile e fa sbagliare, e la misura
 * giusta è quella del telefono, solo più comoda.
 */
export default async function PaginaModificaProfilo({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni.modificaProfilo');

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
        <div className="max-w-[640px]">
          <ModificaProfilo />
        </div>
      </div>
    </>
  );
}
