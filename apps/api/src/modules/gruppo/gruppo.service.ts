import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreaGruppoRequest,
  DettaglioGruppoResponse,
  GruppoResponse,
  InvitoAlGruppoResponse,
  MembroResponse,
  ModificaGruppoRequest,
  PaginatedResult,
  PaginationParams,
} from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions';
import { CANALE_EMAIL, type CanaleEmail } from '../../infrastruttura/avvisi-in-uscita/canale-email';
import { env } from '../../config/env';
import { AvvisiService } from '../avvisi/avvisi.service';
import { ProfiloService } from '../profilo/profilo.service';
import { CatalogoService } from '../profilo/catalogo/catalogo.service';
import { PortaIdentitaUtente } from '../profilo/porta-identita-utente';
import { GruppoErrorCode } from './constants/error-codes';
import {
  costruisciGruppo,
  puoVedere,
  verificaNome,
  verificaNonSiaLUltimoModeratore,
} from './dominio/gruppo';
import {
  GRUPPO_ELIMINATO,
  INVITO_AL_GRUPPO_ACCETTATO,
  MEMBRO_RIMOSSO,
  RecapitoFattiDelGruppoService,
  type ConsumatoreDiFattiDelGruppo,
  type PayloadGruppoEliminato,
  type PayloadInvitoAlGruppoAccettato,
  type PayloadMembroRimosso,
} from './recapito-fatti.service';

/** Un invito vale sette giorni dall'emissione, come quello dell'aula. */
const GIORNI_VALIDITA_INVITO = 7;

/**
 * Bounded context GRUPPO — lo spazio che resta nel tempo.
 *
 * Possiede due aggregati: il Gruppo, con l'insieme dei suoi Membri come entità
 * interne, e l'InvitoAlGruppo. Importa Profilo (upstream condiviso) per la
 * prova di onboarding, per l'università su cui si congela l'ateneo e per i
 * nomi da mostrare.
 *
 * **Non conosce le aule studio.** Non le elenca, non le legge, non decide
 * niente su di loro: quando il gruppo cambia, pubblica un fatto e chi ha
 * collocato un'aula lì dentro ne trae le conseguenze. È il motivo per cui
 * eliminare un gruppo non elimina alcuna aula — il gruppo non saprebbe
 * nemmeno quali sono.
 *
 * Ciò che manca qui manca di proposito: nessun feed, nessuna chat, nessuna
 * notifica propria. Il gruppo è un contenitore di persone.
 */
