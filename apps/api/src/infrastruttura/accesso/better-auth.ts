import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { emailOTP } from 'better-auth/plugins/email-otp';
import type { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import type { CanaleEmail } from '../avvisi-in-uscita/canale-email';

/** Quanto vale un codice prima di scadere. */
export const DURATA_CODICE_SECONDI = 10 * 60;
/** Quante cifre ha il codice che arriva per email. */
export const LUNGHEZZA_CODICE = 6;
/** Quanti tentativi sbagliati prima che il codice venga bruciato. */
export const TENTATIVI_CONSENTITI = 3;
/**
 * Quanto dura una sessione senza essere usata.
 *
 * È esportata perché la risposta all'ingresso deve dichiarare la stessa
 * scadenza che il fornitore applica davvero: scritta due volte, prima o poi
 * una delle due cambia e il client crede di avere una sessione che non ha più.
 */
export const DURATA_SESSIONE_SECONDI = 30 * 24 * 60 * 60;

export type FornitoreIdentita = ReturnType<typeof creaFornitoreIdentita>;

/**
 * Il fornitore di identità, configurato per l'unico modo di entrare che
 * Prome ha: email e codice.
 *
 * **Le sue rotte HTTP non vengono montate.** Gli endpoint sono richiamati come
 * funzioni (`auth.api.signInEmailOTP(...)`) dai controller della facciata, così
 * ingresso e uscita restano quelli del contratto: una sola envelope, un solo
 * formato d'errore, messaggi tradotti nella lingua della richiesta. Montare le
 * sue rotte avrebbe introdotto una seconda forma di risposta nella stessa API.
 *
 * Il fornitore conosce account, sessioni e codici; il dominio no. L'unico
 * punto in cui i due mondi si toccano è PortaIdentitàUtente.
 */
export function creaFornitoreIdentita(prisma: PrismaClient, canaleEmail: CanaleEmail) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),

    // Nessuna password: l'unica credenziale è il codice che arriva per email.
    emailAndPassword: { enabled: false },

    session: {
      expiresIn: DURATA_SESSIONE_SECONDI,
      // Ogni giorno di utilizzo sposta in avanti la scadenza: chi usa Prome
      // ogni settimana non si ritrova mai buttato fuori.
      updateAge: 24 * 60 * 60,
    },

    // I client sono un sito su un'altra origine e un'app nativa: il token
    // viaggia in Authorization, non in un cookie che l'app non ha.
    plugins: [
      bearer(),
      emailOTP({
        otpLength: LUNGHEZZA_CODICE,
        expiresIn: DURATA_CODICE_SECONDI,
        allowedAttempts: TENTATIVI_CONSENTITI,
        // Il codice è conservato con hash: chi legge la tabella non può usarlo.
        storeOTP: 'hashed',
        // Verificare un codice è anche il modo per iscriversi: non esiste una
        // registrazione separata da abilitare.
        disableSignUp: false,
        async sendVerificationOTP({ email, otp }) {
          await canaleEmail.inviaCodiceAccesso(email, otp, 'it');
        },
      }),
    ],
  });
}
