import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AULE_IN_CORSO, AULE_PROGRAMMATE, FILE_CARTELLA, MIEI_GRUPPI, UTENTE } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AlberoCartelle } from '@/components/app/albero-cartelle';
import { SIGLA_ALLEGATO, TONO_ALLEGATO } from '@/components/contenuti';
import { Breadcrumb } from '@/components/layout';
import { Button, Card, Chip, Icona } from '@/components/ui';
import { Link } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

type Parametri = { locale: string; slug: string };

const ANTEPRIME = {
  rosa: 'bg-gradient-to-br from-tinta-rosa to-tinta-rosa-bordo text-tinta-rosa-testo',
  blu: 'bg-gradient-to-br from-tinta-blu to-tinta-blu-bordo text-tinta-blu-testo',
  menta: 'bg-gradient-to-br from-tinta-menta to-tinta-menta-bordo text-tinta-menta-testo',
  ambra: 'bg-gradient-to-br from-tinta-ambra to-tinta-ambra-bordo text-tinta-ambra-testo',
  verde: 'bg-gradient-to-br from-tinta-verde to-tinta-verde-bordo text-tinta-verde-testo',
  neutro: 'bg-superficie-alt-2 text-testo-tenue',
} as const;

export function generateStaticParams() {
  return MIEI_GRUPPI.map((gruppo) => ({ slug: gruppo.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { slug } = await params;
  const gruppo = MIEI_GRUPPI.find((voce) => voce.slug === slug);
  if (!gruppo) notFound();

  return creaMetadata({
    lingua,
    percorso: percorsiApp.gruppo(slug),
    titolo: gruppo.nome,
    noIndex: true,
  });
}

/**
 * Un gruppo visto da dentro.
 *
 * A sinistra l'albero delle cartelle, a destra il contenuto di quella scelta:
 * è l'archivio del gruppo, e a differenza della pagina pubblica qui si vedono
 * tutti i livelli e tutti i file.
 */
export default async function PaginaGruppoApp({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { slug } = await params;
  const gruppo = MIEI_GRUPPI.find((voce) => voce.slug === slug);
  if (!gruppo) notFound();

  const t = await getTranslations('app.gruppo');
  const aule = [...AULE_IN_CORSO.slice(0, 1), ...AULE_PROGRAMMATE.slice(0, 2)];

  const schede = ['cartelle', 'chat', 'membri', 'impostazioni'] as const;

  return (
    <>
      <header className="flex-none border-b border-bordo bg-superficie px-5 pt-4 sm:px-7">
        <div className="flex flex-wrap items-center gap-3.5">
          <span
            aria-hidden
            className="size-13 flex-none rounded-2xl bg-gradient-to-br from-primary-200 to-primary-500"
            style={{ width: 52, height: 52 }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[22px] font-extrabold tracking-[-0.025em]">
              {gruppo.nome}
            </h1>
            <p className="mt-1 text-[12.5px] text-testo-didascalia">
              {t('sottotitolo', {
                membri: 34,
                ateneo: UTENTE.ateneo,
                visibilita: 'pubblico',
              })}
            </p>
          </div>
          <div className="flex flex-none flex-wrap gap-2.5">
            <Button variante="contorno" className="h-10 rounded-xl px-4 text-[13.5px]">
              {t('invitaMembri')}
            </Button>
            <Button
              className="h-10 rounded-xl px-4 text-[13.5px]"
              iconaSinistra={<Icona nome="piu" dimensione={16} />}
            >
              {t('nuovaAula')}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-6 overflow-x-auto">
          {schede.map((scheda, indice) => (
            <span
              key={scheda}
              className={cn(
                'flex-none border-b-[2.5px] pb-3 text-sm',
                indice === 0
                  ? 'border-primary-500 font-extrabold text-primario-accento'
                  : 'border-transparent font-semibold text-testo-tenue',
              )}
            >
              {t(`schede.${scheda}`)}
            </span>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block">
          <AlberoCartelle />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <Breadcrumb
            voci={[
              { etichetta: gruppo.nome, href: percorsiApp.gruppo(slug) },
              { etichetta: 'Secondo anno', href: percorsiApp.gruppo(slug) },
              { etichetta: 'Analisi 2' },
            ]}
            className="mb-4"
          />

          <ul className="mb-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {FILE_CARTELLA.map((file) => {
              const tono = TONO_ALLEGATO[file.tipo];
              return (
                <li key={file.nome}>
                  <Card padding="nessuno" className="overflow-hidden">
                    <span
                      aria-hidden
                      className={cn(
                        'grid h-[100px] place-items-center text-[10px] font-extrabold tracking-widest',
                        ANTEPRIME[tono],
                      )}
                    >
                      {SIGLA_ALLEGATO[file.tipo]}
                    </span>
                    <span className="block px-3.5 py-3">
                      <span className="block truncate text-[13px] font-extrabold text-testo">
                        {file.nome}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-testo-didascalia">
                        {file.dettaglio}
                      </span>
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>

          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {t('auleInCartella')}
            </span>
            <span aria-hidden className="h-px flex-1 bg-bordo" />
          </div>

          <ul className="flex flex-col gap-3">
            {aule.map((aula) => {
              const inCorso = 'partecipanti' in aula;
              return (
                <li key={aula.id}>
                  <Card
                    padding="nessuno"
                    className="flex flex-wrap items-center gap-4 rounded-[14px] px-4 py-4"
                  >
                    <Chip tono={inCorso ? 'menta' : 'ambra'} indicatore={inCorso} pulsante={inCorso}>
                      {inCorso ? 'in corso' : 'programmata'}
                    </Chip>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold text-testo">
                        {aula.titolo}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-testo-didascalia">
                        {inCorso ? aula.contesto : `${aula.giorno} ${aula.mese} · ${aula.ora}`}
                      </span>
                    </span>
                    <Link href={percorsiApp.aulaStudio(aula.id)} className="flex-none">
                      <Button variante="contorno" className="h-9 px-4 text-[12.5px]">
                        {t('apri')}
                      </Button>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
