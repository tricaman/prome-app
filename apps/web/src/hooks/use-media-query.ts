'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Segue una media query dal codice.
 *
 * Da preferire alle classi responsive solo quando il layout cambia davvero
 * struttura (per esempio un pannello che diventa un foglio a comparsa): per
 * la sola apparenza restano più efficienti le utility CSS.
 *
 * Sul server la finestra non esiste, quindi il valore di partenza è `false`;
 * il browser sostituisce il valore reale già alla prima idratazione.
 */
export function useMediaQuery(query: string): boolean {
  const sottoscrivi = useCallback(
    (avvisa: () => void) => {
      const lista = window.matchMedia(query);
      lista.addEventListener('change', avvisa);
      return () => lista.removeEventListener('change', avvisa);
    },
    [query],
  );

  const leggi = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(sottoscrivi, leggi, () => false);
}

/** Vero sotto la soglia `md` di Tailwind: telefoni e finestre strette. */
export function useSchermoPiccolo(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
