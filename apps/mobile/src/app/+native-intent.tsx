/**
 * Da un indirizzo del sito a una schermata dell'app.
 *
 * I collegamenti che arrivano da fuori — l'email di invito, un indirizzo
 * copiato dal browser — parlano la lingua del **sito**: `/app/inviti/<id>`,
 * eventualmente con il prefisso di lingua che il sito aggiunge da sé
 * (`/it/app/inviti/<id>`). Le rotte dell'app sono un altro albero, senza
 * l'area privata e senza lingua nell'indirizzo, quindi senza questa
 * traduzione un link universale aprirebbe l'app su «Pagina non trovata» —
 * che è peggio di non averlo aperto affatto.
 *
 * Sta qui e non nelle schermate perché è **la stessa decisione dell'AASA**:
 * il file servito da `prome.app` dichiara quali indirizzi l'app sa aprire, e
 * questo elenco dev'essere lo stesso. Se uno dei due cresce senza l'altro, o
 * si apre una schermata che non esiste, o si lascia al browser un indirizzo
 * che l'app avrebbe saputo gestire.
 *
 * Lo schema privato (`prome://inviti/<id>`) non passa da qui: quei percorsi
 * sono già rotte dell'app e arrivano intatti.
 */

/** Le due sole famiglie di indirizzi che l'app rivendica sul dominio. */
const TRADUZIONI: { schema: RegExp; rotta: (id: string) => string }[] = [
  {
    schema: /^\/(?:[a-z]{2}\/)?app\/inviti\/([^/?#]+)/,
    rotta: (id) => `/inviti/${id}`,
  },
  {
    schema: /^\/(?:[a-z]{2}\/)?app\/inviti-gruppo\/([^/?#]+)/,
    rotta: (id) => `/inviti-gruppo/${id}`,
  },
];

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // Un errore qui fa cadere l'app all'avvio, che è il momento peggiore: la
  // documentazione di expo-router lo dice esplicitamente, e vale anche per un
  // indirizzo malformato che nessuno ha previsto.
  try {
    // Arriva a volte l'indirizzo intero (link universale), a volte il solo
    // percorso (schema privato): la base serve solo a poterli leggere allo
    // stesso modo, e non finisce da nessuna parte.
    const percorso = new URL(path, 'https://prome.app').pathname;

    for (const { schema, rotta } of TRADUZIONI) {
      const trovato = percorso.match(schema);
      if (trovato) return rotta(trovato[1]);
    }

    // Un indirizzo del sito che non sappiamo tradurre: si va a casa, non su
    // «Pagina non trovata». L'app rivendica solo gli inviti, quindi qui ci si
    // arriva per un collegamento vecchio o storpiato — e in quel caso aprire
    // l'app su un errore fa sembrare rotta l'app invece del collegamento.
    if (/^\/(?:[a-z]{2}\/)?app\//.test(percorso)) return '/';

    // Tutto il resto passa intatto: sono i percorsi dello schema privato, che
    // sono già rotte dell'app. Il ripiego copre l'indirizzo vuoto, che
    // tornando così com'è sarebbe una stringa falsa — per expo-router
    // «non navigare», che qui vorrebbe dire aprire l'app e non muoversi.
    return path || '/';
  } catch {
    return '/';
  }
}
