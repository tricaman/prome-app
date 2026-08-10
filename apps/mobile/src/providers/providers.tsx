import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { creaQueryClient } from '@prome/app-core';
import { TemaProvider } from '@/theme';
import { I18nProvider } from '@/i18n/i18n-provider';
import { ErrorBoundary } from '@/components/feedback';
import { AvvisiProvider } from './avvisi-provider';
import { PonteLinguaApi } from './ponte-lingua-api';

/**
 * Tutti i contesti dell'app, in un punto solo.
 *
 * Il confine di errore sta più in alto di tutto: se qualcosa fallisce mentre
 * l'app si monta, l'utente vede un messaggio e un pulsante invece di una
 * schermata bianca da cui si esce solo riavviando.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(creaQueryClient);

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <I18nProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <PonteLinguaApi />
              <AvvisiProvider>{children}</AvvisiProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </I18nProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
