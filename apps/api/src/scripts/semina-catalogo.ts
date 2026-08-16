import { PrismaClient } from '@prisma/client';
import { seminaCatalogo } from '../modules/profilo/catalogo/semina-catalogo';

/**
 * Porta il catalogo accademico del repo dentro il database.
 *
 * Gira **a ogni rilascio, subito dopo le migration** (`deploy/rilascia.sh`):
 * con un catalogo chiuso, un database senza catalogo è un onboarding che non
 * si può completare — e sarebbe un guasto invisibile in sviluppo, dove il
 * catalogo c'è da sempre.
 *
 * È idempotente: si può lanciare quante volte si vuole.
 * `pnpm --filter @prome/api catalogo:semina`
 */
async function semina(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const esito = await seminaCatalogo(prisma);
    console.log(
      `Catalogo seminato: ${esito.universita} atenei, ${esito.classi} classi, ${esito.corsi} corsi.`,
    );
    if (esito.codiciDaVerificare > 0) {
      // Non è un errore e non ferma niente: è l'unico posto in cui quel numero
      // si vede. Un codice inventato che nessuno dichiara tale è
      // indistinguibile da uno vero.
      console.warn(
        `${esito.codiciDaVerificare} corsi hanno un codice ancora da verificare sul catalogo ` +
          'dell\'ateneo (marcati `daVerificare` in modules/profilo/catalogo/dati/catalogo.ts).',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void semina();
