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
