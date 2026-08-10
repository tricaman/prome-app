import type { ReactNode } from 'react';
import { AppSidebar } from './app-sidebar';

/**
 * Cornice dell'area privata: colonna di navigazione fissa e contenuto che
 * scorre.
 *
 * È separata da quella del sito pubblico perché le due rispondono a bisogni
 * diversi — là si arriva da un motore di ricerca e si legge, qui si torna ogni
 * giorno e si lavora — e perché una modifica all'una non deve toccare l'altra.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-sfondo">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
