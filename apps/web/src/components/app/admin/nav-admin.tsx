'use client';

import { useTranslations } from 'next-intl';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link, usePathname } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

const SEZIONI = [
  { chiave: 'segnalazioni', href: percorsiApp.adminSegnalazioni() },
  { chiave: 'utenti', href: percorsiApp.adminUtenti() },
  { chiave: 'post', href: percorsiApp.adminPost() },
] as const;

/** The admin panel sections, one route each. */
export function NavAdmin() {
  const t = useTranslations('app.admin');
  const percorso = usePathname();

  return (
    <nav aria-label={t('titolo')} className="flex flex-wrap gap-2">
      {SEZIONI.map((sezione) => {
        const attiva = percorso.startsWith(sezione.href);

        return (
          <Link
            key={sezione.chiave}
            href={sezione.href}
            aria-current={attiva ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center rounded-xl px-4 text-[14px] transition-colors',
              attiva
                ? 'bg-tinta-menta font-extrabold text-primario-accento'
                : 'font-semibold text-testo-corpo hover:bg-superficie-alt-2',
            )}
          >
            {t(`sezioni.${sezione.chiave}`)}
          </Link>
        );
      })}
    </nav>
  );
}
