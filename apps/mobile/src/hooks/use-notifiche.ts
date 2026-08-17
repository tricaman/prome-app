import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { tokenSessione } from '@prome/app-core';
import {
  getContaNotificheNonLetteQueryKey,
  getElencaNotificheQueryKey,
  useContaNotificheNonLette,
} from '@prome/api-client';
import { urlApi } from '@/lib/api';

/**
 * La rete di riserva per quando il socket non arriva: trasporto spento, o
 * l'evento emesso dal worker, che non ha il server WS (i commenti in
 * produzione passano di lì).
 */
const RILETTURA_MS = 60_000;

/**
 * Solo il numero delle notifiche non lette, senza aprire niente.
 *
 * È la stessa query che tiene viva `useNotificheLive`, quindi è lo **stesso
 * numero** ovunque compaia — sulla campanella e sulla scheda della bacheca —
 * senza che nessuno lo passi a nessuno: due schermi che mostrano conteggi
 * diversi della stessa cosa sono peggio di uno schermo che non lo mostra.
 *
 * Chi ha bisogno del numero usa questo; il socket lo tiene una volta sola la
 * barra delle schede, e chiamare `useNotificheLive` una seconda volta
 * aprirebbe una seconda connessione per lo stesso campanello.
 */
export function useNonLette(): { nonLette: number } {
  const conteggio = useContaNotificheNonLette({
    query: { refetchInterval: RILETTURA_MS },
  });

  return { nonLette: conteggio.data?.data.nonLette ?? 0 };
}

/**
 * Il numero delle notifiche non lette, tenuto vivo.
 *
 * Stessa forma della gemella web — il socket non porta dati, porta un
 * campanello: all'evento si invalida e si rilegge — con in più il **rientro
 * dal background**: un telefono sospende la connessione quando l'app esce di
 * scena, e al rientro si rilegge invece di fidarsi di un socket che il
 * sistema potrebbe aver chiuso mentre nessuno guardava.
 *
 * Va chiamato **una volta sola**, dove sta acceso quanto serve: la barra delle
 * schede, che è montata finché lo è una scheda qualsiasi.
 */
export function useNotificheLive() {
  const queryClient = useQueryClient();
  const conteggio = useNonLette();

  useEffect(() => {
    const token = tokenSessione();
    if (!token) return;

    const rileggi = () => {
      void queryClient.invalidateQueries({ queryKey: getContaNotificheNonLetteQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getElencaNotificheQueryKey() });
    };

    const connessione = io(`${urlApi()}/tempo-reale`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    // Il server iscrive da sé alla propria stanza: nessun emit.
    connessione.on('connect', rileggi);
    connessione.on('notifica', rileggi);

    const ascoltatore = AppState.addEventListener('change', (statoApp) => {
      if (statoApp !== 'active') return;
      if (!connessione.connected) connessione.connect();
      rileggi();
    });

    return () => {
      ascoltatore.remove();
      connessione.disconnect();
    };
  }, [queryClient]);

  return conteggio;
}
