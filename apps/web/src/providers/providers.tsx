'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { creaQueryClient } from '@prome/app-core';
import { impostaLinguaApi } from '@/lib/api';
import { AvvisiProvider } from './avvisi-provider';
import { InterfacciaProvider } from './interfaccia-provider';
import { TemaProvider } from './tema';

/**
 * Tutti i contesti dell'applicazione, in un punto solo.
 *
 * L'ordine conta: il tema avvolge tutto (decide le classi sul documento), poi
 * la cache delle richieste, poi la libreria di interfaccia, e infine gli
 * avvisi, che devono poter comparire sopra qualunque schermata.
 */
export function Providers({ children }: { children: ReactNode }) {
  const lingua = useLocale();

  // Una cache per montaggio del browser: creata dentro lo stato, altrimenti
  // in server rendering due utenti diversi condividerebbero gli stessi dati.
  const [queryClient] = useState(creaQueryClient);

  // Le chiamate API devono partire con la lingua corrente fin dalla prima:
  // impostarla qui, in fase di render, la rende disponibile prima dei figli.
  impostaLinguaApi(lingua);

  // Il tema segue l'impostazione di sistema finché qualcuno non sceglie. La
  // scelta viene riletta e applicata **prima della prima pittura** dallo
  // script servito nel layout, non da qui: così non si vede il lampo chiaro
  // all'apertura di una pagina scura, e nell'albero del browser non c'è alcun
  // tag `<script>` da ridisegnare.
  return (
    <TemaProvider>
      <QueryClientProvider client={queryClient}>
        <InterfacciaProvider lingua={lingua}>
          <AvvisiProvider>{children}</AvvisiProvider>
        </InterfacciaProvider>
      </QueryClientProvider>
    </TemaProvider>
  );
}
