import type { Argomento, Ateneo, Guida } from './tipi';

/**
 * Contenuti dimostrativi del sito pubblico.
 *
 * Stanno qui, e non dentro le pagine, per una ragione precisa: quando l'API
 * esporrà queste entità basterà sostituire questo file con le chiamate, e
 * nessuna pagina dovrà cambiare. Sono testi in italiano perché il sito
 * pubblico esiste solo in italiano e in inglese redazionale.
 *
 * Sono tre soli insiemi — atenei, argomenti, guide — e sono **pagine scritte
 * da noi**. Qui non entrano aule studio, post, gruppi o persone: quei
 * contenuti appartengono agli utenti e si leggono solo da dentro l'app, dai
 * dati della sessione.
 */

export const ATENEI: readonly Ateneo[] = [
  {
    slug: 'universita-di-bologna',
    nome: 'Università di Bologna',
    nomeBreve: 'UniBo',
    citta: 'Bologna',
    descrizione:
      'L’Alma Mater Studiorum è il più antico ateneo del mondo occidentale. Su Prome gli studenti UniBo si organizzano soprattutto tra Ingegneria e Giurisprudenza, con picchi di aule studio nelle due settimane prima degli appelli di gennaio e giugno.',
    statistiche: { studenti: 3240, auleStudioMese: 128, materiali: 4100, gruppi: 62 },
    corsi: [
      { nome: 'Ingegneria informatica', studenti: 412, auleStudio: 28 },
      { nome: 'Giurisprudenza', studenti: 386, auleStudio: 22 },
      { nome: 'Medicina e chirurgia', studenti: 351, auleStudio: 19 },
      { nome: 'Economia e management', studenti: 298, auleStudio: 14 },
      { nome: 'Lettere moderne', studenti: 184, auleStudio: 9 },
      { nome: 'Scienze politiche', studenti: 142, auleStudio: 7 },
    ],
  },
  {
    slug: 'sapienza-roma',
    nome: 'Sapienza Università di Roma',
    nomeBreve: 'Sapienza',
    citta: 'Roma',
    descrizione:
      'Il più grande ateneo europeo per numero di iscritti. Su Prome la Sapienza è trainata da Giurisprudenza e Scienze politiche, con gruppi di corso che restano attivi per l’intero triennio.',
    statistiche: { studenti: 2810, auleStudioMese: 96, materiali: 3450, gruppi: 54 },
    corsi: [
      { nome: 'Giurisprudenza', studenti: 468, auleStudio: 31 },
      { nome: 'Scienze politiche', studenti: 302, auleStudio: 16 },
      { nome: 'Ingegneria gestionale', studenti: 274, auleStudio: 13 },
      { nome: 'Psicologia', studenti: 221, auleStudio: 11 },
    ],
  },
  {
    slug: 'politecnico-di-milano',
    nome: 'Politecnico di Milano',
    nomeBreve: 'PoliMi',
    citta: 'Milano',
    descrizione:
      'Al Politecnico le aule studio si concentrano sulle materie del primo biennio: Analisi, Fisica e Geometria. È l’ateneo con la media più alta di materiali per studente.',
    statistiche: { studenti: 2260, auleStudioMese: 74, materiali: 3980, gruppi: 47 },
    corsi: [
      { nome: 'Ingegneria informatica', studenti: 389, auleStudio: 24 },
      { nome: 'Ingegneria matematica', studenti: 196, auleStudio: 12 },
      { nome: 'Design del prodotto', studenti: 174, auleStudio: 8 },
      { nome: 'Architettura', studenti: 168, auleStudio: 7 },
    ],
  },
  {
    slug: 'universita-di-padova',
    nome: 'Università di Padova',
    nomeBreve: 'Padova',
    citta: 'Padova',
    descrizione:
      'A Padova le sessioni serali sono la norma: più della metà delle aule studio parte dopo le 20:00, soprattutto tra Medicina e Statistica.',
    statistiche: { studenti: 1940, auleStudioMese: 61, materiali: 2760, gruppi: 38 },
    corsi: [
      { nome: 'Medicina e chirurgia', studenti: 312, auleStudio: 18 },
      { nome: 'Statistica', studenti: 187, auleStudio: 10 },
      { nome: 'Psicologia', studenti: 165, auleStudio: 9 },
    ],
  },
  {
    slug: 'federico-ii-napoli',
    nome: 'Università di Napoli Federico II',
    nomeBreve: 'Federico II',
    citta: 'Napoli',
    descrizione:
      'La Federico II ha la comunità più attiva sulle materie mediche: le aule studio di Anatomia sono le più frequentate della piattaforma.',
    statistiche: { studenti: 1780, auleStudioMese: 58, materiali: 2340, gruppi: 35 },
    corsi: [
      { nome: 'Medicina e chirurgia', studenti: 341, auleStudio: 21 },
      { nome: 'Ingegneria civile', studenti: 158, auleStudio: 8 },
      { nome: 'Biologia', studenti: 142, auleStudio: 7 },
    ],
  },
];