@Injectable()
export class GruppoService implements ConsumatoreDiFattiDelGruppo {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilo: ProfiloService,
    private readonly catalogo: CatalogoService,
    private readonly identita: PortaIdentitaUtente,
    private readonly recapito: RecapitoFattiDelGruppoService,
    @Inject(CANALE_EMAIL) private readonly email: CanaleEmail,
    private readonly avvisi: AvvisiService,
  ) {
    this.recapito.registra(this);
  }

  // --- Comandi sul gruppo ---------------------------------------------------

  /**
   * G4: chi crea è membro moderatore **nella stessa scrittura**.
   *
   * Fra le due non deve esistere un istante in cui il gruppo c'è e nessuno può
   * amministrarlo: in quell'istante il gruppo sarebbe già abbandonato.
   */
  async crea(utenteId: string, dati: CreaGruppoRequest): Promise<GruppoResponse> {
    // La prova di onboarding è esibita, non verificata qui: chi non l'ha non
    // crea gruppi, come non pubblica post.
    await this.profilo.provaDiOnboarding(utenteId);
    const chiSono = await this.profilo.perUtente(utenteId);

    const nascita = costruisciGruppo({
      nome: dati.nome,
      visibilita: dati.visibilita,
      universitaIdDelCreatore: chiSono.universita?.id ?? null,
    });

    const gruppo = await this.prisma.gruppo.create({
      data: {
        ...nascita,
        creatoDa: utenteId,
        membri: { create: { utenteId, moderatore: true } },
      },
      include: { membri: true },
    });

    return this.gruppoPerIlClient(
      gruppo,
      gruppo.membri,
      utenteId,
      await this.nomiDegliAtenei([gruppo]),
    );
  }

  /** I gruppi di cui si fa parte. Gli altri non compaiono, nemmeno i pubblici. */
  async elenca(
    utenteId: string,
    query: PaginationParams,
  ): Promise<PaginatedResult<GruppoResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [gruppi, total] = await Promise.all([
      this.prisma.gruppo.findMany({
        where: { membri: { some: { utenteId } } },
        orderBy: { creatoIl: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { membri: true },
      }),
      this.prisma.gruppo.count({ where: { membri: { some: { utenteId } } } }),
    ]);

    // I nomi degli atenei in una domanda sola per l'intera pagina, come i
    // profili dei membri.
    const nomiAtenei = await this.nomiDegliAtenei(gruppi);

    return {
      data: gruppi.map((g) => this.gruppoPerIlClient(g, g.membri, utenteId, nomiAtenei)),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /** Il gruppo e il suo insieme di membri, in una risposta sola. */
  async dettaglio(utenteId: string, gruppoId: string): Promise<DettaglioGruppoResponse> {
    const gruppo = await this.gruppoVisibileA(utenteId, gruppoId);

    const [profili, nomiAtenei] = await Promise.all([
      this.profilo.perUtenti(gruppo.membri.map((m) => m.utenteId)),
      this.nomiDegliAtenei([gruppo]),
    ]);

    return {
      gruppo: this.gruppoPerIlClient(gruppo, gruppo.membri, utenteId, nomiAtenei),
      membri: gruppo.membri
        .slice()
        .sort((a, b) => a.entratoIl.getTime() - b.entratoIl.getTime())
        .map((membro) => {
          const profilo = profili.get(membro.utenteId);
          return {
            utenteId: membro.utenteId,
            nome: profilo?.nome ?? null,
            cognome: profilo?.cognome ?? null,
            universita: profilo?.universita?.nome ?? null,
            ...(profilo ? {} : { rimosso: true }),
            moderatore: membro.moderatore,
            entratoIl: membro.entratoIl.toISOString(),
          } satisfies MembroResponse;
        }),
    };
  }

  async modifica(
    utenteId: string,
    gruppoId: string,
    dati: ModificaGruppoRequest,
  ): Promise<GruppoResponse> {
    await this.esigiModeratore(utenteId, gruppoId);
    const nome = dati.nome === undefined ? undefined : verificaNome(dati.nome);

    // L'ateneo non compare: è congelato alla creazione (G5). Cambiare la
    // visibilità in ATENEO su un gruppo nato PRIVATO lo lascia senza ateneo, e
    // quindi visibile a nessuno oltre ai membri — che è il comportamento più
    // chiuso, cioè quello giusto quando manca un dato.
    const aggiornato = await this.prisma.gruppo.update({
      where: { id: gruppoId },
      data: {
        ...(nome ? { nome } : {}),
        ...(dati.visibilita ? { visibilita: dati.visibilita } : {}),
      },
      include: { membri: true },
    });

    return this.gruppoPerIlClient(
      aggiornato,
      aggiornato.membri,
      utenteId,
      await this.nomiDegliAtenei([aggiornato]),
    );
  }

  /**
   * Eliminare il gruppo **non elimina alcuna aula**.
   *
   * Le aule collocate tornano sciolte, in differita e per fatto: il gruppo non
   * sa quali sono — non conosce le aule — e il contesto che le possiede reagirà
   * scollegandole. È lo stesso principio per cui eliminare un argomento non
   * cancella i materiali: si organizza un riferimento, e cancellare un
   * riferimento non cancella mai la cosa riferita.
   */
  async elimina(utenteId: string, gruppoId: string): Promise<void> {
    await this.esigiModeratore(utenteId, gruppoId);

    await this.prisma.$transaction(async (tx) => {
      await tx.gruppo.delete({ where: { id: gruppoId } });
      await this.recapito.pubblica(tx, {
        tipo: GRUPPO_ELIMINATO,
        aggregatoId: gruppoId,
        payload: { gruppoId } satisfies PayloadGruppoEliminato as unknown as Prisma.InputJsonValue,
      });
    });
  }

  // --- L'insieme dei membri (G2, G3) ----------------------------------------

  /**
   * Uscita volontaria o rimozione da parte di un moderatore.
   *
   * Pubblica **sempre** il fatto della decadenza, anche quando chi esce non era
   * dentro alcuna aula: chi consuma quel fatto sa dire se c'è qualcosa da fare,
   * e il gruppo non deve saperlo — non conosce le aule.
   */
  async rimuoviMembro(richiedenteId: string, gruppoId: string, utenteId: string): Promise<void> {
    const seStesso = richiedenteId === utenteId;
    if (!seStesso) await this.esigiModeratore(richiedenteId, gruppoId);
    else await this.esigiMembro(richiedenteId, gruppoId);

    const gruppo = await this.gruppoConMembri(gruppoId);
    const bersaglio = gruppo.membri.find((m) => m.utenteId === utenteId);
    if (!bersaglio) {
      throw new AppException(
        GruppoErrorCode.MEMBRO_NOT_FOUND,
        'GRUPPO_MEMBRO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    verificaNonSiaLUltimoModeratore(gruppo.membri, utenteId);

    await this.conBloccoDiVersione(gruppo, async (tx) => {
      await tx.membro.delete({ where: { gruppoId_utenteId: { gruppoId, utenteId } } });
      await this.recapito.pubblica(tx, {
        tipo: MEMBRO_RIMOSSO,
        aggregatoId: gruppoId,
        payload: {
          gruppoId,
          utenteId,
        } satisfies PayloadMembroRimosso as unknown as Prisma.InputJsonValue,
      });
    });
  }

  async promuovi(richiedenteId: string, gruppoId: string, utenteId: string): Promise<void> {
    await this.esigiModeratore(richiedenteId, gruppoId);
    const gruppo = await this.gruppoConMembri(gruppoId);
    this.esigiBersaglio(gruppo.membri, utenteId);

    await this.conBloccoDiVersione(gruppo, (tx) =>
      tx.membro.update({
        where: { gruppoId_utenteId: { gruppoId, utenteId } },
        data: { moderatore: true },
      }),
    );
  }

  /**
   * Retrocedere è il gesto che G2 protegge: qui si verifica sull'insieme già
   * letto, e la gara fra due retrocessioni concorrenti la respinge il blocco
   * ottimistico — ciascuno dei due, da solo, vede una situazione lecita.
   */
  async retrocedi(richiedenteId: string, gruppoId: string, utenteId: string): Promise<void> {
    await this.esigiModeratore(richiedenteId, gruppoId);
    const gruppo = await this.gruppoConMembri(gruppoId);
    this.esigiBersaglio(gruppo.membri, utenteId);
    verificaNonSiaLUltimoModeratore(gruppo.membri, utenteId);

    await this.conBloccoDiVersione(gruppo, (tx) =>
      tx.membro.update({
        where: { gruppoId_utenteId: { gruppoId, utenteId } },
        data: { moderatore: false },
      }),
    );
  }

  // --- Inviti (IG1, IG2, IG3) -----------------------------------------------

  async invita(
    utenteId: string,
    gruppoId: string,
    destinatario: string,
  ): Promise<InvitoAlGruppoResponse> {
    const gruppo = await this.esigiModeratore(utenteId, gruppoId);
    const chiInvita = await this.profilo.perUtente(utenteId);

    const scadeIl = new Date(Date.now() + GIORNI_VALIDITA_INVITO * 24 * 60 * 60 * 1000);
    const invito = await this.prisma.invitoAlGruppo.create({
      data: {
        gruppoId,
        destinatario: destinatario.trim().toLowerCase(),
        invitatoDa: utenteId,
        scadeIl,
      },
    });

    const nome = [chiInvita.nome, chiInvita.cognome].filter(Boolean).join(' ') || 'Un compagno';
    await this.email.inviaInvitoAlGruppo(
      invito.destinatario,
      {
        nomeGruppo: gruppo.nome,
        invitatoDa: nome,
        collegamento: `${env.URL_APP_WEB}/app/inviti-gruppo/${invito.id}`,
        scadeIl,
      },
      'it',
    );

    await this.avvisi.avvisaIndirizzo(
      invito.destinatario,
      {
        tipo: 'INVITO_GRUPPO',
        risorsaTipo: 'INVITO_GRUPPO',
        risorsaId: invito.id,
        chiaveDeduplicazione: invito.id,
        percorso: `/app/inviti-gruppo/${invito.id}`,
        titolo: 'notifiche.invito.titolo',
        corpo: 'notifiche.invito.corpo',
      },
      utenteId,
    );

    return this.invitoPerIlClient(invito, gruppo.nome, false);
  }

  /**
   * L'accettazione **non crea il membro nella stessa transazione** (IG3):
   * scrive lo stato dell'invito e il fatto, insieme. Il membro compare entro
   * pochi secondi, per mano della corsia rapida — ed è il motivo per cui il
   * controller risponde 202.
   */
  async accetta(utenteId: string, invitoId: string): Promise<InvitoAlGruppoResponse> {
    await this.profilo.provaDiOnboarding(utenteId);

    const invito = await this.invitoEsistente(invitoId);
    await this.esigiDestinatario(utenteId, invito);

    // IG2: dallo stato iniziale si transita una volta sola.
    if (invito.stato !== 'IN_ATTESA') {
      throw new AppException(
        GruppoErrorCode.INVITO_GIA_CHIUSO,
        'GRUPPO_INVITO_GIA_CHIUSO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (invito.scadeIl.getTime() <= Date.now()) {
      throw new AppException(
        GruppoErrorCode.INVITO_SCADUTO,
        'GRUPPO_INVITO_SCADUTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const aggiornato = await this.prisma.$transaction(async (tx) => {
      const scritto = await tx.invitoAlGruppo.update({
        where: { id: invitoId },
        data: { stato: 'ACCETTATO', chiusoIl: new Date(), accettatoDa: utenteId },
      });
      await this.recapito.pubblica(tx, {
        tipo: INVITO_AL_GRUPPO_ACCETTATO,
        aggregatoId: invitoId,
        payload: {
          invitoId,
          gruppoId: invito.gruppoId,
          utenteId,
        } satisfies PayloadInvitoAlGruppoAccettato as unknown as Prisma.InputJsonValue,
      });
      return scritto;
    });

    const gruppo = await this.gruppoEsistente(invito.gruppoId);
    return this.invitoPerIlClient(aggiornato, gruppo.nome, false);
  }

  /**
   * L'altro stato conclusivo di IG2: si risponde di no.
   *
   * Come per l'aula, **senza prova di onboarding** — il rifiuto non produce
   * alcun membro, e pretendere un profilo completo per dire di no vorrebbe
   * dire trattenere dentro Prome chi voleva soltanto uscirne — e **senza
   * fatto pubblicato**: a valle non c'è nessun consumatore. Per questo il
   * controller risponde 200 e non 202: niente è preso in carico.
   */
  async rifiuta(utenteId: string, invitoId: string): Promise<InvitoAlGruppoResponse> {
    const invito = await this.invitoEsistente(invitoId);
    await this.esigiDestinatario(utenteId, invito);

    // IG2: dallo stato iniziale si transita una volta sola. Da un gruppo in cui
    // si è già entrati si esce, non si disdice l'invito.
    if (invito.stato !== 'IN_ATTESA') {
      throw new AppException(
        GruppoErrorCode.INVITO_GIA_CHIUSO,
        'GRUPPO_INVITO_GIA_CHIUSO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (invito.scadeIl.getTime() <= Date.now()) {
      throw new AppException(
        GruppoErrorCode.INVITO_SCADUTO,
        'GRUPPO_INVITO_SCADUTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const aggiornato = await this.prisma.invitoAlGruppo.update({
      where: { id: invitoId },
      data: { stato: 'RIFIUTATO', chiusoIl: new Date() },
    });

    const gruppo = await this.gruppoEsistente(invito.gruppoId);
    return this.invitoPerIlClient(aggiornato, gruppo.nome, false);
  }

  async leggiInvito(utenteId: string, invitoId: string): Promise<InvitoAlGruppoResponse> {
    const invito = await this.invitoEsistente(invitoId);
    const mioIndirizzo = await this.identita.indirizzoDi(utenteId);
    if (mioIndirizzo && mioIndirizzo !== invito.destinatario && invito.invitatoDa !== utenteId) {
      throw new AppException(
        GruppoErrorCode.INVITO_DI_UN_ALTRO,
        'GRUPPO_INVITO_DI_UN_ALTRO',
        HttpStatus.FORBIDDEN,
      );
    }

    const gruppo = await this.gruppoEsistente(invito.gruppoId);
    const membro = invito.accettatoDa
      ? await this.prisma.membro.findUnique({
          where: {
            gruppoId_utenteId: { gruppoId: invito.gruppoId, utenteId: invito.accettatoDa },
          },
        })
      : null;

    return this.invitoPerIlClient(invito, gruppo.nome, Boolean(membro));
  }

  // --- Il contratto pubblicato verso l'aula studio ---------------------------

  /**
   * L'unica domanda che il core dell'aula pone a questo contesto: **un
   * booleano**, su dato fresco (IA4).
   *
   * Non passa il ruolo, non passa l'insieme dei membri, non passa la parola
   * «Membro»: chi la riceve la traduce in titolo di ammissione e nient'altro.
   * È anche la ragione per cui essere moderatore del gruppo non produce alcun
   * permesso dentro un'aula collocata (AS6) — l'informazione non attraversa
   * proprio il confine.
   */
  async eMembro(utenteId: string, gruppoId: string): Promise<boolean> {
    const membro = await this.prisma.membro.findUnique({
      where: { gruppoId_utenteId: { gruppoId, utenteId } },
      select: { utenteId: true },
    });
    return Boolean(membro);
  }

  /**
   * Se due persone fanno parte di uno stesso gruppo, adesso.
   *
   * Serve a chi deve decidere un contatto: «Privato» significa «solo chi è già
   * nei tuoi gruppi o nelle tue aule», e questa è la metà della domanda che il
   * Gruppo sa rispondere. Torna **un booleano**, non l'elenco dei gruppi
   * comuni: quale spazio si condivida è un'informazione che chi chiede non
   * deve ricevere per decidere.
   */
  async condividonoUnGruppo(unoId: string, altroId: string): Promise<boolean> {
    const comune = await this.prisma.membro.findFirst({
      where: {
        utenteId: unoId,
        gruppo: { membri: { some: { utenteId: altroId } } },
      },
      select: { gruppoId: true },
    });
    return Boolean(comune);
  }

  /** Il consumo del proprio fatto: l'invito accettato diventa un membro. */
  async elabora(tipo: string, payload: unknown): Promise<void> {
    if (tipo !== INVITO_AL_GRUPPO_ACCETTATO) return;
    const { gruppoId, utenteId } = payload as PayloadInvitoAlGruppoAccettato;

    // Idempotente per G3: la seconda volta non fa nulla. Il gruppo può essere
    // stato eliminato nel frattempo — un invito accettato a un gruppo che non
    // c'è più non è un errore da ritentare.
    const gruppo = await this.prisma.gruppo.findUnique({ where: { id: gruppoId } });
    if (!gruppo) return;

    await this.prisma.membro.upsert({
      where: { gruppoId_utenteId: { gruppoId, utenteId } },
      update: {},
      create: { gruppoId, utenteId },
    });
  }

  /**
   * Le appartenenze di questa persona, per l'esportazione.
   *
   * Il nome del gruppo c'è perché senza sarebbe un elenco di identificativi
   * illeggibile, e «formato leggibile» è ciò che la privacy policy promette.
   * Gli **altri membri no**: non sono un dato di chi esporta.
   */
  async datiPersonaliDi(utenteId: string) {
    const appartenenze = await this.prisma.membro.findMany({
      where: { utenteId },
      orderBy: { entratoIl: 'asc' },
      include: { gruppo: { select: { id: true, nome: true } } },
    });

    return appartenenze.map((membro) => ({
      id: membro.gruppo.id,
      nome: membro.gruppo.nome,
      moderatore: membro.moderatore,
      entratoIl: membro.entratoIl.toISOString(),
    }));
  }

  // --- Cancellazione dell'account (V5) --------------------------------------

  /**
   * Chi cancella l'account esce da tutti i gruppi.
   *
   * **G2 va onorata anche qui, e non può esserlo nel modo normale**: la via
   * d'uscita dell'ultimo moderatore è promuovere qualcuno, ma qui non c'è più
   * nessuno che possa scegliere. La sceglie il sistema, con il criterio meno
   * arbitrario che ha — il membro più anziano — perché l'alternativa è un
   * gruppo che nessuno può più amministrare: gli altri si troverebbero in uno
   * spazio da cui non possono né invitare né uscire.
   *
   * Un gruppo che resta **senza nessuno** viene eliminato: non è lo spazio di
   * qualcun altro, è una riga che non ha più un soggetto. Le aule collocate
   * lì dentro sopravvivono comunque, perché a scollegarle è il fatto.
   */
  async rimuoviAppartenenzeDi(utenteId: string): Promise<void> {
    const appartenenze = await this.prisma.membro.findMany({
      where: { utenteId },
      select: { gruppoId: true },
    });

    for (const { gruppoId } of appartenenze) {
      await this.prisma.membro.delete({
        where: { gruppoId_utenteId: { gruppoId, utenteId } },
      });

      const rimasti = await this.prisma.membro.findMany({
        where: { gruppoId },
        orderBy: { entratoIl: 'asc' },
      });

      if (rimasti.length === 0) {
        await this.elimina_perCancellazione(gruppoId);
        continue;
      }
      if (!rimasti.some((m) => m.moderatore)) {
        await this.prisma.membro.update({
          where: { gruppoId_utenteId: { gruppoId, utenteId: rimasti[0]!.utenteId } },
          data: { moderatore: true },
        });
      }
    }

    // Gli inviti che questa persona ha emesso o accettato spariscono: portano
    // il suo identificativo e un indirizzo email, che è un dato personale.
    await this.prisma.invitoAlGruppo.deleteMany({
      where: { OR: [{ accettatoDa: utenteId }, { invitatoDa: utenteId }] },
    });

    // Chi ha creato il gruppo resta un fatto storico, ma non deve restare
    // *questa persona*: l'identificativo si stacca, come l'autore di un post.
    await this.prisma.gruppo.updateMany({
      where: { creatoDa: utenteId },
      data: { creatoDa: `anonimo-${randomUUID()}` },
    });
  }

  /** Eliminazione senza controlli di ruolo: la decide la catena, non un utente. */
  private async elimina_perCancellazione(gruppoId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.gruppo.delete({ where: { id: gruppoId } });
      await this.recapito.pubblica(tx, {
        tipo: GRUPPO_ELIMINATO,
        aggregatoId: gruppoId,
        payload: { gruppoId } satisfies PayloadGruppoEliminato as unknown as Prisma.InputJsonValue,
      });
    });
  }

  /** Verifica del residuo (SE3): quante righe portano ancora questo id. */
  async contaResiduiDi(utenteId: string): Promise<number> {
    const [membri, inviti, creati] = await Promise.all([
      this.prisma.membro.count({ where: { utenteId } }),
      this.prisma.invitoAlGruppo.count({
        where: { OR: [{ accettatoDa: utenteId }, { invitatoDa: utenteId }] },
      }),
      this.prisma.gruppo.count({ where: { creatoDa: utenteId } }),
    ]);
    return membri + inviti + creati;
  }

  // --- Interni --------------------------------------------------------------

  private async gruppoEsistente(gruppoId: string) {
    const gruppo = await this.prisma.gruppo.findUnique({ where: { id: gruppoId } });
    if (!gruppo) {
      throw new AppException(
        GruppoErrorCode.NOT_FOUND,
        'GRUPPO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return gruppo;
  }

  private async gruppoConMembri(gruppoId: string) {
    const gruppo = await this.prisma.gruppo.findUnique({
      where: { id: gruppoId },
      include: { membri: true },
    });
    if (!gruppo) {
      throw new AppException(
        GruppoErrorCode.NOT_FOUND,
        'GRUPPO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return gruppo;
  }

  /**
   * Il gruppo che questo utente può leggere.
   *
   * Un gruppo che esiste ma non è suo da vedere risponde 404 come uno che non
   * esiste: «esiste ma non puoi vederlo» racconta comunque che esiste.
   */
  private async gruppoVisibileA(utenteId: string, gruppoId: string) {
    const gruppo = await this.gruppoConMembri(gruppoId);
    const eMembro = gruppo.membri.some((m) => m.utenteId === utenteId);

    // L'università di chi legge si legge fresca: è un dato del Profilo, non
    // dello spazio.
    const chiSono = eMembro ? null : await this.profilo.perUtente(utenteId);
    if (!puoVedere(gruppo, { eMembro, universitaId: chiSono?.universita?.id ?? null })) {
      throw new AppException(
        GruppoErrorCode.NOT_FOUND,
        'GRUPPO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return gruppo;
  }

  private async esigiMembro(utenteId: string, gruppoId: string) {
    const gruppo = await this.gruppoConMembri(gruppoId);
    if (!gruppo.membri.some((m) => m.utenteId === utenteId)) {
      throw new AppException(
        GruppoErrorCode.NON_SEI_MEMBRO,
        'GRUPPO_NON_SEI_MEMBRO',
        HttpStatus.FORBIDDEN,
      );
    }
    return gruppo;
  }

  private async esigiModeratore(utenteId: string, gruppoId: string) {
    const gruppo = await this.gruppoConMembri(gruppoId);
    const io = gruppo.membri.find((m) => m.utenteId === utenteId);
    if (!io?.moderatore) {
      throw new AppException(
        GruppoErrorCode.NON_SEI_MODERATORE,
        'GRUPPO_NON_SEI_MODERATORE',
        HttpStatus.FORBIDDEN,
      );
    }
    return gruppo;
  }

  /** Il bersaglio di un gesto di amministrazione: se non è nel gruppo, non esiste. */
  private esigiBersaglio(membri: { utenteId: string }[], utenteId: string): void {
    if (!membri.some((m) => m.utenteId === utenteId)) {
      throw new AppException(
        GruppoErrorCode.MEMBRO_NOT_FOUND,
        'GRUPPO_MEMBRO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async invitoEsistente(invitoId: string) {
    const invito = await this.prisma.invitoAlGruppo.findUnique({ where: { id: invitoId } });
    if (!invito) {
      throw new AppException(
        GruppoErrorCode.INVITO_NOT_FOUND,
        'GRUPPO_INVITO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return invito;
  }

  /** L'invito è rivolto a un indirizzo: chi accetta dev'essere quello (IG1). */
  private async esigiDestinatario(utenteId: string, invito: { destinatario: string }) {
    const mioIndirizzo = await this.identita.indirizzoDi(utenteId);
    if (mioIndirizzo && mioIndirizzo !== invito.destinatario) {
      throw new AppException(
        GruppoErrorCode.INVITO_DI_UN_ALTRO,
        'GRUPPO_INVITO_DI_UN_ALTRO',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * Ogni cambio dell'insieme dei membri passa di qui.
   *
   * La versione letta all'inizio è la fotografia su cui G2 è stata verificata:
   * se nel frattempo qualcun altro ha toccato l'insieme, quella fotografia non
   * vale più e il gesto va rifatto su dati nuovi. Senza questo, due
   * retrocessioni concorrenti lascerebbero il gruppo senza moderatori pur
   * essendo ciascuna, da sola, perfettamente lecita.
   */
  private async conBloccoDiVersione(
    gruppo: { id: string; versione: number },
    scrittura: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const aggiornati = await tx.gruppo.updateMany({
        where: { id: gruppo.id, versione: gruppo.versione },
        data: { versione: { increment: 1 } },
      });
      if (aggiornati.count === 0) {
        throw new AppException(
          GruppoErrorCode.CONFLITTO_DI_VERSIONE,
          'GRUPPO_CONFLITTO_DI_VERSIONE',
          HttpStatus.CONFLICT,
        );
      }
      await scrittura(tx);
    });
  }

  /**
   * I nomi degli atenei congelati in questi gruppi, in una domanda sola. Il
   * gruppo conserva l'identificativo (G5); il nome lo traduce il catalogo, che
   * sta in Profilo — il contesto che questo modulo già importa.
   */
  private nomiDegliAtenei(gruppi: { ateneoId: string | null }[]): Promise<Map<string, string>> {
    return this.catalogo.nomiDiAtenei(
      gruppi.map((gruppo) => gruppo.ateneoId).filter(Boolean) as string[],
    );
  }

  /**
   * `nomiAtenei` è **obbligatorio** e senza ripiego: il gruppo conserva un
   * identificativo, e chi lo mostra deve averne risolto il nome. Un parametro
   * facoltativo produrrebbe elenchi con l'ateneo vuoto e nessun errore.
   */
  private gruppoPerIlClient(
    gruppo: {
      id: string;
      nome: string;
      visibilita: string;
      ateneoId: string | null;
      creatoIl: Date;
    },
    membri: { utenteId: string; moderatore: boolean }[],
    lettoreId: string,
    nomiAtenei: Map<string, string>,
  ): GruppoResponse {
    const io = membri.find((m) => m.utenteId === lettoreId);
    return {
      id: gruppo.id,
      nome: gruppo.nome,
      visibilita: gruppo.visibilita as GruppoResponse['visibilita'],
      ateneo: gruppo.ateneoId ? (nomiAtenei.get(gruppo.ateneoId) ?? null) : null,
      creatoIl: gruppo.creatoIl.toISOString(),
      membri: membri.length,
      sonoMembro: Boolean(io),
      sonoModeratore: io?.moderatore ?? false,
    };
  }

  private invitoPerIlClient(
    invito: {
      id: string;
      gruppoId: string;
      destinatario: string;
      stato: string;
      scadeIl: Date;
      emessoIl: Date;
    },
    nomeGruppo: string,
    membroCreato: boolean,
  ): InvitoAlGruppoResponse {
    return {
      id: invito.id,
      gruppoId: invito.gruppoId,
      nomeGruppo,
      destinatario: invito.destinatario,
      stato: invito.stato as InvitoAlGruppoResponse['stato'],
      scadeIl: invito.scadeIl.toISOString(),
      emessoIl: invito.emessoIl.toISOString(),
      membroCreato,
    };
  }
}
