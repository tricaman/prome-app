'use client';

import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * Passaggio tra tema chiaro e scuro.
 *
 * Le due icone sono entrambe nel documento e si scambiano via CSS: il tema
 * reale si conosce solo nel browser, e disegnarne una sola in base allo stato
 * farebbe apparire al server un'icona diversa da quella del browser.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('tema');
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={t('etichetta')}
      className={cn(
        'grid size-9 place-items-center rounded-full bg-superficie-alt-2 text-base transition-colors hover:text-primario-collegamento',
        className,
      )}
    >
      <span aria-hidden className="dark:hidden">
        🌙
      </span>
      <span aria-hidden className="hidden dark:block">
        ☀️
      </span>
    </button>
  );
}
