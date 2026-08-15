import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { DettaglioGruppo } from '@/components/app/dettaglio-gruppo';
import { Link } from '@/i18n/navigazione';
import { Icona } from '@/components/ui';

type Parametri = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const t = await getTranslations({ locale: lingua, namespace: 'app.gruppo' });

  // Il nome del gruppo non entra nel titolo della pagina: qui si rende sul
  // server, senza sessione, e leggerlo vorrebbe dire chiedere all'API un dato
  // che potrebbe non essere nostro da vedere.
  return creaMetadata({
    lingua,
    percorso: percorsiApp.gruppo(id),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/** Un gruppo visto da dentro. L'identità è l'id, non uno slug inventabile. */
export default async function PaginaGruppo({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;
  const t = await getTranslations('app.gruppo');

  return (
    <>
      <AppTopbar
        titolo={
          <Link
            href={percorsiApp.gruppi()}
            className="flex items-center gap-2 text-testo-tenue transition-colors hover:text-testo"
          >
            <Icona nome="indietro" dimensione={18} />
            <span className="font-display text-lg font-extrabold tracking-[-0.02em]">
              {t('titolo')}
            </span>
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DettaglioGruppo gruppoId={id} />
      </div>
    </>
  );
}
