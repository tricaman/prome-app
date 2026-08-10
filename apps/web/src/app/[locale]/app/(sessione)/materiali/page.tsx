import { getTranslations } from 'next-intl/server';
import { FILE_CARTELLA } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { AllegatoRiga } from '@/components/contenuti';
import { Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.nav' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.materiali(),
    titolo: t('materiali'),
    noIndex: true,
  });
}

/**
 * Materiali salvati: la raccolta personale di ciò che si è messo da parte
 * dalla bacheca e dalle aule studio.
 */
export default async function PaginaMateriali({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.nav');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('materiali')}
          </span>
        }
      />

      <div className="mx-auto w-full max-w-[1000px] px-5 py-6 sm:px-8">
        <Card padding="nessuno" className="overflow-hidden">
          <ul>
            {FILE_CARTELLA.map((file, indice) => (
              <li
                key={file.nome}
                className={
                  indice < FILE_CARTELLA.length - 1 ? 'border-b border-superficie-alt-2' : undefined
                }
              >
                <AllegatoRiga
                  allegato={{
                    nome: file.nome,
                    tipo: file.tipo,
                    dimensione: '',
                    caricatoDa: '',
                  }}
                  dettaglio={file.dettaglio}
                  variante="nuda"
                  className="px-5 py-4"
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
