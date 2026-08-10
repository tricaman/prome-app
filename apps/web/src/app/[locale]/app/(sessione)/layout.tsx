import type { ReactNode } from 'react';
import { AppShell } from '@/components/app/app-shell';

/**
 * Cornice delle schermate che richiedono una sessione.
 *
 * Accesso e onboarding stanno fuori da questo gruppo di rotte perché non hanno
 * la colonna di navigazione: mostrarla prima che ci sia un account sarebbe
 * un'anticipazione senza contenuto.
 */
export default function LayoutSessione({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
