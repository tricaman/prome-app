import type { BloccoEmail, ContenutoEmail } from './blocchi';
import { CID_LOGO } from './marchio';
import { indirizzoSicuro, testoSicuro } from './sicurezza';
import {
  azione as coloreAzione,
  CARATTERE_CORPO,
  CARATTERE_TITOLI,
  LARGHEZZA,
  paletteChiara,
  paletteScura,
  peso,
  RAGGIO_AZIONE,
  RAGGIO_RIQUADRO,
  RAGGIO_SCHEDA,
  testo as gradino,
  type PaletteEmail,
} from './stile';

/**
 * L'involucro: **l'unico file del progetto che scrive HTML per la posta**.
 *
 * Ogni email transazionale passa di qui, e quindi ogni email ha la stessa
 * larghezza, la stessa scheda, la stessa intestazione col marchio e lo stesso
 * piè di pagina. Non è una convenzione da ricordare: è l'unica strada. Chi
 * aggiunge un'email nuova dichiara dei blocchi e non ha modo di ottenere un
 * involucro diverso, che è la sola forma di coerenza che non si consuma.
 *
 * Le regole della posta che il file rispetta, e che non vanno rilassate:
 * tabelle e non `div` per l'impaginazione (il motore di Outlook è Word, e di
 * CSS moderno non sa nulla), stili in linea e non fogli esterni (Gmail li
 * scarta), pixel e non unità relative, esadecimali e non variabili.
 */

/**
 * I testi fissi dell'involucro, gli stessi in ogni email.
 *
 * Arrivano tradotti da fuori e non si leggono qui dentro: l'involucro compone,
 * non decide in che lingua parla — la lingua è quella della richiesta che ha
 * originato l'avviso, come per ogni altro messaggio del server.
 */
export interface TestiInvolucro {
  /** Il nome del prodotto accanto al segno. Non si traduce: è il marchio. */
  readonly marchio: string;
  /** Prima riga del piè di pagina: prodotto e dominio. */
  readonly piedeMarchio: string;
  /** Seconda riga: la nota di messaggio automatico. */
  readonly piedeNota: string;
}

/**
 * Le classi sono il **solo** aggancio del tema scuro.
 *
 * Un client che rispetta `prefers-color-scheme` legge il blocco `@media` e
 * riscrive questi colori; uno che non lo rispetta vede gli stili in linea, che
 * sono già il tema chiaro completo. Nessun elemento dipende dal foglio per
 * essere leggibile: il foglio migliora, non abilita.
 */
const CLASSI = {
  sfondo: 'e-sfondo',
  scheda: 'e-scheda',
  titolo: 'e-titolo',
  corpo: 'e-corpo',
  tenue: 'e-tenue',
  debole: 'e-debole',
  riquadro: 'e-riquadro',
  accento: 'e-accento',
  bordo: 'e-bordo',
} as const;

/** Genera il tema scuro dalle stesse chiavi del chiaro: non si scrive a mano. */
function foglioScuro(p: PaletteEmail): string {
  // `!important` non è pigrizia: gli stili in linea vincono su qualunque
  // regola di foglio, e senza di esso il blocco non avrebbe alcun effetto.
  return `
    @media (prefers-color-scheme: dark) {
      body, .${CLASSI.sfondo} { background-color: ${p.sfondo} !important; }
      .${CLASSI.scheda} { background-color: ${p.scheda} !important; border-color: ${p.bordo} !important; }
      .${CLASSI.titolo} { color: ${p.testo} !important; }
      .${CLASSI.corpo} { color: ${p.corpo} !important; }
      .${CLASSI.tenue} { color: ${p.tenue} !important; }
      .${CLASSI.debole} { color: ${p.debole} !important; }
      .${CLASSI.riquadro} { background-color: ${p.riquadro} !important; }
      .${CLASSI.accento} { color: ${p.accento} !important; }
      .${CLASSI.bordo} { border-color: ${p.bordo} !important; background-color: ${p.bordo} !important; }
    }`;
}

