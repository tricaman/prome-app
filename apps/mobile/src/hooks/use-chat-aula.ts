import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { tokenSessione } from '@prome/app-core';
import {
  getLeggiMessaggiAulaQueryKey,
  scriviInAula,
  useLeggiMessaggiAula,
  type MessaggioDiChatDto,
} from '@prome/api-client';
import { urlApi } from '@/lib/api';

export type StatoConnessione = 'connessione' | 'connesso' | 'assente';

/** Quanti messaggi si tengono a schermo: una chat non è un archivio. */
const FINESTRA = 100;

/**
 * La chat di un'aula sul telefono.
 *
 * Stessa forma della gemella web — cronologia dal server, aggiornamenti dal
 * trasporto, **deduplica per identificativo** — con in più la cosa che sul web
 * non esiste: **il rientro dal background**.
 *
 * Un telefono sospende la connessione quando l'app esce di scena, e al rientro
 * non c'è modo di sapere cosa è stato perso: si rilegge la cronologia, che è
 * la verità, invece di provare a ricostruire il buco. È la stessa scelta della
 * riconnessione, applicata a un caso che sul web non si presenta.
 */
export function useChatAula(aulaId: string) {
  const queryClient = useQueryClient();
  const cronologia = useLeggiMessaggiAula(aulaId, { limit: FINESTRA });
  const [inArrivo, setInArrivo] = useState<MessaggioDiChatDto[]>([]);
  const [stato, setStato] = useState<StatoConnessione>(() =>
    tokenSessione() ? 'connessione' : 'assente',
  );

  useEffect(() => {
    const token = tokenSessione();
    if (!token) return;

    const chiaveCronologia = getLeggiMessaggiAulaQueryKey(aulaId, { limit: FINESTRA });
    const rileggi = () => queryClient.invalidateQueries({ queryKey: chiaveCronologia });

    const connessione = io(`${urlApi()}/tempo-reale`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    connessione.on('connect', () => {
      setStato('connesso');
      connessione.emit('ascolta-aula', aulaId);
      void rileggi();
    });
    connessione.on('disconnect', () => setStato('assente'));
    connessione.on('connect_error', () => setStato('assente'));
    connessione.on('messaggio', (messaggio: MessaggioDiChatDto) =>
      setInArrivo((precedenti) => [...precedenti, messaggio]),
    );

    // Tornando in primo piano il socket può essere morto senza dirlo: si
    // riapre e si rilegge, invece di fidarsi di una connessione che il sistema
    // operativo potrebbe aver chiuso mentre nessuno guardava.
    const ascoltatore = AppState.addEventListener('change', (statoApp) => {
      if (statoApp !== 'active') return;
      if (!connessione.connected) connessione.connect();
      void rileggi();
    });

    return () => {
      ascoltatore.remove();
      connessione.emit('smetti-aula', aulaId);
      connessione.disconnect();
    };
  }, [aulaId, queryClient]);

  const messaggi = useMemo(() => {
    const perId = new Map<string, MessaggioDiChatDto>();
    for (const messaggio of cronologia.data?.data ?? []) perId.set(messaggio.id, messaggio);
    // Gli stessi identificativi si sovrascrivono: è la deduplica, ed è ciò che
    // rende innocua una doppia consegna.
    for (const messaggio of inArrivo) perId.set(messaggio.id, messaggio);
    return [...perId.values()].sort((a, b) => a.inviatoIl.localeCompare(b.inviatoIl));
  }, [cronologia.data, inArrivo]);

  const invia = async (testo: string) => {
    const risposta = await scriviInAula(aulaId, { testo });
    setInArrivo((precedenti) => [...precedenti, risposta.data]);
    return risposta.data;
  };

  return { messaggi, stato, inCaricamento: cronologia.isPending, invia };
}
