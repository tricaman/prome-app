'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigazione';
import { NAV_PRINCIPALE } from '@/lib/navigazione-sito';
import { percorsi } from '@/content';
import { percorsiApp } from '@/lib/percorsi-app';
import { cn } from '@/lib/utils';
import { ButtonLink } from '@/components/ui';
import { Container } from './container';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

/**
 * Intestazione del sito pubblico.
 *
 * Resta agganciata in alto con un velo sfocato: mentre si scorre una pagina
 * lunga l'accesso e la registrazione devono restare a portata, senza rubare
 * contrasto al contenuto sotto.
 *
 * La voce attiva si ricava dal percorso corrente invece di essere passata da
 * ogni pagina: una pagina in meno da ricordare quando se ne aggiunge una.
 */
export function SiteHeader() {
  const t = useTranslations('sito');
  const percorso = usePathname();

  const eAttiva = (href: string) =>
    href === percorsi.home() ? percorso === href : percorso.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-bordo bg-superficie/85 backdrop-blur-md">
      <Container className="flex h-[68px] items-center gap-7">
        <Link href={percorsi.home()} aria-label="Prome" className="flex-none text-testo">
          <Logo />
        </Link>

        <nav aria-label="Principale" className="hidden items-center gap-1 lg:flex">
          {NAV_PRINCIPALE.map((voce) => {
            const attiva = eAttiva(voce.href);
            return (
              <Link
                key={voce.chiave}
                href={voce.href}
                aria-current={attiva ? 'page' : undefined}
                className={cn(
                  'rounded-[10px] px-3 py-2 text-sm transition-colors hover:bg-superficie-alt-2',
                  attiva ? 'font-extrabold text-primario-accento' : 'font-semibold text-testo-corpo',
                )}
              >
                {t(`nav.${voce.chiave}`)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-none items-center gap-2.5">
          <ThemeToggle className="hidden sm:grid" />
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {/* Due inviti, una sola destinazione: l'accesso è unificato — si
              scrive l'email e arriva un codice — e chi non ha ancora un
              account lo ottiene percorrendo lo stesso modulo. Le due etichette
              restano perché parlano a due intenzioni diverse, non a due flussi
              diversi. */}
          <ButtonLink
            href={percorsiApp.accedi()}
            variante="fantasma"
            className="h-10 px-4 text-sm font-bold"
          >
            {t('accedi')}
          </ButtonLink>
          <ButtonLink href={percorsiApp.accedi()} className="h-10 px-5 text-sm shadow-marchio">
            {t('registrati')}
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
