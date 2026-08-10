import type { Formats } from 'next-intl';

/**
 * Formati condivisi da tutta l'applicazione: definendoli una volta, la stessa
 * data appare identica in ogni pagina e non si moltiplicano le varianti.
 */
export const formats = {
  dateTime: {
    breve: { day: 'numeric', month: 'short', year: 'numeric' },
    completo: { day: 'numeric', month: 'long', year: 'numeric' },
    conOra: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    soloOra: { hour: '2-digit', minute: '2-digit' },
  },
  number: {
    intero: { maximumFractionDigits: 0 },
  },
} satisfies Formats;
