import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { NavAdmin } from '@/components/app/admin/nav-admin';

/** Private area: never indexed. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.admin' });

  return creaMetadata({
    lingua,
    percorso: percorsiApp.admin(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * The admin panel frame. No sidebar entry: one account can use it, and for
 * everyone else the API answers 404, which the lists show as their error state.
 */
export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const t = await getTranslations('app.admin');

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="max-w-[880px]">
          <NavAdmin />
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </>
  );
}
