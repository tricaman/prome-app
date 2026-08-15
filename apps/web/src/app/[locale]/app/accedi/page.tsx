import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import {
  PARAMETRO_DESTINAZIONE,
  destinazioneDopoAccesso,
  percorsiApp,
} from '@/lib/percorsi-app';
import { Logo } from '@/components/layout';
import { Heading } from '@/components/ui';
import { AnteprimaAula } from '@/components/marketing/anteprima-aula';
import { ModuloAccesso } from '@/components/app/modulo-accesso';
import { SoloSenzaSessione } from '@/components/app/sessione-richiesta';
import { Link } from '@/i18n/navigazione';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.accesso' });
  // Area privata: nessun motore di ricerca deve indicizzarla.
  return creaMetadata({
    lingua,
    percorso: percorsiApp.accedi(),
    titolo: t('titolo'),
    descrizione: t('sommario'),
    noIndex: true,
  });
}

/**
 * Accesso.
 *
 * Schermo diviso: il modulo a sinistra, la prova a destra. Il pannello con
 * l'aula studio dal vivo risponde all'obiezione implicita di chi sta per
 * registrarsi — "ci sono davvero persone dentro?" — e il modulo resta stretto,
 * perché una riga di input larga tutto lo schermo si legge male.
 */
export default async function PaginaAccesso({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.accesso');

  // La destinazione si legge e si convalida **qui**, non nel modulo: da questo
  // punto in poi è un percorso nostro, e nessuno deve più chiedersi da dove
  // venga. Un array (`?da=a&da=b`) non è una destinazione: vale il ripiego.
  const richiesta = (await searchParams)[PARAMETRO_DESTINAZIONE];
  const destinazione = destinazioneDopoAccesso(
    typeof richiesta === 'string' ? richiesta : null,
  );

  return (
    <SoloSenzaSessione destinazione={destinazione}>
      <div className="flex min-h-screen bg-superficie">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-16 lg:px-24">
          <Link href="/" aria-label="Prome" className="mb-10 inline-flex text-testo">
            <Logo dimensione={32} />
          </Link>

          {/* L'intestazione sta dentro il modulo, non qui: cambia col passo, e
              lasciarla fuori significherebbe promettere «ti arriva un codice»
              anche dopo averlo mandato. */}
          <ModuloAccesso destinazione={destinazione} />
        </div>

        <aside className="relative hidden w-[560px] flex-none flex-col justify-center overflow-hidden bg-gradient-to-b from-tinta-menta to-tinta-menta-velo px-14 xl:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-36 -top-40 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(50,224,196,.35),rgba(50,224,196,0)_68%)]"
          />
          <div className="relative">
            <Heading taglia="lg" className="text-tinta-menta-testo">
              {t.rich('provaTitolo', {
                accento: (parti) => <span className="text-primario-collegamento">{parti}</span>,
              })}
            </Heading>
            <p className="mb-8 mt-3.5 max-w-[400px] text-base leading-relaxed text-primario-accento">
              {t('provaTesto')}
            </p>
            <div className="max-w-[420px]">
              <AnteprimaAula />
            </div>
          </div>
        </aside>
      </div>
    </SoloSenzaSessione>
  );
}
