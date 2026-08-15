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
  CANALE_EMAIL: z.enum(['sviluppo', 'smtp']).default('sviluppo'),

  /**
   * Dove arrivano le email di segnalazione dei contenuti. Dev'essere una
   * casella letta davvero: le linee guida promettono una risposta entro 24
   * ore, e una segnalazione che non arriva a nessuno è una promessa falsa.
   */
  EMAIL_SUPPORTO: z.email().optional(),

  /**
   * Credenziali SMTP. Servono solo con `CANALE_EMAIL=smtp`, e in quel caso
   * sono obbligatorie: il controllo sta più in basso, perché zod da solo non
   * sa dire "obbligatorio se un'altra variabile vale così".
   *
   * Valgono per qualunque fornitore — Brevo, Resend, altri: è il motivo per
   * cui l'adattatore è uno solo e lo spike non blocca la messa in esercizio.
   */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_UTENTE: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** Mittente visibile, es. "Prome <accesso@prome.app>". */
  SMTP_MITTENTE: z.string().optional(),

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

  /**
   * Dove vive il sito, per i collegamenti che finiscono nelle email.
   *
   * Un invito porta chi lo riceve dentro l'applicazione, non dentro l'API: il
   * suo indirizzo è quello del web, ed è l'unico punto in cui il server deve
   * sapere dove il client è pubblicato.
   */
  URL_APP_WEB: z.url().default('http://localhost:3500'),

  /**
   * Quale trasporto in tempo reale usare.
   *
   * `assente` non è un ripiego: è la degradazione dichiarata resa eseguibile —
   * l'aula continua a funzionare in tutto ciò che non è tempo reale, e i
   * messaggi restano persistiti e leggibili. È anche il valore dei test.
   */
  TRASPORTO_TEMPO_REALE: z.enum(['socket-io', 'assente']).default('socket-io'),
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

/**
 * Una segnalazione che non arriva a nessuno ringrazia lo stesso chi l'ha
 * fatta: l'endpoint c'è comunque, e senza una casella dietro la promessa di
 * risposta è falsa dal primo giorno. Meglio non partire.
 */
if (esito.data.NODE_ENV === 'production' && !esito.data.EMAIL_SUPPORTO) {
  console.error('[prome-api] EMAIL_SUPPORTO mancante: le segnalazioni non avrebbero una casella.');
  process.exit(1);
}

/**
 * Scegliere SMTP senza darne le credenziali significa un'applicazione che
 * parte, accetta richieste di accesso e non manda niente: l'utente aspetta un
 * codice che non arriverà mai. Meglio non partire.
 */
if (esito.data.CANALE_EMAIL === 'smtp') {
  const mancanti = (['SMTP_HOST', 'SMTP_UTENTE', 'SMTP_PASSWORD', 'SMTP_MITTENTE'] as const).filter(
    (nome) => !esito.data[nome],
  );
  if (mancanti.length) {
    console.error(`[prome-api] CANALE_EMAIL=smtp richiede: ${mancanti.join(', ')}`);
    process.exit(1);
  }
}

/** Ambiente validato e tipizzato, unico punto d'accesso alle variabili. */
export const env: Env = esito.data;
