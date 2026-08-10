import type { Visibilita } from './tipi';

/**
 * Dati della sessione dimostrativa dell'area privata.
 *
 * Rappresentano "chi sono io e cosa vedo": finché non c'è l'autenticazione,
 * l'app web mostra sempre questa persona. Quando arriverà Better Auth, questo
 * file sparisce e al suo posto ci sarà la sessione reale — le schermate
 * leggono già da qui, quindi non cambieranno.
 */

export interface Utente {
  nome: string;
  email: string;
  ateneo: string;
  corso: string;
  anno: string;
}

export const UTENTE: Utente = {
  nome: 'Marta Rossi',
  email: 'marta.rossi@studenti.unibo.it',
  ateneo: 'Università di Bologna',
  corso: 'Ingegneria informatica',
  anno: '2° anno',
};

export interface GruppoDiSessione {
  slug: string;
  nome: string;
}

export const MIEI_GRUPPI: readonly GruppoDiSessione[] = [
  { slug: 'ingegneria-informatica-2026', nome: 'Ingegneria informatica 2026' },
  { slug: 'statistica-2026', nome: 'Statistica 2026' },
  { slug: 'erasmus-lisbona', nome: 'Erasmus Lisbona' },
];

export interface PostDiBacheca {
  id: string;
  autore: string;
  contesto: string;
  corpo: string;
  tag: readonly string[];
  commenti: number;
  allegato?: { nome: string; dettaglio: string };
  immagini?: number;
}

export const BACHECA: readonly PostDiBacheca[] = [
  {
    id: '8f2a',
    autore: 'Giulia Ferrari',
    contesto: 'Ingegneria informatica · 2 ore fa',
    corpo:
      'Ho riordinato gli appunti di Analisi 2 con tutti gli esercizi d’esame degli ultimi tre anni, divisi per argomento. Se trovate errori scrivetemeli nei commenti 🙌',
    tag: ['Analisi 2', 'Esercizi'],
    commenti: 14,
    allegato: { nome: 'Analisi2_esercizi_2021-2024.pdf', dettaglio: '4,2 MB · 38 pagine' },
  },
  {
    id: '3b71',
    autore: 'Luca Bianchi',
    contesto: 'Gruppo · Statistica 2026 · 5 ore fa',
    corpo:
      'Foto della lavagna di stamattina, la parte sui test d’ipotesi. Sono quattro scatti, gli ultimi due sono un po’ sfocati ma si legge.',
    tag: ['Statistica'],
    commenti: 3,
    immagini: 2,
  },
  {
    id: 'c40d',
    autore: 'Sara Conti',
    contesto: 'Giurisprudenza · ieri',
    corpo:
      'Qualcuno ha voglia di ripassare Diritto privato in aula studio giovedì sera? Apro io se siamo almeno in tre.',
    tag: ['Diritto privato'],
    commenti: 9,
  },
];

export interface AulaDiSessione {
  id: string;
  titolo: string;
  contesto: string;
  visibilita: Visibilita;
  gruppo?: string;
  partecipanti: string;
}

export const AULE_IN_CORSO: readonly AulaDiSessione[] = [
  {
    id: 'analisi-2-ripasso',
    titolo: 'Analisi 2 · ripasso pre-esame',
    contesto: 'Estemporanea · aperta da Giulia Ferrari',
    visibilita: 'Privato',
    gruppo: 'Ing. informatica 2026',
    partecipanti: '8 partecipanti',
  },
  {
    id: 'metodo-pomodoro',
    titolo: 'Metodo Pomodoro insieme',
    contesto: 'Estemporanea · tutti gli atenei',
    visibilita: 'Pubblico',
    partecipanti: '41 partecipanti',
  },
  {
    id: 'fisica-1-dinamica',
    titolo: 'Fisica 1 · esercizi di dinamica',
    contesto: 'Estemporanea · PoliMi',
    visibilita: 'Ateneo',
    partecipanti: '7 partecipanti',
  },
  {
    id: 'inglese-b2',
    titolo: 'Inglese B2 · conversazione libera',
    contesto: 'Estemporanea · tutti gli atenei',
    visibilita: 'Pubblico',
    partecipanti: '16 partecipanti',
  },
];

export interface AulaProgrammata {
  id: string;
  giorno: string;
  mese: string;
  ora: string;
  titolo: string;
  contesto: string;
}

export const AULE_PROGRAMMATE: readonly AulaProgrammata[] = [
  {
    id: 'diritto-privato-casi',
    giorno: '25',
    mese: 'SET',
    ora: '21:00',
    titolo: 'Diritto privato · casi pratici',
    contesto: 'Sapienza · nel gruppo Giurisprudenza 2026 · 14 iscritti',
  },
  {
    id: 'laboratorio-consegna',
    giorno: '29',
    mese: 'SET',
    ora: '18:30',
    titolo: 'Laboratorio · consegna progetto',
    contesto: 'Ing. informatica 2026 · cartella Progetti · 11 iscritti',
  },
  {
    id: 'statistica-test-ipotesi',
    giorno: '01',
    mese: 'OTT',
    ora: '18:00',
    titolo: 'Statistica inferenziale · test d’ipotesi',
    contesto: 'Padova · pubblica · 31 iscritti',
  },
];

