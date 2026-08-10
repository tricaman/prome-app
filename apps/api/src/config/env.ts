import * as path from 'node:path';
import { config as caricaDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Validazione dell'ambiente con zod — requisito E0.7 (fail-fast):
 * se manca una variabile obbligatoria il processo termina SUBITO all'avvio,
 * elencando cosa manca, invece di fallire più tardi a runtime.
 *
 * Il file .env vive alla ROOT del monorepo; in sviluppo il cwd è apps/api,
 * quindi proviamo prima ../../.env e poi un eventuale .env locale.
 * dotenv non sovrascrive variabili già presenti nel processo, perciò in
 * produzione (Docker) vincono sempre le variabili d'ambiente reali.
 */
const percorsiEnv = [
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const percorso of percorsiEnv) {
  caricaDotenv({ path: percorso });
}

const SchemaEnv = z.object({
  /** Stringa di connessione Postgres (obbligatoria). */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL non può essere vuota'),
  /** Ruolo dell'unità di esecuzione: "app" (HTTP) | "worker" (meccanismi ricorrenti). */
  APP_ROLE: z.enum(['app', 'worker']).default('app'),
  /** Porta del server HTTP (usata solo con APP_ROLE=app). */
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof SchemaEnv>;

const esito = SchemaEnv.safeParse(process.env);

if (!esito.success) {
  // Fail-fast: elenchiamo le variabili mancanti o non valide e usciamo.
  console.error('[prome-api] Configurazione ambiente non valida — avvio interrotto (E0.7).');
  console.error('[prome-api] Variabili mancanti o non valide:');
  for (const problema of esito.error.issues) {
    const nome = problema.path.join('.') || '(root)';
    console.error(`  - ${nome}: ${problema.message}`);
  }
  console.error(`[prome-api] Suggerimento: copia .env.example in .env alla root del monorepo.`);
  process.exit(1);
}

/** Ambiente validato e tipizzato, unico punto d'accesso alle variabili. */
export const env: Env = esito.data;
