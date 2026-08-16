'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { tokenSessione } from '@prome/app-core';
import {
  getContaNotificheNonLetteQueryKey,
  getElencaNotificheQueryKey,
  useContaNotificheNonLette,
} from '@prome/api-client';
import { config } from '@/lib/config';

/**
 * Ogni quanto il conteggio si rilegge da solo: è la rete di riserva per
 * quando il socket non arriva — trasporto spento, o l'evento emesso dal
 * worker, che non ha il server WS (i commenti in produzione passano di lì).
 */
const RILETTURA_MS = 60_000;

/**
 * Il numero sulla campanella, tenuto vivo.
 *
 * Due sorgenti e una regola sola: **il socket non porta dati, porta un
 * campanello**. All'evento `notifica` (e alla connessione) si invalida e si
 * rilegge — il valore vero arriva sempre dall'API, mai da un conteggio tenuto
 * a mano che prima o poi diverge. Gemello di `useChatAula`, per la stessa
 * ragione per cui quello rilegge la cronologia invece di ricucire buchi.
 */
export function useNotificheLive() {
  const queryClient = useQueryClient();
  const conteggio = useContaNotificheNonLette({
    query: { refetchInterval: RILETTURA_MS },
  });

  useEffect(() => {
    const token = tokenSessione();
    if (!token) return;

    const connessione = io(`${config.urlApi}/tempo-reale`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    const rileggi = () => {
      void queryClient.invalidateQueries({ queryKey: getContaNotificheNonLetteQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getElencaNotificheQueryKey() });
    };

    // Il server iscrive da sé alla propria stanza: nessun emit.
    connessione.on('connect', rileggi);
    connessione.on('notifica', rileggi);

    return () => {
      connessione.disconnect();
    };
  }, [queryClient]);

  return { nonLette: conteggio.data?.data.nonLette ?? 0 };
}
