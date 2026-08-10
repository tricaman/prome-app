import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { temaMobileChiaro, temaMobileScuro, type TemaMobile } from './tema';

const ContestoTema = createContext<TemaMobile | null>(null);

/**
 * Rende disponibile il tema a tutta l'app, seguendo l'impostazione di sistema
 * del dispositivo (chiaro o scuro): non c'è un interruttore in app perché
 * l'utente ha già espresso la sua preferenza a livello di sistema.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const schema = useColorScheme();
  const tema = useMemo(
    () => (schema === 'dark' ? temaMobileScuro : temaMobileChiaro),
    [schema],
  );

  return <ContestoTema value={tema}>{children}</ContestoTema>;
}

/**
 * Tema corrente. Da usare in ogni componente al posto di colori e misure
 * scritti a mano: è ciò che tiene l'app coerente e pronta al tema scuro.
 */
export function useTema(): TemaMobile {
  const tema = use(ContestoTema);
  if (!tema) throw new Error('useTema richiede TemaProvider più in alto nell’albero.');
  return tema;
}
