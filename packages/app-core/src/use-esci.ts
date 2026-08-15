import { useCallback, useState } from 'react';
import { esciDaProme, esciDaTuttiIDispositivi } from '@prome/api-client';
import { avvisatore, messaggioSuccessoPredefinito } from './feedback';
import { chiudiSessione } from './sessione';

/** Le due uscite: questo dispositivo, oppure tutti. */
export type Portata = 'questo-dispositivo' | 'tutti-i-dispositivi';

export interface EsitoUscita {
  esci: (portata?: Portata) => Promise<void>;
  inCorso: boolean;
}

/**
 * Uscire da Prome.
 *
 * Due gesti in un ordine che non è indifferente:
 *
 * 1. **si dice al server** di revocare la sessione — senza questo il token
 *    resterebbe valido per trenta giorni in mano a chiunque l'abbia copiato,
 *    e «esci» avrebbe nascosto il problema invece di risolverlo;
 * 2. **si svuota l'archivio locale**, che è ciò che fa cambiare schermata a
 *    chi guarda `useSessione()`.
 *
 * La cache delle query non si tocca qui: la svuota la guardia della sessione,
 * che vede la sessione cadere **comunque sia caduta** — questo gesto, una
 * revoca da un altro dispositivo, una scadenza. Farlo anche qui sarebbe una
 * seconda regola che dice la stessa cosa, e le due divergerebbero.
 *
 * **Il passo 2 avviene anche se il passo 1 fallisce**, ed è la decisione
 * importante di questo file. Con la rete assente, o con una sessione già morta
 * altrove, la chiamata al server non può riuscire: tenere dentro chi ha chiesto
 * di uscire sarebbe il modo peggiore di rispondere a quel gesto — soprattutto
 * su un computer condiviso, che è il caso in cui «esci» conta davvero. Il
 * server, dal canto suo, non resta con una sessione che nessuno può più usare:
 * il token è solo qui, e qui non c'è più.
 */
export function useEsci(): EsitoUscita {
  const [inCorso, setInCorso] = useState(false);

  const esci = useCallback(async (portata: Portata = 'questo-dispositivo') => {
    setInCorso(true);
    let messaggio: string | undefined;

    try {
      const risposta = await (portata === 'tutti-i-dispositivi'
        ? esciDaTuttiIDispositivi()
        : esciDaProme());
      messaggio = risposta.meta.message;
    } catch {
      // Volutamente muto: l'uscita non è fallita, è solo rimasta locale. Un
      // avviso di errore qui direbbe a chi legge che è ancora dentro, e non
      // è vero — fra un istante la sessione non c'è più.
    }

    await chiudiSessione();
    avvisatore().successo(messaggio ?? messaggioSuccessoPredefinito());
    setInCorso(false);
  }, []);

  return { esci, inCorso };
}
