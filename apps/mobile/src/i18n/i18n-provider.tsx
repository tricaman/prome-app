import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import {
  catalogoDi,
  negoziaLingua,
  traduci as traduciMessaggio,
  type ChiaveMessaggio,
  type Lingua,
  type ValoriInterpolazione,
} from '@prome/i18n';

interface ContestoI18n {
  lingua: Lingua;
  /** Traduce una chiave del catalogo condiviso, con interpolazione `{nome}`. */
  t: (chiave: ChiaveMessaggio, valori?: ValoriInterpolazione) => string;
  /** Forza una lingua diversa da quella del dispositivo. */
  cambiaLingua: (lingua: Lingua) => void;
}

const Contesto = createContext<ContestoI18n | null>(null);

/**
 * Lingua di partenza: quella del dispositivo se supportata, altrimenti
 * inglese. Stessa regola del sito, applicata alle preferenze di sistema.
 */
function linguaDelDispositivo(): Lingua {
  return negoziaLingua(getLocales().map((locale) => locale.languageTag));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lingua, setLingua] = useState<Lingua>(linguaDelDispositivo);
  const messaggi = useMemo(() => catalogoDi(lingua), [lingua]);

  const t = useCallback(
    (chiave: ChiaveMessaggio, valori?: ValoriInterpolazione) =>
      traduciMessaggio(messaggi, chiave, valori),
    [messaggi],
  );

  const valore = useMemo<ContestoI18n>(
    () => ({ lingua, t, cambiaLingua: setLingua }),
    [lingua, t],
  );

  return <Contesto value={valore}>{children}</Contesto>;
}

/** Traduzioni e lingua corrente. */
export function useI18n(): ContestoI18n {
  const contesto = use(Contesto);
  if (!contesto) throw new Error('useI18n richiede I18nProvider più in alto nell’albero.');
  return contesto;
}

/** Scorciatoia per il caso più frequente: la sola funzione di traduzione. */
export function useT(): ContestoI18n['t'] {
  return useI18n().t;
}
