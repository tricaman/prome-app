import { useEffect, useState } from 'react';

/** Quanto resta armata una conferma prima di tornare com'era. */
const RIPENSAMENTO_MS = 5000;

export interface Conferma {
  /** Vero quando il gesto è armato: il tasto sta chiedendo conferma. */
  armata: boolean;
  /** Prima pressione: arma. Seconda: esegue. */
  premi: () => void;
  annulla: () => void;
}

/**
 * Un gesto che si conferma **sul posto**, senza finestre.
 *
 * Eliminare non si annulla, quindi una pressione sola non basta; ma un avviso
 * di sistema per ogni eliminazione è la cosa che insegna a premere «Sì» senza
 * leggere. Qui il tasto stesso cambia parola — «Elimina» diventa «Conferma
 * eliminazione» — e chi ha sbagliato mira si ferma davanti a una parola
 * diversa, non davanti a un riquadro da scacciare.
 *
 * Si disarma da solo dopo qualche secondo: un tasto rimasto armato in fondo
 * alla pagina è una trappola per la volta dopo.
 */
export function useConferma(esegui: () => void, msRipensamento = RIPENSAMENTO_MS): Conferma {
  const [armata, setArmata] = useState(false);

  useEffect(() => {
    if (!armata) return;
    const orologio = setTimeout(() => setArmata(false), msRipensamento);
    return () => clearTimeout(orologio);
  }, [armata, msRipensamento]);

  return {
    armata,
    premi: () => {
      if (!armata) {
        setArmata(true);
        return;
      }
      setArmata(false);
      esegui();
    },
    annulla: () => setArmata(false),
  };
}
