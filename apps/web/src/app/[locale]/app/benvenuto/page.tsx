import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsi } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { Logo } from '@/components/layout';
import { Heading, Icona } from '@/components/ui';
import { PassoUniversita } from '@/components/app/passo-universita';
import { Link } from '@/i18n/navigazione';

const PASSO_CORRENTE = 2;
const PASSI_TOTALI = 3;

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

  const avanzamento = Math.round((PASSO_CORRENTE / PASSI_TOTALI) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-tinta-menta-velo to-superficie">
      <header className="flex h-[68px] flex-none items-center border-b border-bordo bg-superficie/80 px-6 sm:px-10">
        <Link href="/" aria-label="Prome" className="text-testo">
          <Logo dimensione={28} />
        </Link>
        <span className="ml-auto text-[13px] font-bold text-testo-debole">
          {t('passo', { corrente: PASSO_CORRENTE, totale: PASSI_TOTALI })}
        </span>
      </header>

      <main className="flex flex-1 justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[760px]">
          {/* Barra continua invece di una lista di spunte: comunica
              avanzamento senza far sentire l'utente sotto esame. */}
          <div className="mb-8 flex items-center gap-4">
            <div
              role="progressbar"
              aria-valuenow={PASSO_CORRENTE}
              aria-valuemin={1}
              aria-valuemax={PASSI_TOTALI}
              aria-label={t('passo', { corrente: PASSO_CORRENTE, totale: PASSI_TOTALI })}
              className="h-2 flex-1 overflow-hidden rounded-full bg-bordo"
            >
              <div
                style={{ width: `${avanzamento}%` }}
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-[width] duration-500"
              />
            </div>
            <span className="text-[12.5px] font-extrabold text-testo-debole">
              {PASSO_CORRENTE}/{PASSI_TOTALI}
            </span>
          </div>

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

          <PassoUniversita />
        </div>
      </main>
    </div>
  );
}
