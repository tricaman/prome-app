import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  colori,
  riempimenti,
  RIEMPIMENTO_TESTO,
  tinte,
  tinteScure,
  type CoppiaTinta,
  type Tinta,
} from '../colori';
import { ombra, raggio } from '../scale';
import { temaChiaro, temaScuro, type Tema } from '../tema';

/**
 * Genera `tokens.css` dai token TypeScript: unica fonte di verità, due uscite
 * (questo CSS per il web, l'oggetto TS per il mobile). Il file prodotto è
 * committato, così `next build` non dipende dall'ordine di build dei pacchetti.
 * Rigenerare con `pnpm --filter @prome/design-tokens build`.
 *
 * I ruoli del tema sono emessi con i nomi attesi dal design system web, così
 * i componenti della libreria e le utility Tailwind pescano dagli stessi
 * valori: cambiare il tema qui cambia insieme componenti e classi.
 */

/**
 * Ruolo del tema → variabili attese dalla libreria di componenti.
 *
 * I nomi a destra sono quelli di HeroUI v3, verificati sul suo foglio di stile:
 * l'azione del marchio è `--accent` (è ciò che usa `variant="primary"`), non
 * `--primary`, che nella libreria non esiste. Le varianti `*-hover` non vanno
 * dichiarate: la libreria le ricava da sola con `color-mix`.
 */
const MAPPA_RUOLI: Record<keyof Tema, string[]> = {
  sfondo: ['--background'],
  testo: [
    '--foreground',
    '--surface-foreground',
    '--surface-secondary-foreground',
    '--surface-tertiary-foreground',
    '--overlay-foreground',
    '--default-foreground',
    '--segment-foreground',
  ],
  testoCorpo: [],
  testoTenue: ['--muted'],
  testoDidascalia: [],
  testoDebole: [],

  superficie: ['--surface'],
  superficieAlt: ['--surface-secondary', '--default', '--segment'],
  superficieAlt2: ['--surface-tertiary'],
  sovrapposizione: ['--overlay'],

  segnaposto: [],
  segnapostoFondo: [],

  superficieInversa: [],
  superficieInversaTesto: [],
  superficieInversaTenue: [],
  superficieInversaDebole: [],
  superficieInversaBordo: [],

  campo: ['--field-background'],
  campoTesto: ['--field-foreground'],
  campoSegnaposto: ['--field-placeholder'],

  bordo: ['--border', '--separator', '--scrollbar-thumb'],
  bordoForte: ['--field-border'],

  // L'azione del marchio: menta con testo scuro sopra, perché il menta non
  // regge il testo bianco (rapporto di contrasto 1.7:1).
  primario: ['--accent', '--focus'],
  primarioTesto: ['--accent-foreground'],
  primarioTenue: [],
  primarioAccento: [],
  primarioCollegamento: ['--link'],

  successo: ['--success'],
  successoTesto: ['--success-foreground'],
  successoTenue: [],

  avviso: ['--warning'],
  avvisoTesto: ['--warning-foreground'],
  avvisoTenue: [],

  errore: ['--danger'],
  erroreTesto: ['--danger-foreground'],
  erroreTenue: [],

  info: [],
  infoTesto: [],
  infoTenue: [],

  velo: ['--backdrop'],
};

/** camelCase → kebab-case, per le variabili in lingua del progetto. */
const trattinizza = (camel: string): string =>
  camel.replace(/[A-Z0-9]/g, (carattere) => `-${carattere.toLowerCase()}`);

const righeTema = (tema: Tema): string[] =>
  (Object.keys(tema) as (keyof Tema)[]).flatMap((ruolo) => {
    const valore = tema[ruolo];
    const alias = MAPPA_RUOLI[ruolo].map((nome) => `  ${nome}: ${valore};`);
    // Oltre agli alias tecnici, ogni ruolo resta leggibile col suo nome.
    return [`  --${trattinizza(ruolo)}: ${valore};`, ...alias];
  });

const righeRampe = (): string[] => [
  // I riempimenti decorativi stanno fra le rampe, non fra i ruoli: sono valori
  // fissi che non seguono il tema.
  ...riempimenti.map((hex, i) => `  --color-riempimento-${i + 1}: ${hex};`),
  `  --color-riempimento-testo: ${RIEMPIMENTO_TESTO};`,
  ...Object.entries(colori).flatMap(([nome, valore]) =>
    typeof valore === 'string'
      ? [`  --color-${nome}: ${valore};`]
      : Object.entries(valore).map(([grado, hex]) => `  --color-${nome}-${grado}: ${hex};`),
  ),
];

