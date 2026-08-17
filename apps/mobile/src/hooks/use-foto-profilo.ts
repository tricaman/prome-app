import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { caricaConAvanzamento } from '@prome/app-core';
import {
  confermaFotoProfilo,
  getLeggiMioProfiloQueryKey,
  preautorizzaFotoProfilo,
  rimuoviFotoProfilo,
} from '@prome/api-client';
import { scegliFoto } from '@/lib/scelta-file';

export interface FotoProfilo {
  /** Sceglie dal rullino e carica: un gesto solo per chi guarda. */
  cambia: () => Promise<void>;
  togli: () => Promise<void>;
  inCorso: boolean;
}

/**
 * La foto del profilo: sceglierla, caricarla, toglierla.
 *
 * I **tre tempi** del caricamento stanno qui una volta sola — si dichiara nome
 * e peso, i byte vanno **diritti all'archivio** con la stessa funzione
 * condivisa del web, poi si conferma citando la chiave — perché sono tre
 * chiamate che vanno fatte in quest'ordine e nessuna schermata deve
 * ricordarselo.
 *
 * **Chi annulla la scelta non è un errore**: si esce in silenzio, e non c'è
 * niente da riferire. Un fallimento vero lo racconta `useApiMutation` dalle
 * chiamate, che parlano già la lingua dell'utente.
 *
 * Alla fine si invalida il profilo, che è l'unica lettura che porta la foto:
 * la scheda del profilo e ogni avatar che ne dipende si ridisegnano da sé.
 */
export function useFotoProfilo(): FotoProfilo {
  const clienteQuery = useQueryClient();
  const [inCorso, setInCorso] = useState(false);

  const rileggiIlProfilo = () =>
    clienteQuery.invalidateQueries({ queryKey: getLeggiMioProfiloQueryKey() });

  const cambia = async () => {
    const scelta = await scegliFoto();
    // Annullare non è un errore: è la risposta più comune a un selettore.
    if (!scelta) return;

    setInCorso(true);
    try {
      const { data } = await preautorizzaFotoProfilo({
        nome: scelta.nome,
        dimensione: scelta.dimensione,
      });

      await caricaConAvanzamento({
        url: data.url,
        // Il riferimento al file locale, non i byte: li legge il livello
        // nativo mentre invia, invece di tenere l'immagine in memoria.
        corpo: { uri: scelta.uri, name: scelta.nome, type: scelta.mimeType },
        intestazioni: { 'content-type': scelta.mimeType },
      });

      await confermaFotoProfilo({ chiave: data.chiave });
      await rileggiIlProfilo();
    } finally {
      setInCorso(false);
    }
  };

  const togli = async () => {
    setInCorso(true);
    try {
      await rimuoviFotoProfilo();
      await rileggiIlProfilo();
    } finally {
      setInCorso(false);
    }
  };

  return { cambia, togli, inCorso };
}