export const ARGOMENTI: readonly Argomento[] = [
  {
    slug: 'analisi-2',
    nome: 'Analisi 2',
    sommario:
      'Integrali multipli, serie di funzioni, equazioni differenziali e funzioni di più variabili: 486 post, 92 materiali e 12 aule studio ricorrenti su Analisi 2, da 14 atenei italiani.',
    introduzione: [
      'La difficoltà di Analisi 2 non sta nei singoli teoremi ma nel passaggio dalle funzioni di una variabile a quelle di più variabili: gli studenti che superano l’esame al primo tentativo di solito dedicano le prime due settimane alla sola geometria dello spazio, prima ancora di toccare gli integrali.',
      'Nelle aule studio su Prome il pattern più frequente è il ripasso a coppie sui temi d’esame: una persona imposta l’esercizio ad alta voce, l’altra controlla i passaggi. Sotto trovi i materiali più usati e le sessioni aperte.',
    ],
    sottoArgomenti: [
      'Integrali multipli',
      'Serie numeriche',
      'Equazioni differenziali',
      'Funzioni di più variabili',
      'Teoremi',
    ],
    collegati: [
      'Analisi 1',
      'Geometria',
      'Fisica 1',
      'Probabilità',
      'Algebra lineare',
      'Metodi matematici',
    ],
    conteggi: { post: 486, materiali: 92, auleStudio: 12, atenei: 14 },
  },
  {
    slug: 'metodo-di-studio',
    nome: 'Metodo di studio',
    sommario:
      'Come si organizza la settimana prima di un appello, quanto durano davvero le sessioni e cosa cambia studiando in due: 212 post e 34 aule studio ricorrenti.',
    introduzione: [
      'Il metodo di studio è l’unico argomento trasversale a tutti i corsi: qui si incontrano studenti di Medicina e di Ingegneria per lo stesso motivo, cioè far durare le sessioni più di mezz’ora.',
      'Le aule studio su questo argomento sono quasi sempre pubbliche e aperte a tutti gli atenei: si entra, si dichiara l’obiettivo in chat e si studia in silenzio con l’audio acceso.',
    ],
    sottoArgomenti: ['Pomodoro', 'Pianificazione', 'Ripasso attivo', 'Gestione delle pause'],
    collegati: ['Preparazione esami', 'Appunti', 'Concentrazione'],
    conteggi: { post: 212, materiali: 47, auleStudio: 34, atenei: 38 },
  },
  {
    slug: 'diritto-privato',
    nome: 'Diritto privato',
    sommario:
      'Casi pratici, schemi del codice civile e ripassi a voce prima dell’orale: 318 post e 61 materiali da 11 atenei.',
    introduzione: [
      'Diritto privato è la materia in cui il ripasso orale conta più di ogni altra cosa: nelle aule studio si simulano le domande d’esame a turno, un partecipante interroga e gli altri correggono.',
      'I materiali più scaricati sono schemi, non riassunti: le mappe del codice civile per istituto reggono meglio del testo continuo quando mancano pochi giorni.',
    ],
    sottoArgomenti: ['Obbligazioni', 'Contratti', 'Responsabilità civile', 'Famiglia e successioni'],
    collegati: ['Diritto costituzionale', 'Diritto commerciale', 'Procedura civile'],
    conteggi: { post: 318, materiali: 61, auleStudio: 9, atenei: 11 },
  },
];

