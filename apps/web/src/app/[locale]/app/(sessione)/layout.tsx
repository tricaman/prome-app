import type { ReactNode } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { RichiedeSessione } from '@/components/app/sessione-richiesta';

/**
 * Cornice delle schermate che richiedono una sessione.
 *
 * Accesso e onboarding stanno fuori da questo gruppo di rotte perché non hanno
 * la colonna di navigazione: mostrarla prima che ci sia un account sarebbe
 * un'anticipazione senza contenuto.
 *
 * Il muro sta **fuori** dalla cornice, non dentro le pagine: così una schermata
 * nuova nasce protetta per il solo fatto di essere in questo gruppo di rotte —
 * la stessa scelta della guardia globale dell'API, e per la stessa ragione.
 */
export default function LayoutSessione({ children }: { children: ReactNode }) {
  return (
    <RichiedeSessione>
      <AppShell>{children}</AppShell>
    </RichiedeSessione>
  );
}
