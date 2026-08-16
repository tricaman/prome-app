'use client';

import { useTranslations } from 'next-intl';
import { useTema } from '@/providers/tema';
import { Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Passaggio tra tema chiaro e scuro.
 *
 * Le due icone sono entrambe nel documento e si scambiano via CSS: il tema
 * reale si conosce solo nel browser, e disegnarne una sola in base allo stato
 * farebbe apparire al server un'icona diversa da quella del browser.
 *
 * Sono i tracciati del design system, non emoji: un'emoji la disegna il
 * sistema operativo, quindi porta i propri colori — un sole giallo acceso in
 * mezzo a un'interfaccia menta — e cambia forma da un dispositivo all'altro.
 * Queste seguono `currentColor`, quindi stanno in tono in entrambi i temi.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('tema');
  const { risolto, imposta } = useTema();

  return (
    <button
      type="button"
      onClick={() => imposta(risolto === 'dark' ? 'light' : 'dark')}
      aria-label={t('etichetta')}
      className={cn(
        'grid size-9 place-items-center rounded-full bg-superficie-alt-2 text-testo-tenue transition-colors hover:text-primario-collegamento',
        className,
      )}
    >
      <Icona nome="luna" dimensione={18} className="dark:hidden" />
      <Icona nome="sole" dimensione={18} className="hidden dark:block" />
    </button>
  );
}
