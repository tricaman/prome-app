import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsi } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { Logo } from '@/components/layout';
import { Heading, Icona } from '@/components/ui';
import { ModuloOnboarding } from '@/components/app/modulo-onboarding';
import { RichiedeSessione } from '@/components/app/sessione-richiesta';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.onboarding' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.benvenuto(),
    titolo: t('titolo'),
    descrizione: t('sommario'),
    noIndex: true,
  });
}

/**
 * Onboarding, secondo passo.
 *
 * Una domanda per schermata anche su desktop: la tentazione di mettere nome,
 * università e corso in un modulo unico va evitata, perché la ricerca
 * dell'ateneo ha bisogno di spazio.
 *
 * La nota sul trattamento dei dati sta sopra il campo, non in fondo: è lì che
 * l'utente decide se fidarsi.
 */
export default async function PaginaBenvenuto({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.onboarding');


  return (
    <RichiedeSessione>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-tinta-menta-velo to-superficie">
        <header className="flex h-[68px] flex-none items-center border-b border-bordo bg-superficie/80 px-6 sm:px-10">
          <Link href="/" aria-label="Prome" className="text-testo">
            <Logo dimensione={28} />
          </Link>
        </header>

        <main className="flex flex-1 justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[760px]">
            <Heading livello={1} taglia="xl">
              {t('titolo')}
            </Heading>
            <p className="mb-6 mt-3 max-w-[560px] text-base leading-relaxed text-testo-tenue">
              {t('sommario')}
            </p>

            <div className="mb-7 flex max-w-[640px] gap-3.5 rounded-[18px] border border-tinta-menta-bordo bg-primario-tenue p-5">
              <span className="grid size-9 flex-none place-items-center rounded-xl bg-superficie text-primario-accento">
                <Icona nome="lucchetto" dimensione={18} />
              </span>
              <p className="text-[13.5px] leading-relaxed text-primario-accento">
                {t('privacy')}{' '}
                <Link href={percorsi.privacy()} className="font-extrabold underline">
                  {t('comeLiUsiamo')}
                </Link>
              </p>
            </div>

            <ModuloOnboarding />
          </div>
        </main>
      </div>
    </RichiedeSessione>
  );
}
