import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export interface SiteShellProps {
  /**
   * Sfondo del corpo pagina: `tenue` per le pagine a schede (la maggior
   * parte), `piena` per quelle editoriali che si leggono su bianco.
   */
  sfondo?: 'tenue' | 'piena';
  children: ReactNode;
}

/**
 * Cornice di ogni pagina pubblica: intestazione, contenuto, piè di pagina.
 *
 * Sta in un componente e non nel layout della rotta perché l'area privata
 * dell'applicazione avrà una cornice diversa: tenerle separate evita che una
 * modifica al sito pubblico si ripercuota sull'app.
 */
export function SiteShell({ sfondo = 'tenue', children }: SiteShellProps) {
  return (
    <>
      <SiteHeader />
      <main
        className={cn(
          'flex-1',
          sfondo === 'tenue' ? 'bg-sfondo' : 'bg-superficie',
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
