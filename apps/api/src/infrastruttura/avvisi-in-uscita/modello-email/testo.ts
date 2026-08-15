import type { BloccoEmail, ContenutoEmail } from './blocchi';
import type { TestiInvolucro } from './involucro';

/**
 * La versione in testo semplice, dagli **stessi** blocchi dell'HTML.
 *
 * Non è una cortesia verso i client di vent'anni fa: un messaggio di solo HTML
 * viene classificato come posta indesiderata molto più spesso, e per un codice
 * di accesso finire nello spam significa un accesso che non avviene. È il
 * motivo per cui la parte in testo esiste, e il motivo per cui deve dire le
 * stesse cose — un filtro che trova due messaggi diversi nelle due parti è
 * ancora più severo di uno che ne trova una sola.
 *
 * Derivarla dai blocchi è ciò che rende la promessa mantenibile: non c'è modo
 * di aggiungere un paragrafo all'HTML e dimenticarlo qui, perché non esiste un
 * «qui» dove aggiungerlo.
 */

const RIGA = '\n';
const PARAGRAFO = '\n\n';

function rendiBlocco(blocco: BloccoEmail): string | undefined {
  switch (blocco.tipo) {
    case 'titolo':
      // Il titolo non prende trattini o asterischi di decorazione: in testo
      // semplice l'unica gerarchia che tutti i client rendono è la riga vuota.
      return blocco.testo;

    case 'paragrafo':
    case 'nota':
      return blocco.testo;

    case 'codice':
      return blocco.valore;

    case 'azione':
      // L'etichetta da sola non porta da nessuna parte quando non c'è nulla su
      // cui fare clic: l'indirizzo va per esteso, sulla sua riga, così i client
      // che riconoscono gli indirizzi lo rendono cliccabile per intero.
      return `${blocco.etichetta}:${RIGA}${blocco.indirizzo}`;

    case 'dettagli':
      return blocco.voci.map((voce) => `${voce.etichetta}: ${voce.valore}`).join(RIGA);

    case 'separatore':
      // Nell'HTML è una riga sottile; qui la riga vuota fra i paragrafi fa già
      // lo stesso lavoro, e un separatore disegnato con i trattini sarebbe
      // rumore in più dentro una finestra larga quaranta caratteri.
      return undefined;
  }
}

/** Compone la parte in testo semplice, con lo stesso piè di pagina dell'HTML. */
export function componiTesto(contenuto: ContenutoEmail, testi: TestiInvolucro): string {
  const corpo = contenuto.blocchi
    .map(rendiBlocco)
    .filter((pezzo): pezzo is string => pezzo !== undefined && pezzo.trim() !== '');

  const piede = `${testi.piedeMarchio}${RIGA}${testi.piedeNota}`;
  return [...corpo, '--', piede].join(PARAGRAFO);
}
