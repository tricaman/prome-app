import { useTranslations } from 'next-intl';
import { TarghettaAllegato } from '@/components/contenuti';
import { Avatar } from '@/components/ui';

/**
 * Illustrazione di un'aula studio, mostrata nella pagina iniziale.
 *
 * Non è uno screenshot ma il componente vero: la barra audio con l'anello che
 * pulsa, la chat e un materiale condiviso. Mostra in due secondi la parte di
 * prodotto che a parole non si capisce.
 *
 * I contenuti sono inventati e la figura è dichiarata come esempio: nessuna
 * aula studio reale compare sul sito pubblico, nemmeno quelle con visibilità
 * "Pubblico", che nel dominio significa aperta agli studenti iscritti.
 */
export function AnteprimaAula() {
  const t = useTranslations('home.anteprima');
  // Il nome sta nel catalogo insieme al testo che lo nomina: è da lì che
  // l'avatar ricava la propria tinta, e così i due non possono divergere.
  const nome = t('nome');

  return (
    <figure
      aria-label={t('etichetta')}
      className="m-0 overflow-hidden rounded-[20px] border border-bordo bg-superficie shadow-xl"
    >
      <div className="flex items-center gap-3 bg-superficie-inversa px-4 py-3.5">
        <span className="relative flex-none">
          <Avatar nome={nome} dimensione={34} soloColore className="animate-pulse" />
          <span
            aria-hidden
            className="absolute -inset-[3px] rounded-full border-2 border-primary-500"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold text-superficie-inversa-testo">
            {t('chiParla')}
          </span>
          {/* Siamo dentro la barra scura dell'aula, non sulla pagina: il colore
              va preso dai ruoli di quella fascia, che restano gli stessi nei
              due temi. */}
          <span className="mt-0.5 block truncate text-[11px] text-superficie-inversa-tenue">
            {t('contesto')}
          </span>
        </span>
        <BarreAudio />
      </div>

      <div className="flex flex-col gap-3 bg-superficie-alt p-4">
        <div className="flex items-end gap-2.5">
          <Avatar nome={nome} dimensione={26} soloColore />
          <p className="max-w-[76%] rounded-[16px_16px_16px_5px] border border-superficie-alt-2 bg-superficie px-3 py-2.5 text-[13px] leading-relaxed text-testo-corpo">
            {t('messaggio1')}
          </p>
        </div>
        <div className="flex flex-row-reverse items-end gap-2.5">
          <p className="max-w-[76%] rounded-[16px_16px_5px_16px] border border-tinta-menta-bordo bg-tinta-menta px-3 py-2.5 text-[13px] leading-relaxed text-testo-corpo">
            {t('messaggio2')}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-tinta-menta-bordo bg-superficie px-3 py-2.5">
          <TarghettaAllegato tipo="pdf" className="h-[34px] w-[30px]" />
          <span className="truncate text-xs font-bold text-testo-corpo">{t('allegato')}</span>
        </div>
      </div>
    </figure>
  );
}

/** Tre barre che oscillano: il segnale visivo di "qualcuno sta parlando". */
function BarreAudio() {
  return (
    <span aria-hidden className="flex h-3.5 flex-none items-end gap-[2.5px]">
      {[0, 0.15, 0.3].map((ritardo) => (
        <span
          key={ritardo}
          style={{ animationDelay: `${ritardo}s` }}
          className="block h-full w-[3px] animate-[onda_0.9s_ease-in-out_infinite] rounded-sm bg-primary-500"
        />
      ))}
    </span>
  );
}
