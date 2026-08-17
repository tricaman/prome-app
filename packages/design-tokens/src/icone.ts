/**
 * Icone del prodotto, come tracciati su una griglia 24×24.
 *
 * Stanno nei token perché sono parte del design system, non di una singola
 * piattaforma: web e app disegnano gli stessi segni, ognuno con la propria
 * tecnologia. Sono poche di proposito — un'icona in più è un'icona che qualcuno
 * dovrà imparare — e condividono spessore di tratto e terminali arrotondati.
 */
export const TRACCIATI = {
  bacheca: 'M3 4.5h18v15H3zM7 9h6M7 13h10M7 16h7',
  aule: 'M4 13v-1a8 8 0 0116 0v1M2.5 13h4.5v7H2.5zM17 13h4.5v7H17z',
  gruppi:
    'M9 8.5a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8M3.5 20.5c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5M16 5.6a3.2 3.2 0 010 6',
  cartella: 'M3.5 7.5A2 2 0 015.5 5.5h3.2l1.8 2h8A2 2 0 0120.5 9.5v8a2 2 0 01-2 2h-13a2 2 0 01-2-2z',
  profilo: 'M12 4.4a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2M4.8 20c.9-3.8 3.7-5.8 7.2-5.8s6.3 2 7.2 5.8',
  cerca: 'M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13m5 11.5 4 4',
  campana: 'M6 10a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10M10 19a2.2 2.2 0 004 0',
  piu: 'M12 5v14M5 12h14',
  indietro: 'M20 12H5m6-7-7 7 7 7',
  avanti: 'm9 6 6 6-6 6',
  // Non è `avanti` ruotata: una freccia ruotata via CSS prende terminali e
  // spessore storti sui mezzi pixel. Qui il verso lo dice il tracciato.
  giu: 'm6 9 6 6 6-6',
  chiudi: 'M6 6l12 12M18 6 6 18',
  commento:
    'M20.5 11.5c0 4.4-3.8 7.5-8.5 7.5-1 0-2-.15-2.9-.4L4.5 20.5l1.3-3.6A7.4 7.4 0 013.5 11.5C3.5 7.1 7.3 4 12 4s8.5 3.1 8.5 7.5Z',
  salva: 'M6 3.5h12v17l-6-4.5-6 4.5v-17Z',
  condividi: 'M12 15.5V3.5m0 0L8 7.5m4-4 4 4M4.5 14v4.5a2 2 0 002 2h11a2 2 0 002-2V14',
  carica: 'M12 16V5m0 0-4.5 4.5M12 5l4.5 4.5M4.5 15v3.5a2 2 0 002 2h11a2 2 0 002-2V15',
  microfono: 'M9 5.5a3 3 0 016 0v5a3 3 0 01-6 0zM5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5',
  microfonoSpento: 'M9 5.5a3 3 0 016 0v5a3 3 0 01-6 0zM5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5M4 4l16 16',
  lucchetto: 'M4.5 10.5h15v10h-15zM8.5 10.5V8a3.5 3.5 0 017 0v2.5',
  collegamento:
    'M9 13.5 4.8 9.2a3 3 0 014.2-4.2l1.2 1.2m5 4.3 4.2 4.3a3 3 0 01-4.2 4.2L13.8 18m-4.3-3.5 5-5',
  posta: 'M3 5h18v14H3zm1 2 8 6 8-6',
  impostazioni:
    'M12 8.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8M12 2.5v2.6M12 18.9v2.6M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.9 19.1l1.9-1.9M17.2 6.8l1.9-1.9',
  esci: 'M15 4.5h3.5a2 2 0 012 2v11a2 2 0 01-2 2H15M10 8l-4 4 4 4M6 12h9',
  cestino: 'M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13',
  sole: 'M12 7.9a4.1 4.1 0 100 8.2 4.1 4.1 0 000-8.2M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6',
  luna: 'M20.3 14.6A8.4 8.4 0 019.4 3.7a8.6 8.6 0 1010.9 10.9Z',
  matita: 'M4.5 19.5l.9-4 11-11a2.3 2.3 0 013.2 3.2l-11 11zM14.5 6.5l3 3',
  scudo: 'M12 3.2 5 5.8v5.4c0 4.3 2.9 7.6 7 9.6 4.1-2 7-5.3 7-9.6V5.8Z',
  documento: 'M6 3.5h7l5 5v12H6zM13 3.5v5h5M9 13h6M9 16.5h4',
  dispositivo:
    'M6.5 2.8h11a1.5 1.5 0 011.5 1.5v15.4a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.7V4.3a1.5 1.5 0 011.5-1.5M10.5 18.5h3',
  scarica: 'M12 5v11m0 0-4.5-4.5M12 16l4.5-4.5M4.5 15v3.5a2 2 0 002 2h11a2 2 0 002-2V15',
  aiuto:
    'M12 3.2a8.8 8.8 0 100 17.6 8.8 8.8 0 000-17.6M9.6 9.4a2.5 2.5 0 114.3 2c-.9.8-1.9 1.3-1.9 2.6M12 17.2v.4',
  fotocamera:
    'M4.5 7.5h3l1.4-2h6.2l1.4 2h3A1.5 1.5 0 0121 9v8.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5V9a1.5 1.5 0 011.5-1.5M12 10.6a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4',
  // L'aeroplanino: il gesto di mandare un messaggio non ha bisogno di una
  // parola, ed è l'unico segno che chiunque abbia usato una chat riconosce.
  invia: 'M21 3 10.2 13.8M21 3l-6.9 18-3.9-7.2L3 9.9Z',
  // I tre puntini: «c'è dell'altro qui», senza dover nominare cosa. Verticali
  // perché la riga che li ospita è alta, non larga.
  altro: 'M12 5.2v.1M12 12v.1M12 18.8v.1',
} as const;

export type NomeIcona = keyof typeof TRACCIATI;