/** Nome della variabile di una tinta: `--tinta-menta`, `--tinta-menta-bordo`. */
const variabileTinta = (nome: string, ruolo: string): string =>
  `--tinta-${nome}${ruolo === 'sfondo' ? '' : `-${ruolo}`}`;

/**
 * Le tinte decorative stanno nei blocchi di tema, non fra le rampe: una rampa
 * è una scala fissa, una tinta è una decisione che cambia col tema. Sul fondo
 * scuro la stessa tinta ha sfondo e testo diversi, e questo è l'unico punto in
 * cui la differenza va scritta.
 */
const righeTinte = (insieme: Record<Tinta, CoppiaTinta>): string[] =>
  Object.entries(insieme).flatMap(([nome, coppia]) =>
    Object.entries(coppia).map(([ruolo, valore]) => `  ${variabileTinta(nome, ruolo)}: ${valore};`),
  );

const utilityDaiRuoli = (): string[] => [
  ...(Object.keys(temaChiaro) as (keyof Tema)[]).map(
    (ruolo) => `  --color-${trattinizza(ruolo)}: var(--${trattinizza(ruolo)});`,
  ),
  // bg-tinta-menta, text-tinta-menta-testo, border-tinta-menta-bordo, ...
  ...Object.entries(tinte).flatMap(([nome, coppia]) =>
    Object.entries(coppia).map(([ruolo]) => {
      const variabile = variabileTinta(nome, ruolo);
      return `  --color-${variabile.slice(2)}: var(${variabile});`;
    }),
  ),
];

const contenuto = `/*
 * FILE GENERATO — non modificare a mano.
 * Sorgente: packages/design-tokens/src · rigenera con
 * \`pnpm --filter @prome/design-tokens build\`.
 */

@theme {
  /* Rampe complete: bg-primary-500, text-neutral-700, ... */
${righeRampe().join('\n')}

  /* Ombre morbide e diffuse: l'identità "soffice" del prodotto. */
${Object.entries(ombra)
  .map(([nome, valore]) => `  --shadow-${nome}: ${valore.css};`)
  .join('\n')}

  /* I font sono iniettati dal layout; il fallback resta di sistema.
     Testo corrente e titoli hanno due famiglie distinte: i titoli usano una
     grottesca più tonda e pesante, il corpo una più neutra e leggibile. */
  --font-sans: var(--font-corpo), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-titoli), var(--font-corpo), ui-sans-serif, system-ui, sans-serif;
}

/*
 * Ruoli semantici — tema chiaro (predefinito).
 *
 * La doppia \`:root\` non è un vezzo: alza la specificità quel tanto che basta
 * per vincere sulle variabili della libreria di componenti, che vengono
 * emesse dopo le nostre e a parità di peso avrebbero l'ultima parola.
 */
:root:root,
:root:root.light,
:root:root[data-theme='light'] {
  color-scheme: light;
  /* Raggio di base della libreria: da qui deriva anche quello dei campi
     (una volta e mezza), che porta gli input ai 15px del disegno. */
  --radius: ${raggio.sm + 2}px;
  /* I campi della libreria nascono senza bordo; nel disegno il bordo c'è ed
     è ciò che li rende riconoscibili come "qui si scrive". */
  --field-border-width: 1px;
${righeTema(temaChiaro).join('\n')}
${righeTinte(tinte).join('\n')}
}

/* Ruoli semantici — tema scuro (più specifico del chiaro, quindi lo sostituisce) */
:root:root.dark,
:root:root[data-theme='dark'] {
  color-scheme: dark;
${righeTema(temaScuro).join('\n')}
${righeTinte(tinteScure).join('\n')}
}

/* I ruoli diventano utility: bg-sfondo, text-testo-tenue, border-bordo, ... */
@theme inline {
${utilityDaiRuoli().join('\n')}
}
`;

const destinazione = path.resolve(__dirname, '../../tokens.css');
fs.writeFileSync(destinazione, contenuto);
console.log(`Token CSS generati in ${destinazione}`);
