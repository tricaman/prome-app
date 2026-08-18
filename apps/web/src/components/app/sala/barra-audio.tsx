'use client';

import { useTranslations } from 'next-intl';
import { useAudiochat, type GuastoAudio } from '@/hooks/use-audiochat';
import { Button, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * La voce dell'aula.
 *
 * **Sta in una fascia inversa**, scura in tutti e due i temi come il piè di
 * pagina e l'intestazione dell'aula: usa i ruoli `superficie-inversa-*` e non
 * quelli della pagina.
 *
 * Tre cose che questo componente fa di proposito, e che sono E5.3:
 *
 * 1. **dichiara a cosa serve il microfono prima di chiederlo.** Un permesso
 *    chiesto senza motivazione si nega, e una volta negato non si richiede;
 * 2. **non promette ciò che non può mantenere**: senza il permesso di parlare
 *    il bottone non c'è, e al suo posto c'è la ragione. Scoprire un divieto da
 *    un errore, dopo aver premuto, somiglia a un guasto e non a una scelta di
 *    qualcun altro;
 * 3. **quando l'audio non parte, lo dice e resta lì.** Non svuota la sala, non
 *    mostra una schermata d'errore: il resto dell'aula continua a funzionare,
 *    che è la promessa di RE4 vista da chi la usa.
 */
export function BarraAudio({ aulaId, puoParlare }: { aulaId: string; puoParlare: boolean }) {
  const t = useTranslations('app.sala');
  const audio = useAudiochat(aulaId);

  const guasti: Record<GuastoAudio, { titolo: string; cosa: string }> = {
    microfono: { titolo: t('audioGuastoMicrofono'), cosa: t('audioGuastoMicrofonoCosa') },
    permesso: { titolo: t('audioGuastoPermesso'), cosa: t('audioGuastoPermessoCosa') },
    nonDisponibile: {
      titolo: t('audioGuastoNonDisponibile'),
      cosa: t('audioGuastoNonDisponibileCosa'),
    },
    rete: { titolo: t('audioGuastoRete'), cosa: t('audioGuastoReteCosa') },
  };

  return (
    <section className="rounded-[14px] bg-superficie-inversa p-3.5 text-superficie-inversa-testo">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-superficie-inversa-tenue">
        <Icona nome="microfono" dimensione={13} />
        {audio.stato === 'dentro'
          ? audio.microfonoAcceso
            ? t('audioDentro', { numero: audio.quanti })
            : t('audioMuto')
          : t('inAudio', { numero: audio.quanti })}
      </p>

      {audio.stato === 'dentro' ? (
        <div className="flex gap-2">
          {/* **Il microfono si accende quando parlo, e non prima.**
              Tre stati e non due: acceso e silenzioso è la condizione normale
              e sta in grigio — un microfono sempre evidenziato non direbbe
              niente — acceso e con la voce si illumina di menta, spento è
              barrato. Il segno viene dall'evento del server, lo stesso che
              decide chi appare come parlante agli altri: così quello che vedo
              su di me e quello che vedono loro non possono scostarsi. */}
          <Button
            variante="secondaria"
            size="sm"
            onPress={() => void audio.commutaMicrofono()}
            className={cn(
              'flex-1 transition-colors',
              audio.microfonoAcceso && audio.ioParlo
                ? 'bg-primario text-primario-testo ring-2 ring-primario/40'
                : 'text-superficie-inversa-tenue',
            )}
            aria-pressed={!audio.microfonoAcceso}
            iconaSinistra={
              audio.microfonoAcceso ? (
                <Icona nome="microfono" dimensione={14} />
              ) : (
                <Icona nome="microfonoSpento" dimensione={14} />
              )
            }
          >
            {audio.microfonoAcceso ? t('microfonoAttivo') : t('microfonoSpento')}
          </Button>
          <Button
            variante="secondaria"
            size="sm"
            onPress={() => void audio.esci()}
            aria-label={t('esciAudio')}
            iconaSinistra={<Icona nome="chiudi" dimensione={14} />}
          />
        </div>
      ) : puoParlare ? (
        <>
          {/* La motivazione d'uso **prima** del gesto, mai dopo. */}
          <p className="mb-2.5 text-[11.5px] leading-relaxed text-superficie-inversa-tenue">
            {t('audioMotivazione')}
          </p>
          <Button
            variante="primaria"
            size="sm"
            onPress={() => void audio.entra()}
            isDisabled={audio.stato === 'collegamento'}
            className="w-full"
            iconaSinistra={<Icona nome="microfono" dimensione={14} />}
          >
            {audio.stato === 'collegamento' ? t('audioCollegamento') : t('entraAudio')}
          </Button>
        </>
      ) : (
        <p className="text-[11.5px] leading-relaxed text-superficie-inversa-tenue">
          {t('audioGuastoPermessoCosa')}
        </p>
      )}

      {audio.guasto ? (
        <div
          role="status"
          className="mt-2.5 rounded-[10px] bg-superficie-inversa-debole p-2.5 text-[11.5px] leading-relaxed"
        >
          <strong className="block font-extrabold">{guasti[audio.guasto].titolo}</strong>
          <span className="text-superficie-inversa-tenue">{guasti[audio.guasto].cosa}</span>
        </div>
      ) : null}
    </section>
  );
}
