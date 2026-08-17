import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as ArchivioSicuro from 'expo-secure-store';
import { temaMobileChiaro, temaMobileScuro, type TemaMobile } from './tema';

/** Le tre risposte possibili alla domanda «come deve apparire». */
export type SceltaTema = 'sistema' | 'chiaro' | 'scuro';

export const SCELTE_TEMA: SceltaTema[] = ['sistema', 'chiaro', 'scuro'];

const CHIAVE = 'prome.tema';

interface ContestoTemaValore {
  tema: TemaMobile;
  scelta: SceltaTema;
  imposta: (scelta: SceltaTema) => void;
}

const ContestoTema = createContext<ContestoTemaValore | null>(null);

/**
 * Rende disponibile il tema a tutta l'app.
 *
 * Di norma segue l'impostazione di sistema del dispositivo, che è la risposta
 * giusta per quasi tutti: chi vuole l'app scura di sera l'ha già chiesto una
 * volta, al telefono, e non deve chiederlo a ogni app. Ma «di norma» non è
 * «sempre» — c'è chi tiene il sistema chiaro e vuole scuro solo qui, e per chi
 * legge molto la scelta è di comodità, non di gusto. Da qui le tre risposte:
 * Sistema, Chiaro, Scuro.
 *
 * **La scelta si legge dal disco in modo asincrono**, e finché non è arrivata
 * vale il sistema: è il valore giusto per chi non ha mai scelto, ed è anche il
 * solo che non produce un lampo di tema sbagliato all'avvio per chi ha scelto
 * — il sistema, di solito, è già quello che ha scelto.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const schema = useColorScheme();
  const [scelta, setScelta] = useState<SceltaTema>('sistema');

  useEffect(() => {
    let vivo = true;
    void ArchivioSicuro.getItemAsync(CHIAVE)
      .then((salvata) => {
        if (vivo && eScelta(salvata)) setScelta(salvata);
      })
      // Una preferenza illeggibile non è un guasto: si resta sul sistema.
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const imposta = useCallback((nuova: SceltaTema) => {
    // Prima lo schermo, poi il disco: la scrittura non deve far aspettare un
    // cambio che l'utente si aspetta immediato, e se fallisce si è comunque
    // scuriti — si ricomincerà dal sistema alla prossima apertura.
    setScelta(nuova);
    void ArchivioSicuro.setItemAsync(CHIAVE, nuova).catch(() => undefined);
  }, []);

  const valore = useMemo<ContestoTemaValore>(() => {
    const scuro = scelta === 'sistema' ? schema === 'dark' : scelta === 'scuro';
    return { tema: scuro ? temaMobileScuro : temaMobileChiaro, scelta, imposta };
  }, [scelta, schema, imposta]);

  return <ContestoTema value={valore}>{children}</ContestoTema>;
}

const eScelta = (valore: string | null): valore is SceltaTema =>
  valore !== null && (SCELTE_TEMA as string[]).includes(valore);

/**
 * Tema corrente. Da usare in ogni componente al posto di colori e misure
 * scritti a mano: è ciò che tiene l'app coerente e pronta al tema scuro.
 */
export function useTema(): TemaMobile {
  return useContestoTema().tema;
}

/** La scelta d'aspetto e come cambiarla: la usa la sola schermata che la offre. */
export function useSceltaTema(): { scelta: SceltaTema; imposta: (scelta: SceltaTema) => void } {
  const { scelta, imposta } = useContestoTema();
  return { scelta, imposta };
}

function useContestoTema(): ContestoTemaValore {
  const valore = use(ContestoTema);
  if (!valore) throw new Error('useTema richiede TemaProvider più in alto nell’albero.');
  return valore;
}
