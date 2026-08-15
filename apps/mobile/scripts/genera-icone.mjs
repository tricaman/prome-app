// @ts-check
/**
 * Genera le icone dell'app dal marchio.
 *
 *   node scripts/genera-icone.mjs
 *
 * Le sei immagini in `assets/images` **derivano tutte da un file solo**,
 * `apps/web/public/logo-prome.svg`, che è il marchio storico del prodotto: se
 * qualcuno lo ridisegna, si rilancia questo script invece di ritoccare sei PNG
 * a mano e scoprire mesi dopo che due non sono più uguali agli altri.
 *
 * Tre decisioni sono dentro il codice perché rifarle a occhio va storto:
 *
 * - **Il segno non si ricolora.** Dentro il marchio c'è un pezzo raster
 *   incorporato (un `<image>` con un PNG in base64): cambiare i `fill`
 *   tingerebbe i tracciati lasciando quel pezzo com'era, e il risultato è una
 *   foglia di un altro colore. Dove serve il segno su fondo diverso si usa il
 *   marchio intero, pastiglia compresa.
 * - **La scala del primo piano Android è 0,66.** L'icona adattiva viene
 *   ritagliata dal sistema con maschere che non conosciamo, e solo i due terzi
 *   centrali sono garantiti. Con la pastiglia menta come sfondo, il risultato
 *   sotto una maschera circolare è identico al marchio.
 * - **Il segno conserva la posizione che ha dentro il cerchio.** Nel marchio il
 *   suo bordo inferiore è tagliato dal cerchio: ricentrarlo lo farebbe sembrare
 *   un ritaglio sbagliato. Si scala tutta la geometria attorno al centro.
 *
 * Richiede `rsvg-convert` (`brew install librsvg`): è l'unico rasterizzatore
 * che rende correttamente il raster incorporato senza aprire un browser.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LATO = 2834.65;
const MENTA = '#32E0C4';
const SCURO = '#232323';
/** Zona sicura dell'icona adattiva Android: i due terzi centrali. */
const SICURA = 0.66;

const sorgente = readFileSync(new URL('../../web/public/logo-prome.svg', import.meta.url), 'utf8');

/** Estrae un gruppo del marchio per identificativo. */
function gruppo(nome) {
  const trovato = sorgente.match(new RegExp(`<g id="${nome}">([\\s\\S]*?)</g>`));
  if (!trovato) throw new Error(`Gruppo "${nome}" assente dal marchio: il logo è cambiato`);
  return trovato[1];
}

const pastiglia = gruppo('roundBackground');
const segno = gruppo('CircularLogo');
const marchio = pastiglia + segno;

function componi({ sfondo, contenuto = '', scala = 1, colore = SCURO }) {
  const fondo = sfondo ? `<rect width="${LATO}" height="${LATO}" fill="${sfondo}"/>` : '';
  const sposta = (LATO * (1 - scala)) / 2;
  const corpo = contenuto
    ? `<g transform="translate(${sposta},${sposta}) scale(${scala})">${contenuto}</g>`
    : '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    `viewBox="0 0 ${LATO} ${LATO}">` +
    `<defs><style>.cls-1{fill:${MENTA};}.cls-2{fill:${colore};}</style></defs>` +
    `${fondo}${corpo}</svg>`
  );
}

const IMMAGINI = [
  // iOS e master: quadrato pieno, nessuna trasparenza — iOS arrotonda da sé.
  ['icon.png', 1024, componi({ sfondo: MENTA, contenuto: segno, scala: SICURA })],
  ['android-icon-background.png', 1024, componi({ sfondo: MENTA })],
  ['android-icon-foreground.png', 1024, componi({ contenuto: segno, scala: SICURA })],
  // Monocromatica (Android 13+): conta solo il canale alfa, non il colore.
  [
    'android-icon-monochrome.png',
    1024,
    componi({ contenuto: segno, scala: SICURA, colore: '#000000' }),
  ],
  // Splash e favicon: il marchio intero, che regge sul chiaro e sullo scuro.
  ['splash-icon.png', 512, componi({ contenuto: marchio })],
  ['favicon.png', 96, componi({ contenuto: marchio })],
];

const temporanea = mkdtempSync(join(tmpdir(), 'icone-prome-'));

for (const [nome, lato, svg] of IMMAGINI) {
  const fonte = join(temporanea, `${nome}.svg`);
  const destinazione = new URL(`../assets/images/${nome}`, import.meta.url);
  writeFileSync(fonte, svg, 'utf8');
  execFileSync('rsvg-convert', [
    '-w',
    String(lato),
    '-h',
    String(lato),
    '-o',
    destinazione.pathname,
    fonte,
  ]);
  const peso = statSync(destinazione).size;
  console.log(`${nome.padEnd(30)} ${String(lato).padStart(5)}px  ${peso} byte`);
}
