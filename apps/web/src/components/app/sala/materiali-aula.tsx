import { useTranslations } from 'next-intl';
import { MATERIALI_AULA, type FileDiAula } from '@/content';
import { Button, Card, Icona } from '@/components/ui';
import { SIGLA_ALLEGATO, TONO_ALLEGATO } from '@/components/contenuti';
import { cn } from '@/lib/utils';

const ANTEPRIME = {
  rosa: 'bg-gradient-to-br from-tinta-rosa to-tinta-rosa-bordo text-tinta-rosa-testo',
  blu: 'bg-gradient-to-br from-tinta-blu to-tinta-blu-bordo text-tinta-blu-testo',
  menta: 'bg-gradient-to-br from-tinta-menta to-tinta-menta-bordo text-tinta-menta-testo',
  ambra: 'bg-gradient-to-br from-tinta-ambra to-tinta-ambra-bordo text-tinta-ambra-testo',
  verde: 'bg-gradient-to-br from-tinta-verde to-tinta-verde-bordo text-tinta-verde-testo',
  neutro: 'bg-superficie-alt-2 text-testo-tenue',
} as const;

/**
 * Materiali dell'aula studio, raggruppati per Argomento.
 *
 * L'ultimo gruppo è "senza argomento": i file caricati in fretta durante una
 * sessione finiscono lì e restano usabili: obbligare a scegliere un argomento
 * al momento del caricamento farebbe smettere di caricare.
 */
export function MaterialiAula() {
  const t = useTranslations('app.sala');
  const totale = MATERIALI_AULA.reduce((somma, gruppo) => somma + gruppo.file.length, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-sfondo px-6 py-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button
          className="h-[42px] rounded-[14px] px-4 text-[13.5px]"
          iconaSinistra={<Icona nome="carica" dimensione={17} />}
        >
          {t('caricaMateriale')}
        </Button>
        <Button variante="contorno" className="h-[42px] rounded-[14px] px-4 text-[13.5px]">
          + {t('nuovoArgomento')}
        </Button>
        <span className="ml-auto text-[12.5px] font-bold text-testo-debole">
          {t('conteggioFile', { numero: totale })}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {MATERIALI_AULA.map((gruppo) => (
          <section key={gruppo.nome ?? 'senza-argomento'}>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'size-2.5 rounded',
                  gruppo.nome ? 'bg-primary-500' : 'bg-bordo-forte',
                )}
              />
              <h3
                className={cn(
                  'font-display text-[17px] font-extrabold tracking-[-0.015em]',
                  gruppo.nome ? 'text-testo' : 'text-testo-tenue',
                )}
              >
                {gruppo.nome ?? t('senzaArgomento')}
              </h3>
              <span className="text-[11.5px] font-bold text-testo-debole">
                {t('numeroFile', { numero: gruppo.file.length })}
              </span>
              {!gruppo.nome ? (
                <button
                  type="button"
                  className="ml-auto text-xs font-extrabold text-primario-collegamento hover:text-primario-accento"
                >
                  {t('assegnaArgomento')}
                </button>
              ) : null}
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gruppo.file.map((file) => (
                <li key={file.nome}>
                  <SchedaFile file={file} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function SchedaFile({ file }: { file: FileDiAula }) {
  const tono = TONO_ALLEGATO[file.tipo];

  return (
    <Card padding="nessuno" className="overflow-hidden">
      <span
        aria-hidden
        className={cn(
          'grid h-24 place-items-center text-[10px] font-extrabold tracking-widest',
          ANTEPRIME[tono],
        )}
      >
        {SIGLA_ALLEGATO[file.tipo]}
      </span>
      <span className="block px-3.5 py-3">
        <span className="block truncate text-[13px] font-extrabold text-testo">{file.nome}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-testo-didascalia">
          {file.dettaglio}
        </span>
      </span>
    </Card>
  );
}
