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

  /**
   * Segreto con cui il fornitore di identità firma sessioni e token.
   * Cambiarlo invalida tutte le sessioni in corso: è il modo per revocarle
   * tutte insieme se il segreto trapela.
   */
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET deve essere lungo almeno 32 caratteri'),
  /** Indirizzo pubblico dell'API: entra nella firma dei token. */
  BETTER_AUTH_URL: z.url().default('http://localhost:3600'),

  /**
   * Come esce il codice OTP.
   *
   * `sviluppo` lo scrive nei log e non manda niente: serve a lavorare senza un
   * fornitore email, e in produzione è vietato (vedi il controllo qui sotto).
   * Il fornitore reale è ancora una decisione aperta — lo spike Brevo/Resend
   * del piano — quindi il valore che lo sceglierà non esiste ancora.
   */
  CANALE_EMAIL: z.enum(['sviluppo']).default('sviluppo'),

  /**
   * Cartella dove l'archivio locale scrive i file.
   *
   * Esiste finché il fornitore di archiviazione non è scelto: è l'unica
   * variabile che rivela quale adattatore è in uso, e sparirà con lui.
   */
  ARCHIVIO_LOCALE_PERCORSO: z.string().default('./.archivio'),

  /**
   * Origini dei client, separate da virgola.
   *
   * È un elenco esplicito e non un carattere jolly: il token di sessione
   * viaggia in un'intestazione, e aprire a qualunque origine significherebbe
   * lasciare che un sito qualsiasi lo usi dal browser di chi l'ha ottenuto.
   */
  ORIGINI_CONSENTITE: z
    .string()
    .default('http://localhost:3500')
    .transform((valore) => valore.split(',').map((o) => o.trim()).filter(Boolean)),
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

/**
 * Un codice OTP scritto nei log è un codice regalato a chiunque legga i log.
 * In sviluppo è comodo; in produzione è un modo per entrare negli account
 * altrui, quindi l'avvio si ferma qui invece che scoprirlo dopo.
 */
if (esito.data.NODE_ENV === 'production' && esito.data.CANALE_EMAIL === 'sviluppo') {
  console.error('[prome-api] CANALE_EMAIL=sviluppo scrive i codici OTP nei log: vietato in produzione.');
  process.exit(1);
}

/** Ambiente validato e tipizzato, unico punto d'accesso alle variabili. */
export const env: Env = esito.data;
