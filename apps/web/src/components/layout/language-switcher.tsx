'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LINGUE_SUPPORTATE, type Lingua } from '@prome/i18n';
import { usePathname, useRouter } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

/**
 * Cambio di lingua.
 *
 * Resta sulla stessa pagina e ne apre la traduzione: la scelta viene ricordata
 * in un cookie, quindi vale anche alle visite successive.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('lingua');
  const linguaAttiva = useLocale();
  const percorso = usePathname();
  const router = useRouter();
  const [inTransizione, avviaTransizione] = useTransition();

  const cambia = (lingua: Lingua) => {
    if (lingua === linguaAttiva) return;
    avviaTransizione(() => {
      router.replace(percorso, { locale: lingua });
    });
  };

  return (
    <div
      role="group"
      aria-label={t('etichetta')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-superficie-alt p-1',
        inTransizione && 'opacity-60',
        className,
      )}
    >
      {LINGUE_SUPPORTATE.map((lingua) => {
        const attiva = lingua === linguaAttiva;
        return (
          <button
            key={lingua}
            type="button"
            lang={lingua}
            aria-current={attiva ? 'true' : undefined}
            onClick={() => cambia(lingua)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors',
              attiva ? 'bg-primario text-primario-testo' : 'text-testo-tenue hover:text-testo',
            )}
          >
            <span className="sr-only">{t(lingua)}</span>
            <span aria-hidden>{lingua}</span>
          </button>
        );
      })}
    </div>
  );
}
