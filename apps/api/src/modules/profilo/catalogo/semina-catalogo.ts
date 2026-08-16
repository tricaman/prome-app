import type { PrismaClient } from '@prisma/client';
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

export async function seminaCatalogo(
  prisma: PrismaClient,
  catalogo: CatalogoDaSeminare = CATALOGO,
): Promise<EsitoSemina> {
  // Prima le classi: i corsi le riferiscono, e una classe citata ma non
  // dichiarata è un errore del file, non del database. Meglio scoprirlo qui,
  // con il nome della classe in mano, che da un vincolo violato a metà semina.
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

  for (const classe of catalogo.classi) {
    await prisma.classeDiCorso.upsert({
      where: { codice: classe.codice },
      update: { nome: classe.nome, livello: classe.livello },
      create: classe,
    });
  }

  let corsiSeminati = 0;
  let codiciDaVerificare = 0;

  for (const universita of catalogo.universita) {
    const { corsi, ...anagrafica } = universita;
    const riga = await prisma.universita.upsert({
      where: { slug: anagrafica.slug },
      update: anagrafica,
      create: anagrafica,
    });

    for (const corso of corsi) {
      await prisma.corso.upsert({
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
