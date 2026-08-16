'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  CHIAVE_TEMA,
  QUERY_SISTEMA,
  normalizzaScelta,
  type SceltaTema,
  type TemaRisolto,
} from '@/lib/tema';

/**
 * Il tema: sistema, chiaro, scuro.
 *
 * Sostituisce `next-themes`, che faceva la stessa cosa più uno script inline
 * disegnato **dentro l'albero React del browser**. React 19 vieta di creare un
 * tag `<script>` durante un disegno lato browser, e un disegno lato browser
 * dell'intera pagina avviene ogni volta che l'idratazione fallisce — per
 * esempio quando un'estensione infila un nodo nel `<body>` prima di React.
 * Ora lo script sta nel layout, scritto come HTML grezzo: qui c'è solo stato.
 *
 * I valori conservati restano quelli di prima (`theme` in `localStorage`, con
 * `system|light|dark`): chi aveva già scelto un tema non se lo vede dimenticare
 * al primo rilascio.
 */

interface ValoreTema {
  /** Cosa ha scelto la persona: può essere «come il sistema». */
  scelta: SceltaTema;
  /**
   * Il tema effettivamente in vigore. È `undefined` finché non siamo nel
   * browser: sul server la domanda non ha risposta, e inventarne una farebbe
   * disegnare al server un'interfaccia diversa da quella del browser — cioè
   * romperebbe l'idratazione, che è il guaio da cui veniamo.
   */
  risolto: TemaRisolto | undefined;
  imposta: (scelta: SceltaTema) => void;
}

const ContestoTema = createContext<ValoreTema | undefined>(undefined);

export function TemaProvider({ children }: { children: ReactNode }) {
  // Due letture dal browser, entrambe con la loro risposta «sul server non si
  // sa»: React usa quella durante l'idratazione e passa alla vera subito dopo,
  // che è il modo previsto per leggere qualcosa che esiste solo nel browser.
  const scelta = useSyncExternalStore(iscrivitiAllaScelta, sceltaDalBrowser, sceltaDalServer);
  const sistema = useSyncExternalStore(iscrivitiAlSistema, sistemaDalBrowser, sistemaDalServer);

  const risolto: TemaRisolto | undefined =
    sistema === undefined ? undefined : scelta === 'system' ? sistema : scelta;

  useEffect(() => {
    if (!risolto) return;
    const riprendiTransizioni = fermaTransizioni();
    const radice = document.documentElement;
    radice.classList.remove('light', 'dark');
    radice.classList.add(risolto);
    radice.style.colorScheme = risolto;
    riprendiTransizioni();
  }, [risolto]);

  const imposta = useCallback((prossima: SceltaTema) => {
    try {
      window.localStorage.setItem(CHIAVE_TEMA, prossima);
    } catch {
      // Archivio negato (navigazione privata, impostazioni severe): il tema
      // vale per questa sessione e basta. Non è un errore da mostrare.
      sceltaDiRipiego = prossima;
    }
    avvisaDelCambio();
  }, []);

  const valore = useMemo(() => ({ scelta, risolto, imposta }), [scelta, risolto, imposta]);

  return <ContestoTema.Provider value={valore}>{children}</ContestoTema.Provider>;
}

export function useTema(): ValoreTema {
  const valore = useContext(ContestoTema);
  if (!valore) throw new Error('useTema va usato dentro TemaProvider');
  return valore;
}

// --- la scelta conservata ----------------------------------------------------

/** Chi va avvisato quando la scelta cambia in questa scheda. */
const inAscolto = new Set<() => void>();
/** Usata solo se l'archivio è negato: la scelta vale per questa sessione. */
let sceltaDiRipiego: SceltaTema | undefined;

function avvisaDelCambio(): void {
  for (const notifica of inAscolto) notifica();
}

function iscrivitiAllaScelta(notifica: () => void): () => void {
  inAscolto.add(notifica);
  // Una scheda che cambia tema lo cambia in tutte: la preferenza è della
  // persona, non della finestra.
  const daAltraScheda = (evento: StorageEvent) => {
    if (evento.key === CHIAVE_TEMA) notifica();
  };
  window.addEventListener('storage', daAltraScheda);

  return () => {
    inAscolto.delete(notifica);
    window.removeEventListener('storage', daAltraScheda);
  };
}

function sceltaDalBrowser(): SceltaTema {
  try {
    return normalizzaScelta(window.localStorage.getItem(CHIAVE_TEMA));
  } catch {
    return sceltaDiRipiego ?? 'system';
  }
}

function sceltaDalServer(): SceltaTema {
  return 'system';
}

// --- il tema del sistema operativo -------------------------------------------

function iscrivitiAlSistema(notifica: () => void): () => void {
  const media = window.matchMedia(QUERY_SISTEMA);
  media.addEventListener('change', notifica);
  return () => media.removeEventListener('change', notifica);
}

function sistemaDalBrowser(): TemaRisolto {
  return window.matchMedia(QUERY_SISTEMA).matches ? 'dark' : 'light';
}

function sistemaDalServer(): undefined {
  return undefined;
}

/**
 * Spegne le transizioni per l'istante del cambio.
 *
 * Senza, passare al tema scuro fa sfumare ogni colore della pagina uno per
 * conto proprio, e il risultato è una poltiglia lunga mezzo secondo. La
 * lettura di `getComputedStyle` non è superflua: forza il browser a fare i
 * conti subito, altrimenti accorperebbe le due modifiche e la transizione
 * partirebbe lo stesso.
 */
function fermaTransizioni(): () => void {
  const stile = document.createElement('style');
  stile.appendChild(
    document.createTextNode(
      '*,*::before,*::after{transition:none!important;animation:none!important}',
    ),
  );
  document.head.appendChild(stile);

  return () => {
    void window.getComputedStyle(document.body).opacity;
    stile.remove();
  };
}
