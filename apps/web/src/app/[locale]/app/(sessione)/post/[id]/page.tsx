import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { DettaglioPost } from '@/components/app/dettaglio-post';
import { Icona } from '@/components/ui';
import { Link } from '@/i18n/navigazione';

type Parametri = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const t = await getTranslations({ locale: lingua, namespace: 'app.post' });

  // Il titolo non nomina l'autore: si saprebbe solo leggendo il post, e per
  // leggerlo bisogna avere il diritto di vederlo. Un titolo che lo rivelasse
  // trasformerebbe i metadati in una via laterale per scoprire chi ha scritto.
  return creaMetadata({
    lingua,
    percorso: percorsiApp.post(id),
    titolo: t('titoloSemplice'),
    noIndex: true,
  });
}

/**
 * Dettaglio di un post.
 *
 * I post non hanno una versione pubblica: si leggono solo da dentro l'app,
 * perché anche un post con visibilità "Pubblico" è aperto agli studenti
 * iscritti, non al web. Per questo la pagina non è generata in anticipo — non
 * esiste un elenco di post da pre-generare che non sia già un'esposizione.
 */
export default async function PaginaPost({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;
  const t = await getTranslations('app.post');

  return (
    <>
      <AppTopbar
        titolo={
          <Link
            href={percorsiApp.bacheca()}
            className="flex items-center gap-2 text-[14px] font-bold text-testo-tenue transition-colors hover:text-testo"
          >
            <Icona nome="indietro" dimensione={18} />
            {t('indietro')}
          </Link>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-[720px]">
          <DettaglioPost postId={id} />
        </div>
      </div>
    </>
  );
}
