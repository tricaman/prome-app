import 'reflect-metadata';

/**
 * Ambiente dei test.
 *
 * Da quando esiste l'accesso, la suite parla con un database vero: il percorso
 * di ingresso è un'area a difetti invisibili, e provarlo contro un doppio
 * significherebbe provare il doppio. Prima di `pnpm test` serve quindi
 * `pnpm db:up` (o un Postgres raggiungibile su DATABASE_URL).
 */
process.env.DATABASE_URL ??= 'postgresql://prome:prome@localhost:6400/prome';
process.env.NODE_ENV = 'test';
process.env.APP_ROLE ??= 'app';

// Segreto finto ma della lunghezza vera: la validazione dell'ambiente la
// controlla, e un test non deve poter passare con una configurazione che in
// produzione non partirebbe.
process.env.BETTER_AUTH_SECRET ??= 'segreto-di-prova-lungo-abbastanza-per-i-test';
process.env.CANALE_EMAIL ??= 'sviluppo';

// Il trasporto in tempo reale resta spento nei test: è la degradazione
// dichiarata dell'aula, e provarla col fornitore acceso non direbbe nulla
// sul giorno in cui quel fornitore cade.
process.env.TRASPORTO_TEMPO_REALE ??= 'assente';

// Il supporto delle segnalazioni: un indirizzo qualunque, l'adattatore di
// sviluppo non manda niente e i test guardano ciò che sarebbe partito.
process.env.EMAIL_SUPPORTO ??= 'supporto@prome.test';

// Coordinate finte per provare l'adattatore LiveKit **in isolamento**: conia
// un gettone e si guarda cosa contiene, senza collegarsi a niente.
//
// `AUDIOCHAT` resta al suo valore predefinito (`assente`), quindi l'API
// continua a girare senza audio: è la degradazione dichiarata, ed è ciò che i
// test dell'endpoint devono vedere.
process.env.LIVEKIT_URL ??= 'wss://audio.di-prova.invalid';
process.env.LIVEKIT_API_KEY ??= 'chiave-di-prova';
process.env.LIVEKIT_API_SECRET ??= 'segreto-di-prova-lungo-abbastanza-per-firmare';