/** Una dichiarazione tipografica completa: in posta non si eredita nulla. */
function carattere(
  famiglia: string,
  gradinoTesto: { dimensione: number; interlinea: number },
  pesoTesto: string,
  colore: string,
): string {
  return [
    `margin:0`,
    `font-family:${famiglia}`,
    `font-size:${gradinoTesto.dimensione}px`,
    `line-height:${gradinoTesto.interlinea}px`,
    // Outlook ignora `line-height` sui paragrafi se non glielo si impone.
    `mso-line-height-rule:exactly`,
    `font-weight:${pesoTesto}`,
    `color:${colore}`,
  ].join(';');
}

const P = paletteChiara;

/** Un blocco diventa una riga di tabella: mai un `div`, mai un margine. */
function rendiBlocco(blocco: BloccoEmail, primo: boolean): string {
  const spazioSopra = primo ? 0 : 16;

  switch (blocco.tipo) {
    case 'titolo':
      return riga(
        `<h1 class="${CLASSI.titolo}" style="${carattere(CARATTERE_TITOLI, gradino.titolo, peso.extra, P.testo)}">${testoSicuro(blocco.testo)}</h1>`,
        primo ? 0 : 24,
      );

    case 'paragrafo':
      return riga(
        `<p class="${CLASSI.corpo}" style="${carattere(CARATTERE_CORPO, gradino.corpo, peso.normale, P.corpo)}">${testoSicuro(blocco.testo)}</p>`,
        spazioSopra,
      );

    case 'codice':
      // Il codice sta dentro il suo riquadro e centrato: chi lo trascrive da un
      // telefono lo cerca con l'occhio, non lo legge dentro una frase.
      return riga(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="${CLASSI.riquadro}" align="center" style="background-color:${P.riquadro};border-radius:${RAGGIO_RIQUADRO}px;padding:20px 16px">
            <div class="${CLASSI.accento}" style="${carattere(CARATTERE_TITOLI, gradino.codice, peso.extra, P.accento)};letter-spacing:10px;text-indent:10px">${testoSicuro(blocco.valore)}</div>
          </td></tr>
        </table>`,
        spazioSopra + 4,
      );

    case 'azione':
      // Pastiglia menta con testo verde scuro: è il bottone primario del
      // prodotto, identico nei due temi — per questo non ha una classe.
      // Su Outlook classico il raggio non si applica e la pastiglia diventa un
      // rettangolo: il colore, il testo e il bersaglio restano quelli giusti.
      return riga(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" bgcolor="${coloreAzione.sfondo}" style="background-color:${coloreAzione.sfondo};border-radius:${RAGGIO_AZIONE}px">
            <a href="${indirizzoSicuro(blocco.indirizzo)}" style="display:inline-block;padding:14px 28px;${carattere(CARATTERE_TITOLI, gradino.corpo, peso.extra, coloreAzione.testo)};text-decoration:none;border-radius:${RAGGIO_AZIONE}px">${testoSicuro(blocco.etichetta)}</a>
          </td></tr>
        </table>`,
        spazioSopra + 8,
      );

    case 'dettagli':
      return riga(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="${CLASSI.riquadro}" style="background-color:${P.riquadro};border-radius:${RAGGIO_RIQUADRO}px">
          <tr><td style="padding:16px 18px">
            ${blocco.voci
              .map(
                (voce, indice) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:${indice === 0 ? 0 : 10}px">
                  <div class="${CLASSI.debole}" style="${carattere(CARATTERE_CORPO, gradino.piede, peso.semi, P.debole)};text-transform:uppercase;letter-spacing:0.6px">${testoSicuro(voce.etichetta)}</div>
                  <div class="${CLASSI.corpo}" style="${carattere(CARATTERE_CORPO, gradino.nota, peso.semi, P.corpo)};padding-top:2px">${testoSicuro(voce.valore)}</div>
                </td></tr></table>`,
              )
              .join('')}
          </td></tr>
        </table>`,
        spazioSopra + 4,
      );

    case 'nota':
      return riga(
        `<p class="${CLASSI.tenue}" style="${carattere(CARATTERE_CORPO, gradino.nota, peso.normale, P.tenue)}">${testoSicuro(blocco.testo)}</p>`,
        spazioSopra - 4,
      );

    case 'separatore':
      // Una `td` alta un pixel e non un `hr`: l'`hr` in posta prende bordi e
      // colori diversi da ogni client, e non c'è modo di spegnerli tutti.
      return riga(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="${CLASSI.bordo}" height="1" style="height:1px;line-height:1px;font-size:0;background-color:${P.bordo}">&nbsp;</td></tr></table>`,
        24,
      );
  }
}

function riga(contenuto: string, spazioSopra: number): string {
  return `<tr><td style="padding-top:${Math.max(spazioSopra, 0)}px">${contenuto}</td></tr>`;
}

/**
 * La riga di anteprima.
 *
 * I client la mostrano accanto all'oggetto nell'elenco dei messaggi, e la
 * prendono dalle prime parole del corpo: senza questo blocco mostrerebbero
 * «Prome», cioè l'intestazione. La sfilza di caratteri a larghezza zero in
 * coda serve a spingere fuori dall'anteprima ciò che viene dopo, altrimenti il
 * nome del prodotto si riattaccherebbe in fondo alla riga.
 */
function anteprima(testoAnteprima: string): string {
  const riempimento = '&#8203;&#847;&zwnj;&nbsp;&#847;'.repeat(30);
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${testoSicuro(testoAnteprima)}${riempimento}</div>`;
}

/** Intestazione: il segno del marchio e il nome, sopra la scheda. */
function intestazione(testi: TestiInvolucro): string {
  return `<tr><td style="padding:0 4px 20px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="40" style="width:40px"><img src="cid:${CID_LOGO}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0"></td>
        <td style="padding-left:12px"><span class="${CLASSI.titolo}" style="${carattere(CARATTERE_TITOLI, gradino.titolo, peso.extra, P.testo)};letter-spacing:-0.2px">${testoSicuro(testi.marchio)}</span></td>
      </tr>
    </table>
  </td></tr>`;
}

/** Piè di pagina: uguale in ogni messaggio, per costruzione. */
function piede(testi: TestiInvolucro): string {
  const stilePiede = carattere(CARATTERE_CORPO, gradino.piede, peso.normale, P.debole);
  return `<tr><td style="padding:20px 8px 0">
    <p class="${CLASSI.debole}" style="${stilePiede};font-weight:${peso.semi}">${testoSicuro(testi.piedeMarchio)}</p>
    <p class="${CLASSI.debole}" style="${stilePiede};padding-top:4px">${testoSicuro(testi.piedeNota)}</p>
  </td></tr>`;
}

/** Compone il documento HTML completo di un'email. */
export function componiHtml(
  contenuto: ContenutoEmail,
  lingua: string,
  testi: TestiInvolucro,
): string {
  const corpo = contenuto.blocchi
    .map((blocco, indice) => rendiBlocco(blocco, indice === 0))
    .join('\n');

  return `<!doctype html>
<html lang="${testoSicuro(lingua)}" style="color-scheme:light dark;supported-color-schemes:light dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${testoSicuro(contenuto.oggetto)}</title>
<style>${foglioScuro(paletteScura)}</style>
</head>
<body class="${CLASSI.sfondo}" style="margin:0;padding:0;width:100%;background-color:${P.sfondo};-webkit-font-smoothing:antialiased">
${anteprima(contenuto.anteprima)}
<table role="presentation" class="${CLASSI.sfondo}" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${P.sfondo}">
  <tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${LARGHEZZA}px;margin:0 auto">
      ${intestazione(testi)}
      <tr><td class="${CLASSI.scheda}" style="background-color:${P.scheda};border:1px solid ${P.bordo};border-radius:${RAGGIO_SCHEDA}px;padding:32px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${corpo}
        </table>
      </td></tr>
      ${piede(testi)}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
