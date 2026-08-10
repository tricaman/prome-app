'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ATENEI } from '@/content';
import { Button, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Secondo passo dell'onboarding: la scelta dell'ateneo.
 *
 * Ha una schermata tutta sua perché la ricerca su un centinaio di atenei ha
 * bisogno di spazio verticale per i risultati; comprimerla in un modulo unico
 * insieme a nome e corso la renderebbe scomoda proprio dove serve precisione.
 *
 * Si completa da tastiera: ↑↓ per scorrere i risultati, Invio per scegliere.
 */
export function PassoUniversita() {
  const t = useTranslations('app.onboarding');
  const [ricerca, setRicerca] = useState('');
  const [scelto, setScelto] = useState<string | null>(null);
  const [evidenziato, setEvidenziato] = useState(0);

  const risultati = useMemo(() => {
    const termine = ricerca.trim().toLowerCase();
    const trovati = termine
      ? ATENEI.filter((ateneo) => ateneo.nome.toLowerCase().includes(termine))
      : ATENEI;
    return trovati.slice(0, 4);
  }, [ricerca]);

  const gestisciTasto = (tasto: string) => {
    if (tasto === 'ArrowDown') {
      setEvidenziato((corrente) => Math.min(corrente + 1, risultati.length - 1));
    } else if (tasto === 'ArrowUp') {
      setEvidenziato((corrente) => Math.max(corrente - 1, 0));
    } else if (tasto === 'Enter') {
      const ateneo = risultati[evidenziato];
      if (ateneo) setScelto(ateneo.slug);
    }
  };

  return (
    <div className="max-w-[640px]">
      <label htmlFor="ricerca-ateneo" className="mb-2 block text-[12.5px] font-extrabold text-testo-tenue">
        {t('universita')}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-4 text-testo-debole">
          <Icona nome="cerca" dimensione={19} />
        </span>
        <input
          id="ricerca-ateneo"
          value={ricerca}
          autoFocus
          placeholder={t('cercaUniversita')}
          onChange={(evento) => {
            setRicerca(evento.target.value);
            setEvidenziato(0);
          }}
          onKeyDown={(evento) => gestisciTasto(evento.key)}
          className="h-[52px] w-full rounded-[14px] border-2 border-primary-500 bg-superficie pl-11 pr-4 text-[15px] font-semibold outline-none"
        />
      </div>

      {risultati.length ? (
        <ul className="mt-2.5 overflow-hidden rounded-2xl border border-bordo bg-superficie shadow-lg">
          {risultati.map((ateneo, indice) => {
            const attivo = ateneo.slug === scelto;
            return (
              <li key={ateneo.slug}>
                <button
                  type="button"
                  onClick={() => setScelto(ateneo.slug)}
                  onMouseEnter={() => setEvidenziato(indice)}
                  aria-pressed={attivo}
                  className={cn(
                    'flex w-full items-center gap-3.5 border-b border-superficie-alt-2 px-4 py-3.5 text-left transition-colors last:border-b-0',
                    attivo
                      ? 'bg-tinta-menta-velo'
                      : indice === evidenziato
                        ? 'bg-superficie-alt'
                        : 'bg-superficie',
                  )}
                >
                  <span
                    aria-hidden
                    className="grid size-9 flex-none place-items-center rounded-xl bg-tinta-menta text-xs font-extrabold text-primario-accento"
                  >
                    {ateneo.nomeBreve.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-extrabold text-testo">
                      {ateneo.nome}
                    </span>
                    <span className="block truncate text-xs text-testo-didascalia">
                      {ateneo.citta}
                    </span>
                  </span>
                  {attivo ? (
                    <span aria-hidden className="text-base font-extrabold text-primary-600">
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-testo-tenue">{t('nessunRisultato')}</p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button variante="contorno" className="h-[50px] border-2 px-6 text-[15px]">
          {t('indietro')}
        </Button>
        <Button
          isDisabled={!scelto}
          className="h-[50px] px-7 text-[15px] shadow-marchio"
        >
          {t('continua')}
        </Button>
        <span className="ml-auto text-[12.5px] text-testo-debole">
          {t('nonTrovi')} <button type="button" className="font-extrabold text-primario-collegamento">{t('scrivicelo')}</button>
        </span>
      </div>
    </div>
  );
}
