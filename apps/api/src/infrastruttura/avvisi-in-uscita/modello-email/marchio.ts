import { readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Il marchio dentro il messaggio.
 *
 * Il segno viaggia **come allegato in linea**, non come indirizzo remoto, e la
 * differenza si vede: Outlook e Gmail non fidato bloccano le immagini esterne
 * per impostazione predefinita, e un'email di accesso che si apre senza il
 * proprio marchio è esattamente ciò che una email falsa non ha. Un allegato in
 * linea si vede sempre.
 *
 * Ci sono altre due conseguenze, entrambe volute. Il messaggio **non fa alcuna
 * richiesta di rete** all'apertura: nessun fornitore, nemmeno noi, apprende
 * quando e da quale indirizzo IP una persona ha aperto la posta — cosa che un
 * logo remoto racconta, che lo si voglia o no. E il marchio **non dipende dal
 * deploy del web**: l'email resta intera anche se il sito è fermo o se il file
 * cambia nome.
 *
 * Il prezzo sono una decina di kilobyte per messaggio. È un prezzo che si paga.
 */

/**
 * Il nome con cui l'HTML cita l'immagine (`cid:marchio-prome`).
 *
 * Deve somigliare a un identificativo di messaggio e non a un nome di file:
 * qualche client mostra come allegato ciò che ha un'estensione riconoscibile,
 * anche quando è dichiarato in linea.
 */
export const CID_LOGO = 'marchio-prome';

/**
 * Il file sta accanto a questo modulo e non in `apps/web/public`: l'API non
 * legge dentro un'altra applicazione, e un file condiviso per percorso è un
 * accoppiamento che si rompe al primo deploy separato. Lo copia in `dist` la
 * voce `assets` di `nest-cli.json` — se sparisce di là, sparisce dalla posta.
 */
const PERCORSO_LOGO = path.join(__dirname, 'logo-prome.png');

let cache: Buffer | undefined;

/**
 * Il PNG del marchio, letto una volta sola.
 *
 * Non si legge a ogni invio: sono ~6 KB che non cambiano mai dentro un
 * processo, e una lettura da disco per ogni codice OTP è lavoro inutile su un
 * percorso che ha una persona che aspetta davanti allo schermo.
 */
export function logoPng(): Buffer {
  cache ??= readFileSync(PERCORSO_LOGO);
  return cache;
}

/** L'allegato, nella forma che ogni fornitore di posta sa leggere. */
export interface AllegatoInLinea {
  readonly filename: string;
  readonly content: Buffer;
  readonly cid: string;
  readonly contentType: string;
  readonly contentDisposition: 'inline';
}

export function allegatoDelMarchio(): AllegatoInLinea {
  return {
    filename: 'prome.png',
    content: logoPng(),
    cid: CID_LOGO,
    contentType: 'image/png',
    // Senza questo, diversi client elencano il marchio fra gli allegati e
    // l'email sembra portare un file che nessuno ha mandato.
    contentDisposition: 'inline',
  };
}
