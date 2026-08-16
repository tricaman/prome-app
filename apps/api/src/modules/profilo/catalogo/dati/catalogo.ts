/**
 * Il catalogo accademico, curato a mano e versionato con il codice.
 *
 * È la **fonte di verità**: il database ne è una copia, riscritta a ogni
 * rilascio da `seminaCatalogo`. Aggiungere un ateneo o un corso significa
 * aggiungere una voce qui e rilasciare — non una INSERT sulla macchina, che
 * sparirebbe al primo ripristino e non si vedrebbe in nessuna diff.
 *
 * Il catalogo è **chiuso**: chi fa l'onboarding sceglie da questo elenco e non
 * può scrivere altro. La conseguenza va tenuta presente ogni volta che si
 * guarda questo file: **un corso che manca qui è una persona che non può
 * entrare in Prome**. Finché gli atenei sono cinque, questo file è anche la
 * lista d'attesa del prodotto.
 *
 * Gli `slug` degli atenei sono gli stessi delle pagine pubbliche
 * (`@prome/contenuti`): il giorno in cui l'hub di ateneo leggerà dall'API non
 * servirà una mappatura fra due elenchi nel frattempo divergiti.
 *
 * ## Sui codici
 *
 * Il `codice` è quello assegnato dall'ateneo (es. 6612), unico dentro l'ateneo
 * e non nel mondo. Dove non è stato verificato sul catalogo dell'ateneo la
 * voce porta `daVerificare: true`, e la semina lo conta a ogni giro: un codice
 * inventato che nessuno dichiara tale è indistinguibile da uno vero.
 */

export type LivelloDiCorso = 'TRIENNALE' | 'MAGISTRALE' | 'CICLO_UNICO';

export interface ClasseDaSeminare {
  /** Codice ministeriale: identifica la classe nel mondo, non solo qui. */
  codice: string;
  nome: string;
  livello: LivelloDiCorso;
}

export interface CorsoDaSeminare {
  /** Codice dell'ateneo. Unico dentro l'ateneo: è la chiave naturale della semina. */
  codice: string;
  nome: string;
  classeCodice: string;
  durataAnni: number;
  /** Il codice non è stato verificato sul catalogo dell'ateneo. */
  daVerificare?: boolean;
}

export interface UniversitaDaSeminare {
  slug: string;
  nome: string;
  nomeBreve: string;
  citta: string;
  corsi: readonly CorsoDaSeminare[];
}

export interface CatalogoDaSeminare {
  classi: readonly ClasseDaSeminare[];
  universita: readonly UniversitaDaSeminare[];
}

/**
 * Le classi ministeriali usate dai corsi qui sotto, e nessun'altra.
 *
 * L'elenco completo del ministero conta oltre cento voci: seminarle tutte
 * riempirebbe una tabella di righe che nessun corso cita, e renderebbe
 * invisibile l'unica domanda che conta guardandola — quali classi sono
 * davvero rappresentate su Prome.
 */
const CLASSI: readonly ClasseDaSeminare[] = [
  { codice: 'L-4', nome: 'Disegno industriale', livello: 'TRIENNALE' },
  { codice: 'L-7', nome: 'Ingegneria civile e ambientale', livello: 'TRIENNALE' },
  { codice: 'L-8', nome: 'Ingegneria dell\'informazione', livello: 'TRIENNALE' },
  { codice: 'L-9', nome: 'Ingegneria industriale', livello: 'TRIENNALE' },
  { codice: 'L-10', nome: 'Lettere', livello: 'TRIENNALE' },
  { codice: 'L-13', nome: 'Scienze biologiche', livello: 'TRIENNALE' },
  { codice: 'L-17', nome: 'Scienze dell\'architettura', livello: 'TRIENNALE' },
  { codice: 'L-18', nome: 'Scienze dell\'economia e della gestione aziendale', livello: 'TRIENNALE' },
  // La classe riformata (DM 1649/2023) convive con la precedente e ha un
  // codice proprio: due corsi della stessa area possono portarne una ciascuna,
  // ed è esattamente il motivo per cui la classe non è un campo di testo.
  { codice: 'L-18 R', nome: 'Scienze dell\'economia e della gestione aziendale', livello: 'TRIENNALE' },
  { codice: 'L-24', nome: 'Scienze e tecniche psicologiche', livello: 'TRIENNALE' },
  { codice: 'L-31', nome: 'Scienze e tecnologie informatiche', livello: 'TRIENNALE' },
  { codice: 'L-35', nome: 'Scienze matematiche', livello: 'TRIENNALE' },
  { codice: 'L-36', nome: 'Scienze politiche e delle relazioni internazionali', livello: 'TRIENNALE' },
  { codice: 'L-41', nome: 'Statistica', livello: 'TRIENNALE' },
  { codice: 'LMG/01', nome: 'Giurisprudenza', livello: 'CICLO_UNICO' },
  { codice: 'LM-41', nome: 'Medicina e chirurgia', livello: 'CICLO_UNICO' },
];

