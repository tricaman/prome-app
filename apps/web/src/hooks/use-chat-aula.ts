'use client';

import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { tokenSessione } from '@prome/app-core';
import {
  getLeggiMessaggiAulaQueryKey,
  scriviInAula,
  useLeggiMessaggiAula,
  type MessaggioDiChatDto,
} from '@prome/api-client';
import { config } from '@/lib/config';

export type StatoConnessione = 'connessione' | 'connesso' | 'assente';

/** Quanti messaggi si tengono a schermo: una chat non è un archivio. */
const FINESTRA = 100;

/**
 * La chat di un'aula: cronologia dal server, aggiornamenti dal trasporto.
 *
 * Due sorgenti e una regola per tenerle insieme: **si deduplica per
 * identificativo**. Il trasporto garantisce che un messaggio non si perda, non
 * che arrivi una volta sola — una ripubblicazione dopo un errore può
 * consegnarlo due volte, e senza deduplica comparirebbe due volte sullo
 * schermo.
 *
 * Alla riconnessione si **rilegge la cronologia** invece di ricostruire ciò
 * che si è perso: la cronologia è la verità, il tempo reale è
 * un'accelerazione. È lo stesso motivo per cui, col trasporto spento, questa
 * chat continua a funzionare — si scrive e si legge, e i messaggi degli altri
 * compaiono al caricamento successivo.
 */
export function useChatAula(aulaId: string) {
  const queryClient = useQueryClient();
  const cronologia = useLeggiMessaggiAula(aulaId, { limit: FINESTRA });
  const [inArrivo, setInArrivo] = useState<MessaggioDiChatDto[]>([]);

  // Senza sessione non c'è nulla a cui connettersi, e lo si sa già al primo
  // disegno: deciderlo dentro l'effetto costringerebbe a un secondo giro.
  const [stato, setStato] = useState<StatoConnessione>(() =>
    typeof window === 'undefined' || tokenSessione() ? 'connessione' : 'assente',
  );

  useEffect(() => {
    const token = tokenSessione();
    if (!token) return;

    const connessione = io(`${config.urlApi}/tempo-reale`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    connessione.on('connect', () => {
      setStato('connesso');
      connessione.emit('ascolta-aula', aulaId);
      // Il riallineamento non ricuce buchi a mano: rilegge, e basta.
      void queryClient.invalidateQueries({
        queryKey: getLeggiMessaggiAulaQueryKey(aulaId, { limit: FINESTRA }),
      });
    });
    connessione.on('disconnect', () => setStato('assente'));
    connessione.on('connect_error', () => setStato('assente'));
    connessione.on('messaggio', (messaggio: MessaggioDiChatDto) =>
      setInArrivo((precedenti) => [...precedenti, messaggio]),
    );

    return () => {
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

  /**
   * Si scrive con una richiesta ordinaria, non dal socket: è lì che vivono le
   * regole. Il messaggio inviato entra subito nell'elenco — e se il trasporto
   * lo riconsegna, la deduplica lo assorbe.
   */
  const invia = async (testo: string) => {
    const risposta = await scriviInAula(aulaId, { testo });
    setInArrivo((precedenti) => [...precedenti, risposta.data]);
    return risposta.data;
  };

  return { messaggi, stato, inCaricamento: cronologia.isPending, invia };
}