export const GUIDE: readonly Guida[] = [
  {
    slug: 'metodo-pomodoro-dati',
    titolo: 'Il metodo Pomodoro funziona davvero? Cosa dicono i dati di 12.000 sessioni',
    sommario:
      'Abbiamo guardato quanto durano davvero le sessioni di studio su Prome, quante pause servono e perché studiare in aula studio cambia i numeri.',
    categoria: 'Metodo',
    minutiLettura: 8,
    data: '12 agosto 2026',
    dataIso: '2026-08-12',
    autore: 'Marius Trica',
    inEvidenza: true,
    corpo: [
      {
        tipo: 'occhiello',
        testo:
          'Venticinque minuti di studio, cinque di pausa, e dopo quattro cicli una pausa lunga. La tecnica del Pomodoro è il consiglio più ripetuto tra gli studenti universitari — ma quasi nessuno la applica come è stata pensata.',
      },
      {
        tipo: 'paragrafo',
        testo:
          'Abbiamo analizzato in forma aggregata e anonima la durata di 12.000 sessioni di aula studio su Prome tra gennaio e giugno 2026. Il dato più netto riguarda le sessioni di gruppo: durano in media 68 minuti contro i 34 di chi studia da solo con lo stesso obiettivo dichiarato.',
      },
      { tipo: 'titolo', testo: 'Il problema non è la concentrazione, è ricominciare' },
      {
        tipo: 'paragrafo',
        testo:
          'Nelle sessioni solitarie l’abbandono avviene quasi sempre alla prima pausa: chi si ferma dopo il primo blocco da 25 minuti torna a studiare solo nel 41% dei casi. In aula studio, dove qualcun altro sta aspettando che riparta il timer, la stessa percentuale sale all’83%.',
      },
      {
        tipo: 'citazione',
        testo:
          'Il valore del Pomodoro non è nei 25 minuti. È nel fatto che qualcun altro conta gli stessi minuti insieme a te.',
      },
      { tipo: 'titolo', testo: 'Tre correzioni che funzionano' },
      {
        tipo: 'paragrafo',
        testo:
          'Dai dati emergono tre aggiustamenti che allungano le sessioni senza aumentare la fatica percepita:',
      },
      {
        tipo: 'punti',
        punti: [
          {
            titolo: 'Trenta minuti, non venticinque',
            testo:
              'Nelle sessioni di gruppo il blocco da 30 minuti ha lo stesso tasso di completamento di quello da 25, ma copre il 20% di materia in più.',
          },
          {
            titolo: 'La pausa va dichiarata, non presa',
            testo:
              'Chi annuncia in chat “pausa 5 minuti” rientra nell’88% dei casi. Chi si allontana in silenzio, nel 52%.',
          },
          {
            titolo: 'Un obiettivo per sessione, scritto nel titolo',
            testo:
              'Le aule studio con un titolo specifico (“integrali per parti”) durano in media 22 minuti in più di quelle generiche (“ripasso analisi”).',
          },
        ],
      },
      {
        tipo: 'paragrafo',
        testo:
          'Nessuna di queste è una scoperta rivoluzionaria, ma insieme spostano la media di una sessione da mezz’ora scarsa a poco più di un’ora — che è, in pratica, la differenza tra ripassare un capitolo e finirlo.',
      },
    ],
  },
  {
    slug: 'studiare-in-due',
    titolo: 'Studiare in due: perché funziona anche se non vi piace',
    sommario:
      'L’effetto della presenza altrui sulla durata delle sessioni, e come organizzarla senza perdere tempo.',
    categoria: 'Metodo',
    minutiLettura: 6,
    data: '7 agosto 2026',
    dataIso: '2026-08-07',
    autore: 'Marius Trica',
  },
  {
    slug: 'preparare-un-orale-in-due-settimane',
    titolo: 'Come si prepara un orale quando hai due settimane',
    sommario: 'Un piano realistico che parte dalla struttura del programma, non dai riassunti.',
    categoria: 'Esami',
    minutiLettura: 9,
    data: '31 luglio 2026',
    dataIso: '2026-07-31',
    autore: 'Marius Trica',
  },
  {
    slug: 'appunti-a-mano-o-al-computer',
    titolo: 'Prendere appunti a mano o al computer? Dipende dall’esame',
    sommario: 'Cosa cambia tra materie con formule e materie con testi lunghi.',
    categoria: 'Appunti',
    minutiLettura: 5,
    data: '24 luglio 2026',
    dataIso: '2026-07-24',
    autore: 'Marius Trica',
  },
  {
    slug: 'calendario-della-sessione',
    titolo: 'Il calendario della sessione che non ti fa arrivare in ritardo',
    sommario: 'Come contare i giorni utili e non quelli sul calendario.',
    categoria: 'Organizzazione',
    minutiLettura: 7,
    data: '16 luglio 2026',
    dataIso: '2026-07-16',
    autore: 'Marius Trica',
  },
  {
    slug: 'ripetere-ad-alta-voce',
    titolo: 'Ripetere ad alta voce: la tecnica più sottovalutata',
    sommario: 'Perché spiegare a qualcun altro è il test più affidabile che hai.',
    categoria: 'Metodo',
    minutiLettura: 4,
    data: '9 luglio 2026',
    dataIso: '2026-07-09',
    autore: 'Marius Trica',
  },
  {
    slug: 'tenere-vivo-un-gruppo-di-studio',
    titolo: 'Come si tiene in vita un gruppo di studio dopo il primo mese',
    sommario: 'Le tre abitudini dei gruppi che non muoiono a novembre.',
    categoria: 'Gruppi',
    minutiLettura: 8,
    data: '1 luglio 2026',
    dataIso: '2026-07-01',
    autore: 'Marius Trica',
  },
];