/** Persone dentro l'aula studio, con il ruolo che decide i loro permessi. */
export interface Partecipante {
  id: string;
  nome: string;
  contesto: string;
  moderatore: boolean;
  /** Sta parlando in questo momento. */
  attivo?: boolean;
  /** È la persona collegata. */
  sonoIo?: boolean;
}

export const PARTECIPANTI: readonly Partecipante[] = [
  {
    id: 'giulia',
    nome: 'Giulia Ferrari',
    contesto: 'Ingegneria informatica · in aula da 42 min',
    moderatore: true,
    attivo: true,
  },
  {
    id: 'marta',
    nome: 'Marta Rossi',
    contesto: 'Ingegneria informatica · in aula da 22 min',
    moderatore: true,
    sonoIo: true,
  },
  {
    id: 'luca',
    nome: 'Luca Bianchi',
    contesto: 'Ingegneria informatica · in aula da 18 min',
    moderatore: false,
  },
  {
    id: 'sara',
    nome: 'Sara Conti',
    contesto: 'Giurisprudenza · in aula da 12 min',
    moderatore: false,
  },
  {
    id: 'marco',
    nome: 'Marco Villa',
    contesto: 'Ingegneria gestionale · appena entrato',
    moderatore: false,
  },
  {
    id: 'elena',
    nome: 'Elena Ricci',
    contesto: 'Ingegneria informatica · in aula da 30 min',
    moderatore: false,
  },
];

export interface MessaggioChat {
  id: string;
  autore: string;
  testo: string;
  ora: string;
  mio?: boolean;
}

export const CHAT: readonly MessaggioChat[] = [
  {
    id: '1',
    autore: 'Giulia Ferrari',
    testo: 'Partiamo dagli integrali per parti, ho caricato gli esercizi nell’argomento Integrali.',
    ora: '20:41',
  },
  {
    id: '2',
    autore: 'Luca Bianchi',
    testo: 'Il 3 non mi torna, il segno del secondo passaggio.',
    ora: '20:44',
  },
  { id: '3', autore: 'Marta Rossi', testo: 'Anche a me, controllo e vi dico.', ora: '20:45', mio: true },
  {
    id: '4',
    autore: 'Giulia Ferrari',
    testo: 'Lo rifaccio ad alta voce così lo seguiamo insieme.',
    ora: '20:46',
  },
];

export interface FileDiAula {
  nome: string;
  dettaglio: string;
  tipo: 'pdf' | 'immagine' | 'testo';
}

export interface ArgomentoDiAula {
  nome: string | null;
  file: readonly FileDiAula[];
}

export const MATERIALI_AULA: readonly ArgomentoDiAula[] = [
  {
    nome: 'Integrali',
    file: [
      { nome: 'esercizi_integrali.pdf', dettaglio: 'Giulia · 2,1 MB · oggi', tipo: 'pdf' },
      { nome: 'lavagna_integrali.jpg', dettaglio: 'Marta · 1,4 MB · oggi', tipo: 'immagine' },
      { nome: 'formule_da_ricordare.txt', dettaglio: 'Luca · 12 KB · ieri', tipo: 'testo' },
    ],
  },
  {
    nome: 'Serie numeriche',
    file: [{ nome: 'criteri_convergenza.pdf', dettaglio: 'Giulia · 900 KB · ieri', tipo: 'pdf' }],
  },
  {
    nome: null,
    file: [
      { nome: 'foto_appunti_1.jpg', dettaglio: 'Marco · 2,8 MB · oggi', tipo: 'immagine' },
      { nome: 'dispensa_prof.pdf', dettaglio: 'Sara · 5,4 MB · oggi', tipo: 'pdf' },
    ],
  },
];

/** Albero delle cartelle di un gruppo: il livello dà il rientro. */
export interface NodoCartella {
  nome: string;
  livello: number;
  attiva?: boolean;
}

export const ALBERO_GRUPPO: readonly NodoCartella[] = [
  { nome: 'Ingegneria informatica 2026', livello: 0 },
  { nome: 'Primo anno', livello: 1 },
  { nome: 'Secondo anno', livello: 1 },
  { nome: 'Analisi 2', livello: 2, attiva: true },
  { nome: 'Fisica 1', livello: 2 },
  { nome: 'Algoritmi', livello: 2 },
  { nome: 'Progetti di laboratorio', livello: 1 },
];

export const FILE_CARTELLA: readonly FileDiAula[] = [
  { nome: 'esercizi_integrali.pdf', dettaglio: 'Giulia · 2,1 MB', tipo: 'pdf' },
  { nome: 'criteri_convergenza.pdf', dettaglio: 'Giulia · 900 KB', tipo: 'pdf' },
  { nome: 'lavagna_integrali.jpg', dettaglio: 'Marta · 1,4 MB', tipo: 'immagine' },
  { nome: 'formule_da_ricordare.txt', dettaglio: 'Luca · 12 KB', tipo: 'testo' },
  { nome: 'dispensa_prof.pdf', dettaglio: 'Sara · 5,4 MB', tipo: 'pdf' },
  { nome: 'foto_appunti_1.jpg', dettaglio: 'Marco · 2,8 MB', tipo: 'immagine' },
];
