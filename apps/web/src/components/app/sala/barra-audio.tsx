'use client';

import { useTranslations } from 'next-intl';
import { Avatar, AvatarParlante, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface BarraAudioProps {
  /** La persona è collegata al canale audio. */
  inAudio: boolean;
  microfonoSpento: boolean;
  /** Chi ha il permesso Parlare può entrare; gli altri restano in ascolto. */
  puoParlare: boolean;
  personeInAudio: readonly string[];
  partecipantiTotali: number;
  onEntra: () => void;
  onEsci: () => void;
  onAlternaMicrofono: () => void;
}

/**
 * Barra dell'audio dell'aula studio.
 *
 * Sta in fondo, su fondo scuro, e resta visibile qualunque scheda si stia
 * guardando: l'audio è l'unica cosa che continua mentre si fa altro, e deve
 * poter essere interrotta in un gesto.
 *
 * Quando l'audio non è disponibile la barra sparisce e il resto dell'aula
 * continua a funzionare: la chat e i materiali non dipendono dal canale voce.
 */
export function BarraAudio({
  inAudio,
  microfonoSpento,
  puoParlare,
  personeInAudio,
  partecipantiTotali,
  onEntra,
  onEsci,
  onAlternaMicrofono,
}: BarraAudioProps) {
  const t = useTranslations('app.sala');

  const stato = inAudio
    ? microfonoSpento
      ? t('audioMuto')
      : t('audioDentro', { numero: personeInAudio.length + 1 })
    : t('audioFuori', { dentro: personeInAudio.length, totale: partecipantiTotali });

  return (
    <div className="flex flex-none flex-wrap items-center gap-4 bg-superficie-inversa px-6 py-3.5">
      <AvatarParlante nome={personeInAudio[0] ?? 'Giulia Ferrari'} dimensione={42} soloColore />

      <div className="min-w-0">
        <p className="flex items-center gap-2.5">
          <span className="text-sm font-extrabold text-superficie-inversa-testo">
            {t('staParlando', { nome: personeInAudio[0] ?? 'Giulia' })}
          </span>
          <BarreAudio />
        </p>
        <p className="mt-0.5 text-xs text-testo-debole">{stato}</p>
      </div>

      <span className="ml-4 hidden items-center gap-2 sm:flex">
        {personeInAudio.map((nome, indice) =>
          indice === 0 ? (
            <AvatarParlante key={nome} nome={nome} dimensione={32} soloColore />
          ) : (
            <Avatar key={nome} nome={nome} dimensione={32} soloColore />
          ),
        )}
      </span>

      <div className="ml-auto flex flex-none items-center gap-2.5">
        {inAudio ? (
          <>
            <button
              type="button"
              onClick={onAlternaMicrofono}
              className={cn(
                'flex h-[42px] items-center gap-2 rounded-xl px-4 text-[13px] font-extrabold transition-colors',
                microfonoSpento
                  ? 'bg-tinta-ambra/20 text-tinta-ambra-bordo'
                  : 'bg-white/10 text-neutral-200 hover:bg-white/15',
              )}
            >
              <Icona nome="microfono" dimensione={17} />
              {microfonoSpento ? t('microfonoSpento') : t('microfonoAttivo')}
            </button>
            <button
              type="button"
              onClick={onEsci}
              className="h-[42px] rounded-xl bg-errore/20 px-4 text-[13px] font-extrabold text-danger-300"
            >
              {t('esciAudio')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onEntra}
            disabled={!puoParlare}
            className="flex h-[42px] items-center gap-2 rounded-xl bg-primario px-5 text-[13.5px] font-extrabold text-primario-testo transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            <Icona nome="microfono" dimensione={17} />
            {t('entraAudio')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Quattro barre che oscillano: il segnale di "qualcuno sta parlando ora". */
function BarreAudio() {
  return (
    <span aria-hidden className="flex h-3.5 flex-none items-end gap-[2.5px]">
      {[0, 0.15, 0.3, 0.45].map((ritardo) => (
        <span
          key={ritardo}
          style={{ animationDelay: `${ritardo}s` }}
          className="block h-full w-[3px] animate-[onda_0.9s_ease-in-out_infinite] rounded-sm bg-primary-500"
        />
      ))}
    </span>
  );
}
