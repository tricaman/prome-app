import { Injectable } from '@nestjs/common';
import type { CorsoResponse, PaginatedResult, UniversitaResponse } from '@prome/contracts';
import { PrismaService } from '../../../database/prisma.service';

/** La forma con cui il corso esce dal database quando serve intero. */
const CON_ATENEO_E_CLASSE = { universita: true, classe: true } as const;

/**
 * Il catalogo accademico in lettura.
 *
 * Sta dentro Profilo perché Università e Corso universitario sono **dati del
 * Profilo** (glossario del domain model), non un contesto nuovo: un contesto a
 * parte sarebbe una modifica della Context Map, e in cambio perderebbe le
 * foreign key che qui impediscono a un profilo di puntare a un corso che non
 * esiste.
 *
 * **Solo letture.** Il catalogo si scrive da un posto solo — la semina, che
 * legge il file versionato nel repo — e non esiste un endpoint che lo modifichi:
 * un corso creato da una richiesta HTTP non comparirebbe in alcuna diff e
 * sparirebbe al primo ripristino del database.
 */
@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gli atenei, in ordine alfabetico, con la ricerca per nome.
   *
   * La ricerca è su nome **e nome breve**: chi cerca «polimi» o «unibo» sta
   * cercando il proprio ateneo con il nome che usa davvero, e un elenco che
   * gli risponde «nessun risultato» è un onboarding che si interrompe.
   */
  async elencaUniversita(pagina: {
    page: number;
    limit: number;
    ricerca?: string;
  }): Promise<PaginatedResult<UniversitaResponse>> {
    const termine = pagina.ricerca?.trim();
    const dove = termine
      ? {
          OR: [
            { nome: { contains: termine, mode: 'insensitive' as const } },
            { nomeBreve: { contains: termine, mode: 'insensitive' as const } },
            { citta: { contains: termine, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [righe, totale] = await Promise.all([
      this.prisma.universita.findMany({
        where: dove,
        orderBy: { nome: 'asc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
      }),
      this.prisma.universita.count({ where: dove }),
    ]);

    return {
      data: righe.map((riga) => perIlClientUniversita(riga)),
      meta: paginazione(totale, pagina),
    };
  }

  /**
   * I corsi **attivi** di un ateneo.
   *
   * I disattivati non compaiono e non sono scegliibili, ma restano nel
   * database e nei profili di chi li ha scelti: si governa il presente, non si
   * riscrive il passato — la stessa regola dei materiali di un'aula quando il
   * permesso di caricare viene revocato.
   */
  async corsiDiUniversita(
    universitaId: string,
    pagina: { page: number; limit: number; ricerca?: string },
  ): Promise<PaginatedResult<CorsoResponse>> {
    const termine = pagina.ricerca?.trim();
    const dove = {
      universitaId,
      attivo: true,
      ...(termine
        ? {
            OR: [
              { nome: { contains: termine, mode: 'insensitive' as const } },
              { classeCodice: { contains: termine, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [righe, totale] = await Promise.all([
      this.prisma.corso.findMany({
        where: dove,
        include: CON_ATENEO_E_CLASSE,
        orderBy: { nome: 'asc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
      }),
      this.prisma.corso.count({ where: dove }),
    ]);

    return {
      data: righe.map((riga) => perIlClientCorso(riga)),
      meta: paginazione(totale, pagina),
    };
  }

  /**
   * Un corso per identificativo, con ateneo e classe.
   *
   * Ritorna `null` quando non c'è: chi chiama decide se è un errore. Per
   * l'onboarding lo è (il catalogo è chiuso, e un corso inesistente non si
   * sceglie); per una lettura di comodo non sempre.
   */
  async corso(id: string): Promise<(CorsoResponse & { attivo: boolean }) | null> {
    const riga = await this.prisma.corso.findUnique({
      where: { id },
      include: CON_ATENEO_E_CLASSE,
    });
    return riga ? { ...perIlClientCorso(riga), attivo: riga.attivo } : null;
  }

  /**
   * I nomi di più atenei in un colpo solo.
   *
   * Serve a chi conserva un `ateneoId` congelato — aule studio e gruppi — e
   * deve mostrarne il nome: senza, sarebbe una query per riga di ogni elenco.
   * Un id che non corrisponde a nulla semplicemente non entra nella mappa.
   */
  async nomiDiAtenei(ids: readonly string[]): Promise<Map<string, string>> {
    const distinti = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!distinti.length) return new Map();

    const righe = await this.prisma.universita.findMany({
      where: { id: { in: distinti } },
      select: { id: true, nome: true },
    });
    return new Map(righe.map((riga) => [riga.id, riga.nome]));
  }
}

const paginazione = (totale: number, pagina: { page: number; limit: number }) => ({
  total: totale,
  page: pagina.page,
  limit: pagina.limit,
  totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
});

export function perIlClientUniversita(riga: {
  id: string;
  slug: string;
  nome: string;
  nomeBreve: string;
  citta: string;
}): UniversitaResponse {
  return {
    id: riga.id,
    slug: riga.slug,
    nome: riga.nome,
    nomeBreve: riga.nomeBreve,
    citta: riga.citta,
  };
}

export function perIlClientCorso(riga: {
  id: string;
  codice: string;
  nome: string;
  durataAnni: number;
  classe: { codice: string; nome: string; livello: string };
  universita: { id: string; slug: string; nome: string; nomeBreve: string; citta: string };
}): CorsoResponse {
  return {
    id: riga.id,
    codice: riga.codice,
    nome: riga.nome,
    durataAnni: riga.durataAnni,
    classe: {
      codice: riga.classe.codice,
      nome: riga.classe.nome,
      livello: riga.classe.livello as CorsoResponse['classe']['livello'],
    },
    universita: perIlClientUniversita(riga.universita),
  };
}
