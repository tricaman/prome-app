import type { Prisma, PrismaClient } from '@prisma/client';
import { CATALOGO, type CatalogoDaSeminare } from './dati/catalogo';

/**
 * Porta il catalogo del repo dentro il database.
 *
 * **Idempotente per chiave naturale** — `slug` per l'ateneo, `codice` per la
 * classe, la coppia `(ateneo, codice)` per il corso — perché gira a ogni
 * rilascio e nei test, che condividono un database solo: un secondo giro non
 * deve produrre righe nuove né cambiare gli identificativi, che nel frattempo
 * sono finiti nei profili delle persone.
 *
 * **Non cancella mai nulla.** Un corso tolto dal file non sparisce dal
 * database: potrebbe avere iscritti, e la loro identità accademica non è
 * revocabile con una modifica a un file. Per ritirarlo si usa `attivo` — non
 * si sceglie più, chi c'è resta.
 */

export interface EsitoSemina {
  universita: number;
  classi: number;
  corsi: number;
  /** Corsi il cui codice non è ancora stato verificato sul catalogo dell'ateneo. */
  codiciDaVerificare: number;
}

/**
 * La chiave del lock consultivo. Un numero qualunque, ma **fisso e scritto una
 * volta sola**: due semine che ne usassero due diversi non si vedrebbero.
 */
const CHIAVE_SEMINA = 8_142_026n;

export async function seminaCatalogo(
  prisma: PrismaClient,
  catalogo: CatalogoDaSeminare = CATALOGO,
): Promise<EsitoSemina> {
  // Prima le classi: i corsi le riferiscono, e una classe citata ma non
  // dichiarata è un errore del file, non del database. Meglio scoprirlo qui,
  // con il nome della classe in mano, che da un vincolo violato a metà semina.
  //
  // Questo controllo legge il file e non tocca il database: sta fuori dalla
  // transazione, perché un file incoerente non deve nemmeno prendere il lock.
  const classiDichiarate = new Set(catalogo.classi.map((classe) => classe.codice));
  for (const universita of catalogo.universita) {
    for (const corso of universita.corsi) {
      if (!classiDichiarate.has(corso.classeCodice)) {
        throw new Error(
          `Catalogo incoerente: il corso "${corso.nome}" (${universita.nome}) cita la classe ` +
            `"${corso.classeCodice}", che non è dichiarata fra le classi.`,
        );
      }
    }
  }

  // **Una semina per volta**, e il motivo è più sottile di «due upsert insieme».
  //
  // L'upsert di Prisma compila in `INSERT … ON CONFLICT ("slug") DO UPDATE`,
  // che di suo sarebbe atomico. Ma `universita` ha **due** indici unici —
  // `slug` e `nome` — e `ON CONFLICT` ne nomina uno solo: due inserimenti
  // simultanei della stessa riga li violano entrambi, e quando Postgres
  // incontra per primo quello sul `nome` l'errore esce **fuori** dalla clausola
  // che avrebbe dovuto assorbirlo. Da qui il «Unique constraint failed on the
  // fields: (`nome`)» che ha reso rossa la pipeline, dove Jest gira le suite in
  // parallelo su un database solo e ognuna semina il proprio catalogo.
  //
  // Elencare più indici in `ON CONFLICT` non si può, e riscrivere le chiavi
  // naturali per averne uno solo cambierebbe il modello per un problema di
  // concorrenza. Un lock consultivo è la risposta più piccola: non tocca alcuna
  // tabella, non lascia righe, e vale per **tutte** le chiavi insieme invece di
  // una gestione dell'errore per ognuna. `xact` lo lega alla transazione,
  // quindi si rilascia da sé anche se qualcosa esplode a metà — un lock di
  // sessione, con un pool di connessioni, potrebbe non essere mai rilasciato.
  return prisma.$transaction(async (tx) => seminaDentroIlLock(tx, catalogo), {
    timeout: 30_000,
  });
}

async function seminaDentroIlLock(
  tx: Prisma.TransactionClient,
  catalogo: CatalogoDaSeminare,
): Promise<EsitoSemina> {
  // `$executeRaw` e non `$queryRaw`: la funzione ritorna `void`, e il client
  // proverebbe a deserializzare una colonna di quel tipo fallendo con P2010.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHIAVE_SEMINA})`;

  for (const classe of catalogo.classi) {
    await tx.classeDiCorso.upsert({
      where: { codice: classe.codice },
      update: { nome: classe.nome, livello: classe.livello },
      create: classe,
    });
  }

  let corsiSeminati = 0;
  let codiciDaVerificare = 0;

  for (const universita of catalogo.universita) {
    const { corsi, ...anagrafica } = universita;
    const riga = await tx.universita.upsert({
      where: { slug: anagrafica.slug },
      update: anagrafica,
      create: anagrafica,
    });

    for (const corso of corsi) {
      await tx.corso.upsert({
        where: { universitaId_codice: { universitaId: riga.id, codice: corso.codice } },
        update: {
          nome: corso.nome,
          classeCodice: corso.classeCodice,
          durataAnni: corso.durataAnni,
          // Un corso che torna nel file torna scegliibile: la semina descrive
          // lo stato voluto, non applica una differenza.
          attivo: true,
        },
        create: {
          universitaId: riga.id,
          codice: corso.codice,
          nome: corso.nome,
          classeCodice: corso.classeCodice,
          durataAnni: corso.durataAnni,
        },
      });
      corsiSeminati += 1;
      if (corso.daVerificare) codiciDaVerificare += 1;
    }
  }

  return {
    universita: catalogo.universita.length,
    classi: catalogo.classi.length,
    corsi: corsiSeminati,
    codiciDaVerificare,
  };
}
