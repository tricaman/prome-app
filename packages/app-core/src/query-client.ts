import { QueryClient } from '@tanstack/react-query';
import { eErroreApi } from './errori';

/**
 * Impostazioni comuni ai due client.
 *
 * Non si riprova su errore del server: se una richiesta è stata rifiutata per
 * un motivo applicativo (permesso mancante, dato inesistente) ritentare non
 * cambia l'esito e ritarda solo il messaggio. Si riprova una volta sola
 * quando la risposta non è mai arrivata, cioè quando è plausibile la rete.
 */
export function creaQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: (tentativi, errore) => !eErroreApi(errore) && tentativi < 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
