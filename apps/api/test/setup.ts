import 'reflect-metadata';

// I test dell'infrastruttura non toccano il database, ma la validazione
// fail-fast dell'ambiente (config/env.ts) richiede comunque DATABASE_URL.
process.env.DATABASE_URL ??= 'postgresql://prome:prome@localhost:5432/prome';
process.env.NODE_ENV = 'test';
process.env.APP_ROLE ??= 'app';