const UNIVERSITA: readonly UniversitaDaSeminare[] = [
  {
    slug: 'universita-di-bologna',
    nome: 'Università di Bologna',
    nomeBreve: 'UniBo',
    citta: 'Bologna',
    corsi: [
      // Verificato sul catalogo dell'ateneo: A.A. 2026/2027, Campus Forlì.
      { codice: '6612', nome: 'Economia e commercio', classeCodice: 'L-18 R', durataAnni: 3 },
      { codice: '8009', nome: 'Ingegneria informatica', classeCodice: 'L-8', durataAnni: 3, daVerificare: true },
      { codice: '9232', nome: 'Giurisprudenza', classeCodice: 'LMG/01', durataAnni: 5, daVerificare: true },
      { codice: '8415', nome: 'Medicina e chirurgia', classeCodice: 'LM-41', durataAnni: 6, daVerificare: true },
      { codice: '8965', nome: 'Economia e management', classeCodice: 'L-18', durataAnni: 3, daVerificare: true },
      { codice: '8850', nome: 'Lettere moderne', classeCodice: 'L-10', durataAnni: 3, daVerificare: true },
      { codice: '8853', nome: 'Scienze politiche', classeCodice: 'L-36', durataAnni: 3, daVerificare: true },
    ],
  },
  {
    slug: 'sapienza-roma',
    nome: 'Sapienza Università di Roma',
    nomeBreve: 'Sapienza',
    citta: 'Roma',
    corsi: [
      { codice: '29343', nome: 'Giurisprudenza', classeCodice: 'LMG/01', durataAnni: 5, daVerificare: true },
      { codice: '29936', nome: 'Scienze politiche e relazioni internazionali', classeCodice: 'L-36', durataAnni: 3, daVerificare: true },
      { codice: '30422', nome: 'Ingegneria gestionale', classeCodice: 'L-9', durataAnni: 3, daVerificare: true },
      { codice: '29929', nome: 'Psicologia e processi sociali', classeCodice: 'L-24', durataAnni: 3, daVerificare: true },
      { codice: '29932', nome: 'Medicina e chirurgia', classeCodice: 'LM-41', durataAnni: 6, daVerificare: true },
    ],
  },
  {
    slug: 'politecnico-di-milano',
    nome: 'Politecnico di Milano',
    nomeBreve: 'PoliMi',
    citta: 'Milano',
    corsi: [
      { codice: '1381', nome: 'Ingegneria informatica', classeCodice: 'L-8', durataAnni: 3, daVerificare: true },
      { codice: '1387', nome: 'Ingegneria matematica', classeCodice: 'L-35', durataAnni: 3, daVerificare: true },
      { codice: '1290', nome: 'Design del prodotto industriale', classeCodice: 'L-4', durataAnni: 3, daVerificare: true },
      { codice: '1268', nome: 'Progettazione dell\'architettura', classeCodice: 'L-17', durataAnni: 3, daVerificare: true },
      { codice: '1394', nome: 'Ingegneria gestionale', classeCodice: 'L-9', durataAnni: 3, daVerificare: true },
    ],
  },
  {
    slug: 'universita-di-padova',
    nome: 'Università di Padova',
    nomeBreve: 'Padova',
    citta: 'Padova',
    corsi: [
      { codice: 'ME1855', nome: 'Medicina e chirurgia', classeCodice: 'LM-41', durataAnni: 6, daVerificare: true },
      { codice: 'SC1167', nome: 'Statistica per l\'economia e l\'impresa', classeCodice: 'L-41', durataAnni: 3, daVerificare: true },
      { codice: 'PS1932', nome: 'Scienze psicologiche dello sviluppo', classeCodice: 'L-24', durataAnni: 3, daVerificare: true },
      { codice: 'IN0508', nome: 'Ingegneria informatica', classeCodice: 'L-8', durataAnni: 3, daVerificare: true },
    ],
  },
  {
    slug: 'federico-ii-napoli',
    nome: 'Università di Napoli Federico II',
    nomeBreve: 'Federico II',
    citta: 'Napoli',
    corsi: [
      { codice: 'M08', nome: 'Medicina e chirurgia', classeCodice: 'LM-41', durataAnni: 6, daVerificare: true },
      { codice: 'N14', nome: 'Ingegneria civile', classeCodice: 'L-7', durataAnni: 3, daVerificare: true },
      { codice: 'N13', nome: 'Scienze biologiche', classeCodice: 'L-13', durataAnni: 3, daVerificare: true },
      { codice: 'N46', nome: 'Informatica', classeCodice: 'L-31', durataAnni: 3, daVerificare: true },
    ],
  },
];

export const CATALOGO: CatalogoDaSeminare = { classi: CLASSI, universita: UNIVERSITA };
