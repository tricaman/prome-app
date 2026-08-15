import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AllegatoDiAulaStudioResponse,
  ArgomentoResponse,
  AulaStudioResponse,
  CreaAulaStudioRequest,
  InvitoResponse,
  MessaggioDiChatResponse,
  ModificaAulaStudioRequest,
  PaginatedResult,
  PartecipanteResponse,
  PermessoAulaStudio,
  SalaResponse,
  TipoAllegato,
} from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions';
import { env } from '../../config/env';
import {
  ARCHIVIO_DI_FILE,
  chiaveMaterialeAula,
  type ArchivioDiFile,
  type Preautorizzazione,
} from '../../infrastruttura/archivio-file/archivio-file';
import {
  CANALE_EMAIL,
  type CanaleEmail,
} from '../../infrastruttura/avvisi-in-uscita/canale-email';
import {
  stanzaDiAula,
  TRASPORTO_TEMPO_REALE,
  type TrasportoInTempoReale,
} from '../../infrastruttura/tempo-reale/trasporto';
import {
  GRUPPO_ELIMINATO,
  MEMBRO_RIMOSSO,
  RecapitoFattiDelGruppoService,
  type PayloadGruppoEliminato,
  type PayloadMembroRimosso,
} from '../gruppo/recapito-fatti.service';
import { PortaIdentitaUtente } from '../profilo/porta-identita-utente';
import { ProfiloService } from '../profilo/profilo.service';
import { AulaStudioErrorCode } from './constants/error-codes';
import {
  costruisciAula,
  eSolaLettura,
  permessiEffettivi,
  verificaMateriale,
  verificaNonSiaLUltimoModeratore,
  type Permessi,
} from './dominio/aula-studio';
import { PortaAppartenenzaGruppo } from './porta-appartenenza-gruppo';
import {
  INVITO_ACCETTATO,
  RecapitoFattiService,
  type ConsumatoreDiFatti,
  type PayloadInvitoAccettato,
} from './recapito-fatti.service';

/** Un invito vale sette giorni dall'emissione. */
export const GIORNI_VALIDITA_INVITO = 7;

/**
 * Bounded context AULA STUDIO — il core: l'incontro di studio.
 *
 * Importa Profilo (upstream condiviso) per la prova di onboarding, per
 * l'università su cui si decide l'ammissione all'ateneo e per i nomi da
 * mostrare. **Non importa Bacheca né Gruppo**: con Bacheca il rapporto è
 * separate ways, e con Gruppo passa un solo fatto booleano attraverso
 * `PortaAppartenenzaGruppo` — la parola «Membro» non entra qui dentro.
 *
 * Due regole che questo file applica ovunque:
 * - i **permessi si leggono freschi nell'istante del gesto** (AL4, MA2), mai
 *   da una copia presa all'ingresso;
 * - i permessi di chi legge **li dichiara il server** (`sonoModeratore`,
 *   `mieiPermessi`, `solaLettura`): ricalcolarli nel client vorrebbe dire
 *   tenere due copie della stessa regola, e quella del client è aggirabile.
 */
@Injectable()
export class AulaStudioService implements ConsumatoreDiFatti {
  private readonly logger = new Logger('AulaStudio');

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilo: ProfiloService,
    private readonly identita: PortaIdentitaUtente,
    private readonly appartenenza: PortaAppartenenzaGruppo,
    private readonly recapito: RecapitoFattiService,
    private readonly recapitoDelGruppo: RecapitoFattiDelGruppoService,
    @Inject(ARCHIVIO_DI_FILE) private readonly archivio: ArchivioDiFile,
    @Inject(CANALE_EMAIL) private readonly email: CanaleEmail,
    @Inject(TRASPORTO_TEMPO_REALE) private readonly trasporto: TrasportoInTempoReale,
  ) {
    this.recapito.registra(this);
    // Anche sui fatti del gruppo: la decadenza dell'appartenenza è una
    // decisione presa altrove di cui questo contesto deve trarre le
    // conseguenze, e il canale è quello del contesto che la produce.
    this.recapitoDelGruppo.registra(this);
    // Il modulo proprietario si presenta come guardiano delle proprie stanze:
    // il trasporto consegna, ma non decide chi può ascoltare.
    this.trasporto.registraGuardiano?.(this);
  }

  // --- Comandi sull'aula ----------------------------------------------------

  async crea(utenteId: string, dati: CreaAulaStudioRequest): Promise<AulaStudioResponse> {
    const prova = await this.profilo.provaDiOnboarding(utenteId);
    const chiSono = await this.profilo.perUtente(utenteId);

    const daScrivere = costruisciAula(prova, {
      titolo: dati.titolo,
      visibilita: dati.visibilita,
      dataOraInizio: dati.dataOraInizio ? new Date(dati.dataOraInizio) : null,
      universitaDelCreatore: chiSono.universita,
    });

    // AS2 e AS5 alla nascita: chi crea è moderatore, e un moderatore ha i tre
    // permessi. L'aula nasce già governabile, e non esiste l'istante in cui
    // esiste senza nessuno che possa moderarla.
    const aula = await this.prisma.aulaStudio.create({
      data: {
        titolo: daScrivere.titolo,
        visibilita: daScrivere.visibilita,
        ateneo: daScrivere.ateneo,
        dataOraInizio: daScrivere.dataOraInizio,
        partecipanti: {
          create: {
            utenteId: daScrivere.creatoreId,
            moderatore: true,
            parlare: true,
            scrivere: true,
            caricare: true,
          },
        },
      },
      include: { partecipanti: true },
    });

    return this.aulaPerIlClient(aula, aula.partecipanti, utenteId);
  }

  /** Le aule di cui si è partecipanti, dalla più recente. */
  async elenca(
    utenteId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<AulaStudioResponse>> {
    const dove = { partecipanti: { some: { utenteId } } };

    const [totale, righe] = await Promise.all([
      this.prisma.aulaStudio.count({ where: dove }),
      this.prisma.aulaStudio.findMany({
        where: dove,
        orderBy: { creatoIl: 'desc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
        include: { partecipanti: true },
      }),
    ]);

    return {
      data: righe.map((riga) => this.aulaPerIlClient(riga, riga.partecipanti, utenteId)),
      meta: {
        total: totale,
        page: pagina.page,
        limit: pagina.limit,
        totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
      },
    };
  }

  /**
   * L'apertura della sala: **una sola risposta composta**.
   *
   * Partecipanti con i loro permessi, argomenti e materiali arrivano insieme.
   * Una sequenza di chiamate costringerebbe il client a orchestrare, e
   * moltiplicherebbe le andate e ritorni proprio nel gesto più frequente del
   * prodotto.
   */
  async leggiSala(utenteId: string, aulaId: string): Promise<SalaResponse> {
    const aula = await this.aulaVisibileA(utenteId, aulaId);

    const [partecipanti, argomenti, allegati] = await Promise.all([
      this.prisma.partecipante.findMany({
        where: { aulaStudioId: aulaId },
        orderBy: [{ moderatore: 'desc' }, { ammessoIl: 'asc' }],
      }),
      this.prisma.argomento.findMany({
        where: { aulaStudioId: aulaId },
        orderBy: { creatoIl: 'asc' },
      }),
      this.prisma.allegatoDiAulaStudio.findMany({
        where: { aulaStudioId: aulaId },
        orderBy: { creatoIl: 'desc' },
      }),
    ]);

    const profili = await this.profilo.perUtenti([...new Set(partecipanti.map((p) => p.utenteId))]);
    const io = partecipanti.find((p) => p.utenteId === utenteId);

    return {
      aula: this.aulaPerIlClient(aula, partecipanti, utenteId),
      partecipanti: partecipanti.map((p) => {
        const profilo = profili.get(p.utenteId);
        const permessi = permessiEffettivi(p);
        return {
          utenteId: p.utenteId,
          nome: profilo?.nome ?? null,
          cognome: profilo?.cognome ?? null,
          universita: profilo?.universita ?? null,
          // Senza profilo dietro: account cancellato o in cancellazione.
          ...(profilo ? {} : { rimosso: true }),
          moderatore: p.moderatore,
          permessi,
          solaLettura: eSolaLettura(permessi),
        } satisfies PartecipanteResponse;
      }),
      argomenti: argomenti.map(argomentoPerIlClient),
      allegati: allegati.map((a) => this.materialePerIlClient(a)),
      sonoModeratore: io?.moderatore ?? false,
      mieiPermessi: io ? permessiEffettivi(io) : { parlare: false, scrivere: false, caricare: false },
    };
  }

  async modifica(
    utenteId: string,
    aulaId: string,
    dati: ModificaAulaStudioRequest,
  ): Promise<AulaStudioResponse> {
    await this.esigiModeratore(utenteId, aulaId);

    // AS8 anche qui: una data si può spostare, ma non nel passato.
    const dataOraInizio =
      dati.dataOraInizio === undefined ? undefined : dati.dataOraInizio ? new Date(dati.dataOraInizio) : null;
    if (dataOraInizio && dataOraInizio.getTime() <= Date.now()) {
      throw new AppException(
        AulaStudioErrorCode.DATA_NEL_PASSATO,
        'AULA_DATA_NEL_PASSATO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const titolo = dati.titolo?.trim();
    if (titolo !== undefined && !titolo) {
      throw new AppException(
        AulaStudioErrorCode.TITOLO_VUOTO,
        'AULA_TITOLO_VUOTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // AS9: la collocazione è al più una, mai due. Chi colloca dev'essere
    // membro del gruppo **adesso** — altrimenti si aprirebbe la propria aula a
    // uno spazio di cui non fa parte, e i suoi membri entrerebbero senza che
    // nessuno di loro l'abbia chiesto.
    if (dati.gruppoId) {
      const membro = await this.appartenenza.eAmmessoPerAppartenenza(utenteId, dati.gruppoId);
      if (!membro) {
        throw new AppException(
          AulaStudioErrorCode.COLLOCAZIONE_NEGATA,
          'AULA_COLLOCAZIONE_NEGATA',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const aggiornata = await this.prisma.aulaStudio.update({
      where: { id: aulaId },
      data: {
        ...(titolo ? { titolo } : {}),
        ...(dati.visibilita ? { visibilita: dati.visibilita } : {}),
        ...(dataOraInizio !== undefined ? { dataOraInizio } : {}),
        ...(dati.gruppoId !== undefined ? { gruppoId: dati.gruppoId } : {}),
        versione: { increment: 1 },
      },
      include: { partecipanti: true },
    });

    return this.aulaPerIlClient(aggiornata, aggiornata.partecipanti, utenteId);
  }

  /**
   * L'aula si elimina solo se non contiene materiali.
   *
   * È una regola di business, non un'invariante: i materiali sono aggregati
   * autonomi e l'aula non può garantirne l'assenza al commit. Si verifica
   * quindi **al comando, su lettura fresca**, e la finestra sottilissima che
   * resta — un file caricato nello stesso istante — la chiude la
   * riconciliazione degli orfani.
   */
  async elimina(utenteId: string, aulaId: string): Promise<void> {
    await this.esigiModeratore(utenteId, aulaId);

    const [materiali, messaggi] = await Promise.all([
      this.prisma.allegatoDiAulaStudio.count({ where: { aulaStudioId: aulaId } }),
      this.prisma.messaggioDiChat.count({ where: { aulaStudioId: aulaId } }),
    ]);
    if (materiali > 0 || messaggi > 0) {
      throw new AppException(
        AulaStudioErrorCode.AULA_NON_VUOTA,
        'AULA_NON_VUOTA',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.prisma.aulaStudio.delete({ where: { id: aulaId } });
    // Argomenti e inviti non hanno vincolo verso l'aula: li raccoglie la
    // riconciliazione, che non ha nessuno che la aspetti.
  }

  // --- Ammissione -----------------------------------------------------------

  /**
   * Il titolo di ammissione, risolto **su dato fresco** nell'istante in cui
   * qualcuno chiede di entrare (IA4).
   *
   * Chi chiede di entrare sta chiedendo *adesso*: l'interrogazione basta e non
   * serve alcuna copia locale. È il verso facile dell'asimmetria — quello
   * dell'uscita, che deve raggiungere chi è già dentro, arriverà con E7 come
   * propagazione per fatto.
   */
  async entra(utenteId: string, aulaId: string): Promise<void> {
    const aula = await this.aulaEsistente(aulaId);

    const gia = await this.prisma.partecipante.findUnique({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
    });
    // AS3 rende la seconda ammissione un'operazione senza effetto, non un errore.
    if (gia) return;

    if (!(await this.haTitoloDiAmmissione(utenteId, aula))) {
      throw new AppException(
        AulaStudioErrorCode.AMMISSIONE_NEGATA,
        'AULA_AMMISSIONE_NEGATA',
        HttpStatus.FORBIDDEN,
      );
    }

    // Entra in sola lettura: assiste senza interagire, ed è una condizione
    // normale dell'incontro, non un difetto da correggere.
    await this.ammetti(aulaId, utenteId);
  }

  /**
   * I titoli per stare in quest'aula, risolti **su dato fresco**.
   *
   * Sta in un posto solo perché serve in due momenti opposti — quando qualcuno
   * chiede di entrare e quando bisogna decidere se chi è già dentro può
   * restare — e due copie della stessa regola divergerebbero: quella
   * dimenticata sarebbe la seconda, cioè proprio quella che decide un'uscita.
   *
   * L'invito accettato è un titolo **indipendente dal gruppo**: chi ce l'ha
   * resta anche dopo aver perso l'appartenenza.
   */
  private async haTitoloDiAmmissione(
    utenteId: string,
    aula: { id: string; visibilita: string; ateneo: string | null; gruppoId: string | null },
  ): Promise<boolean> {
    const invitato = await this.prisma.invito.findFirst({
      where: { aulaStudioId: aula.id, stato: 'ACCETTATO', accettatoDa: utenteId },
    });
    if (invitato) return true;

    if (aula.visibilita === 'PUBBLICO') return true;

    if (aula.gruppoId) {
      // L'appartenenza si chiede adesso: nessuna copia locale di chi è membro.
      if (await this.appartenenza.eAmmessoPerAppartenenza(utenteId, aula.gruppoId)) return true;
    }

    if (aula.visibilita === 'ATENEO' && aula.ateneo) {
      const chiSono = await this.profilo.perUtente(utenteId);
      return chiSono.universita === aula.ateneo;
    }

    return false;
  }

  /** Uscita volontaria o rimozione da parte di un moderatore. */
  async rimuoviPartecipante(
    richiedenteId: string,
    aulaId: string,
    utenteId: string,
  ): Promise<void> {
    const seStesso = richiedenteId === utenteId;
    if (!seStesso) await this.esigiModeratore(richiedenteId, aulaId);
    else await this.esigiPartecipante(richiedenteId, aulaId);

    const bersaglio = await this.partecipanteDi(aulaId, utenteId);
    const moderatori = await this.contaModeratori(aulaId);
    verificaNonSiaLUltimoModeratore(moderatori, bersaglio);

    await this.prisma.$transaction(async (tx) => {
      await this.confermaVersione(tx, aulaId);
      await tx.partecipante.delete({
        where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
      });
    });
  }

  // --- Ruolo e permessi -----------------------------------------------------

  /** Promuovere concede i tre permessi (AS5). */
  async promuovi(richiedenteId: string, aulaId: string, utenteId: string): Promise<void> {
    await this.esigiModeratore(richiedenteId, aulaId);
    await this.partecipanteDi(aulaId, utenteId);

    await this.prisma.$transaction(async (tx) => {
      await this.confermaVersione(tx, aulaId);
      await tx.partecipante.update({
        where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
        data: { moderatore: true, parlare: true, scrivere: true, caricare: true },
      });
    });
  }

  /**
   * Retrocedere lascia i permessi dov'erano: il ruolo è più dei permessi che
   * porta con sé, e toglierli sarebbe una seconda decisione non chiesta.
   */
  async retrocedi(richiedenteId: string, aulaId: string, utenteId: string): Promise<void> {
    await this.esigiModeratore(richiedenteId, aulaId);
    const bersaglio = await this.partecipanteDi(aulaId, utenteId);
    const moderatori = await this.contaModeratori(aulaId);
    verificaNonSiaLUltimoModeratore(moderatori, bersaglio);

    await this.prisma.$transaction(async (tx) => {
      await this.confermaVersione(tx, aulaId);
      // Il conflitto delle due retrocessioni concorrenti muore qui: la seconda
      // transazione trova una versione diversa da quella che aveva letto.
      const rimasti = await tx.partecipante.count({
        where: { aulaStudioId: aulaId, moderatore: true },
      });
      verificaNonSiaLUltimoModeratore(rimasti, bersaglio);
      await tx.partecipante.update({
        where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
        data: { moderatore: false },
      });
    });
  }

  /**
   * Concede o revoca **un** permesso per volta (AS4).
   *
   * Non esiste il gesto «dai tutti i permessi», e non esiste un endpoint per
   * la sola lettura: quella si raggiunge per revoche successive. Su un
   * moderatore la revoca non produce effetto finché dura il ruolo (AS5), e
   * `permessiEffettivi` lo rende vero in lettura senza che serva ricordarlo.
   */
  async cambiaPermesso(
    richiedenteId: string,
    aulaId: string,
    utenteId: string,
    permesso: PermessoAulaStudio,
    concedi: boolean,
  ): Promise<void> {
    await this.esigiModeratore(richiedenteId, aulaId);
    await this.partecipanteDi(aulaId, utenteId);

    await this.prisma.partecipante.update({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
      data: { [permesso]: concedi },
    });
  }

  // --- Inviti ---------------------------------------------------------------

  async invita(utenteId: string, aulaId: string, destinatario: string): Promise<InvitoResponse> {
    const aula = await this.esigiModeratore(utenteId, aulaId);
    const chiInvita = await this.profilo.perUtente(utenteId);

    const scadeIl = new Date(Date.now() + GIORNI_VALIDITA_INVITO * 24 * 60 * 60 * 1000);
    const invito = await this.prisma.invito.create({
      data: {
        aulaStudioId: aulaId,
        destinatario: destinatario.trim().toLowerCase(),
        invitatoDa: utenteId,
        scadeIl,
      },
    });

    const nome = [chiInvita.nome, chiInvita.cognome].filter(Boolean).join(' ') || 'Un compagno';
    await this.email.inviaInvitoAulaStudio(
      invito.destinatario,
      {
        titoloAula: aula.titolo,
        invitatoDa: nome,
        collegamento: `${env.URL_APP_WEB}/app/inviti/${invito.id}`,
        scadeIl,
      },
      'it',
    );

    return this.invitoPerIlClient(invito, aula.titolo, false);
  }

  /**
   * L'accettazione **non crea il partecipante nella stessa transazione**
   * (IA3): scrive lo stato dell'invito e il fatto, insieme. Il partecipante
   * compare entro pochi secondi, per mano della corsia rapida.
   *
   * È il motivo per cui il controller risponde 202: dire 201 sarebbe mentire
   * su un'entità che ancora non esiste.
   */
  async accetta(utenteId: string, invitoId: string): Promise<InvitoResponse> {
    // IA2: la prova di onboarding è esibita, non verificata altrove. Chi non
    // ce l'ha non accetta, e l'invito resta legittimamente in attesa.
    await this.profilo.provaDiOnboarding(utenteId);

    const invito = await this.prisma.invito.findUnique({ where: { id: invitoId } });
    if (!invito) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_NOT_FOUND,
        'INVITO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // L'invito è rivolto a un indirizzo: chi accetta dev'essere quello.
    const mioIndirizzo = await this.identita.indirizzoDi(utenteId);
    if (mioIndirizzo && mioIndirizzo !== invito.destinatario) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_DI_UN_ALTRO,
        'INVITO_DI_UN_ALTRO',
        HttpStatus.FORBIDDEN,
      );
    }

    // IA1: dallo stato iniziale si transita una volta sola.
    if (invito.stato !== 'IN_ATTESA') {
      throw new AppException(
        AulaStudioErrorCode.INVITO_GIA_CHIUSO,
        'INVITO_GIA_CHIUSO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (invito.scadeIl.getTime() <= Date.now()) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_SCADUTO,
        'INVITO_SCADUTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const aggiornato = await this.prisma.$transaction(async (tx) => {
      const scritto = await tx.invito.update({
        where: { id: invitoId },
        data: { stato: 'ACCETTATO', chiusoIl: new Date(), accettatoDa: utenteId },
      });
      // Il fatto nasce nella stessa transazione dell'aggregato che lo produce:
      // o esistono entrambi, o nessuno dei due.
      await this.recapito.pubblica(tx, {
        tipo: INVITO_ACCETTATO,
        aggregatoId: invitoId,
        payload: {
          invitoId,
          aulaStudioId: invito.aulaStudioId,
          utenteId,
        } satisfies PayloadInvitoAccettato as unknown as Prisma.InputJsonValue,
      });
      return scritto;
    });

    const aula = await this.aulaEsistente(invito.aulaStudioId);
    return this.invitoPerIlClient(aggiornato, aula.titolo, false);
  }

  async leggiInvito(utenteId: string, invitoId: string): Promise<InvitoResponse> {
    const invito = await this.prisma.invito.findUnique({ where: { id: invitoId } });
    if (!invito) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_NOT_FOUND,
        'INVITO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    const mioIndirizzo = await this.identita.indirizzoDi(utenteId);
    if (mioIndirizzo && mioIndirizzo !== invito.destinatario && invito.invitatoDa !== utenteId) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_DI_UN_ALTRO,
        'INVITO_DI_UN_ALTRO',
        HttpStatus.FORBIDDEN,
      );
    }

    const aula = await this.aulaEsistente(invito.aulaStudioId);
    const partecipante = invito.accettatoDa
      ? await this.prisma.partecipante.findUnique({
          where: {
            aulaStudioId_utenteId: {
              aulaStudioId: invito.aulaStudioId,
              utenteId: invito.accettatoDa,
            },
          },
        })
      : null;

    return this.invitoPerIlClient(invito, aula.titolo, Boolean(partecipante));
  }

  // --- Argomenti e materiali ------------------------------------------------

  async creaArgomento(
    utenteId: string,
    aulaId: string,
    dati: { titolo: string; testo?: string },
  ): Promise<ArgomentoResponse> {
    await this.esigiPartecipante(utenteId, aulaId);
    const titolo = dati.titolo.trim();
    if (!titolo) {
      throw new AppException(
        AulaStudioErrorCode.TITOLO_VUOTO,
        'AULA_TITOLO_VUOTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const argomento = await this.prisma.argomento.create({
      data: { aulaStudioId: aulaId, titolo, testo: dati.testo?.trim() || null },
    });
    return argomentoPerIlClient(argomento);
  }

  /**
   * Eliminare un argomento **non cancella alcun file**: i materiali tornano
   * sciolti nell'aula. È l'opposto di ciò che accade ai post, ed è deliberato
   * — riorganizzare non distrugge, e il materiale di studio non si perde per
   * un gesto di riordino. Lo scioglimento avviene in differita: nessuno lo
   * sta aspettando.
   */
  async eliminaArgomento(utenteId: string, aulaId: string, argomentoId: string): Promise<void> {
    await this.esigiModeratore(utenteId, aulaId);
    const argomento = await this.prisma.argomento.findUnique({ where: { id: argomentoId } });
    if (!argomento || argomento.aulaStudioId !== aulaId) {
      throw new AppException(
        AulaStudioErrorCode.ARGOMENTO_NON_VALIDO,
        'ARGOMENTO_NON_VALIDO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.prisma.argomento.delete({ where: { id: argomentoId } });
  }

  /**
   * Pre-autorizza un materiale: il permesso di caricare si legge **fresco,
   * adesso** (AL4), non da una copia presa quando si è entrati.
   */
  async preautorizzaMateriale(
    utenteId: string,
    aulaId: string,
    dati: { nome: string; tipo: TipoAllegato; dimensione: number },
  ): Promise<Preautorizzazione & { chiave: string }> {
    await this.esigiPermessoDiCaricare(utenteId, aulaId);
    verificaMateriale(dati);

    const chiave = chiaveMaterialeAula(aulaId, crypto.randomUUID(), dati.nome);
    const preautorizzazione = await this.archivio.preautorizzaCaricamento(chiave, dati.tipo);
    return { chiave, ...preautorizzazione };
  }

  async aggiungiMateriale(
    utenteId: string,
    aulaId: string,
    dati: { chiave: string; argomentoId?: string },
  ): Promise<AllegatoDiAulaStudioResponse> {
    await this.esigiPermessoDiCaricare(utenteId, aulaId);

    // AL3: se c'è una collocazione, l'argomento è di questa aula. Verificato
    // al comando, su lettura fresca: al commit l'allegato non può garantirlo.
    if (dati.argomentoId) {
      const argomento = await this.prisma.argomento.findUnique({
        where: { id: dati.argomentoId },
      });
      if (!argomento || argomento.aulaStudioId !== aulaId) {
        throw new AppException(
          AulaStudioErrorCode.ARGOMENTO_NON_VALIDO,
          'ARGOMENTO_NON_VALIDO',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    // La dimensione la misura il server sul file vero: quella dichiarata dal
    // client è servita a rifiutare prima di caricare, non a essere creduta.
    const dimensione = await this.archivio.dimensioneDi(dati.chiave);
    const nome = dati.chiave.split('/').pop() ?? 'file';
    if (dimensione === null) {
      throw new AppException(
        AulaStudioErrorCode.FILE_NON_VALIDO,
        'AULA_FILE_NON_VALIDO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    verificaMateriale({ nome, dimensione });

    const materiale = await this.prisma.allegatoDiAulaStudio.create({
      data: {
        aulaStudioId: aulaId,
        argomentoId: dati.argomentoId ?? null,
        // AL2: chi ha portato il materiale è un fatto storico e immutabile.
        caricatoDa: utenteId,
        chiave: dati.chiave,
        nome,
        tipo: tipoDiFile(nome),
        dimensione,
      },
    });

    return this.materialePerIlClient(materiale);
  }

  async eliminaMateriale(utenteId: string, aulaId: string, materialeId: string): Promise<void> {
    const materiale = await this.prisma.allegatoDiAulaStudio.findUnique({
      where: { id: materialeId },
    });
    if (!materiale || materiale.aulaStudioId !== aulaId) {
      throw new AppException(
        AulaStudioErrorCode.ALLEGATO_NOT_FOUND,
        'AULA_ALLEGATO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // Lo tolgono chi l'ha portato e i moderatori: chi modera governa ciò che
    // sta nella propria aula.
    if (materiale.caricatoDa !== utenteId) await this.esigiModeratore(utenteId, aulaId);

    await this.prisma.allegatoDiAulaStudio.delete({ where: { id: materialeId } });
    await this.archivio.rimuovi(materiale.chiave).catch(() => undefined);
  }

  // --- Chat dell'aula (E4) --------------------------------------------------

  /**
   * Scrive in chat.
   *
   * Il permesso si legge **sull'aula, fresco, adesso** (MA2): un partecipante
   * ammesso può benissimo essere in sola lettura, e la revoca zittisce da quel
   * momento senza toccare ciò che è già stato detto.
   *
   * Il messaggio è **persistito prima e pubblicato dopo**: se il trasporto non
   * risponde la conversazione esiste comunque, e chi riapre l'aula la trova. Un
   * fallimento della consegna non è un fallimento della scrittura.
   */
  async scrivi(
    utenteId: string,
    aulaId: string,
    testo: string,
  ): Promise<MessaggioDiChatResponse> {
    const partecipante = await this.esigiPartecipante(utenteId, aulaId);
    if (!permessiEffettivi(partecipante).scrivere) {
      throw new AppException(
        AulaStudioErrorCode.NON_PUOI_SCRIVERE,
        'AULA_NON_PUOI_SCRIVERE',
        HttpStatus.FORBIDDEN,
      );
    }

    const pulito = testo.trim();
    if (!pulito) {
      throw new AppException(
        AulaStudioErrorCode.MESSAGGIO_VUOTO,
        'MESSAGGIO_VUOTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const messaggio = await this.prisma.messaggioDiChat.create({
      data: { aulaStudioId: aulaId, autoreId: utenteId, testo: pulito },
    });

    const autori = await this.profilo.perUtenti([utenteId]);
    const perIlClient = this.messaggioPerIlClient(messaggio, autori.get(utenteId), utenteId);

    // Pubblicato dopo il commit, e senza attendere che riesca: chi ascolta lo
    // riceve subito, chi non ascolta lo leggerà dalla cronologia.
    await this.trasporto
      .pubblicaInStanza(stanzaDiAula(aulaId), 'messaggio', perIlClient)
      .catch(() => undefined);

    return perIlClient;
  }

  /** La cronologia, dal più vecchio: una conversazione ha un ordine. */
  async messaggi(
    utenteId: string,
    aulaId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<MessaggioDiChatResponse>> {
    await this.esigiPartecipante(utenteId, aulaId);
    const dove = { aulaStudioId: aulaId };

    const [totale, righe] = await Promise.all([
      this.prisma.messaggioDiChat.count({ where: dove }),
      this.prisma.messaggioDiChat.findMany({
        where: dove,
        orderBy: { inviatoIl: 'asc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
      }),
    ]);

    const autori = await this.profilo.perUtenti([...new Set(righe.map((r) => r.autoreId))]);

    return {
      data: righe.map((riga) =>
        this.messaggioPerIlClient(riga, autori.get(riga.autoreId), utenteId),
      ),
      meta: {
        total: totale,
        page: pagina.page,
        limit: pagina.limit,
        totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
      },
    };
  }

  /**
   * Chi può ascoltare la stanza di un'aula: **i suoi partecipanti**.
   *
   * È una verifica di ammissione, non di permesso — chi è in sola lettura
   * resta ammesso ad ascoltare, perché assistere è una condizione normale
   * dell'incontro.
   */
  async puoAscoltare(utenteId: string, aulaStudioId: string): Promise<boolean> {
    const partecipante = await this.prisma.partecipante.findUnique({
      where: { aulaStudioId_utenteId: { aulaStudioId, utenteId } },
    });
    return Boolean(partecipante);
  }

  // --- Consumo dei fatti ----------------------------------------------------

  /**
   * I fatti che questo contesto consuma: uno proprio, due del gruppo.
   *
   * Tutte e tre le reazioni sono idempotenti — AS3 rende innocua la doppia
   * ammissione, e rimuovere chi è già stato rimosso non trova nulla da fare —
   * quindi la doppia consegna non ha effetto.
   */
  async elabora(tipo: string, payload: unknown): Promise<void> {
    if (tipo === INVITO_ACCETTATO) {
      const { aulaStudioId, utenteId } = payload as PayloadInvitoAccettato;
      await this.ammetti(aulaStudioId, utenteId);
      return;
    }

    if (tipo === MEMBRO_RIMOSSO) {
      const { gruppoId, utenteId } = payload as PayloadMembroRimosso;
      await this.allontanaChiHaPersoIlTitolo(gruppoId, utenteId);
      return;
    }

    if (tipo === GRUPPO_ELIMINATO) {
      const { gruppoId } = payload as PayloadGruppoEliminato;
      await this.scollegaDalGruppo(gruppoId);
    }
  }

  /**
   * SE1 — chi perde l'appartenenza esce dalle aule collocate in quel gruppo.
   *
   * **Non si rimuove chi ha un titolo proprio.** L'appartenenza è uno dei modi
   * di essere ammessi, non l'unico: chi era entrato con un invito all'aula, o
   * chi sta in un'aula pubblica, ha un titolo che non veniva dal gruppo e che
   * la sua uscita non tocca. Il titolo si ri-risolve quindi **su dato fresco**,
   * uno per uno, e si rimuove solo chi resta senza — sarebbe altrimenti una
   * rimozione indebita, cioè lo stesso difetto di segno opposto.
   *
   * Chi è connesso in quel momento va allontanato **anche dalla stanza**: la
   * riga nel database smette di ammetterlo alla prossima richiesta, ma una
   * connessione aperta non fa nuove richieste, e continuerebbe a ricevere i
   * messaggi di una conversazione a cui non ha più diritto.
   */
  private async allontanaChiHaPersoIlTitolo(gruppoId: string, utenteId: string): Promise<void> {
    const aule = await this.prisma.aulaStudio.findMany({ where: { gruppoId } });

    for (const aula of aule) {
      const partecipante = await this.prisma.partecipante.findUnique({
        where: { aulaStudioId_utenteId: { aulaStudioId: aula.id, utenteId } },
      });
      if (!partecipante) continue;

      if (await this.haTitoloDiAmmissione(utenteId, aula)) continue;

      await this.prisma.partecipante.delete({
        where: { aulaStudioId_utenteId: { aulaStudioId: aula.id, utenteId } },
      });
      // Un errore di consegna non deve far ritentare la rimozione, che è già
      // avvenuta: la riga è la verità, la stanza è un'accelerazione.
      try {
        await this.trasporto.allontanaDallaStanza?.(stanzaDiAula(aula.id), utenteId);
      } catch {
        this.logger.warn(`Allontanamento dalla stanza non riuscito per l'aula ${aula.id}`);
      }
    }
  }

  /**
   * Il gruppo non c'è più: le aule collocate tornano sciolte e **restano vive**.
   *
   * Organizzare è un gesto leggero; eliminare aule con i loro materiali, la
   * loro chat e la loro storia è tutt'altro. Cancellare un riferimento non
   * cancella mai la cosa riferita.
   */
  private async scollegaDalGruppo(gruppoId: string): Promise<void> {
    await this.prisma.aulaStudio.updateMany({
      where: { gruppoId },
      data: { gruppoId: null },
    });
  }

  // --- Interni --------------------------------------------------------------

  /** Ammissione idempotente: la seconda volta non fa nulla (AS3). */
  private async ammetti(aulaId: string, utenteId: string): Promise<void> {
    await this.prisma.partecipante.upsert({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
      update: {},
      create: { aulaStudioId: aulaId, utenteId },
    });
  }

  private async aulaEsistente(aulaId: string) {
    const aula = await this.prisma.aulaStudio.findUnique({ where: { id: aulaId } });
    if (!aula) {
      throw new AppException(
        AulaStudioErrorCode.NOT_FOUND,
        'AULA_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return aula;
  }

  /**
   * L'aula che questo utente può leggere.
   *
   * Un'aula che esiste ma non è sua da vedere risponde 404 come una che non
   * esiste: «esiste ma non puoi vederla» racconta comunque che esiste.
   */
  private async aulaVisibileA(utenteId: string, aulaId: string) {
    const aula = await this.aulaEsistente(aulaId);
    const partecipante = await this.prisma.partecipante.findUnique({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
    });
    if (partecipante) return aula;

    if (aula.visibilita === 'PUBBLICO') return aula;
    if (aula.visibilita === 'ATENEO') {
      const chiSono = await this.profilo.perUtente(utenteId);
      if (aula.ateneo && chiSono.universita === aula.ateneo) return aula;
    }
    throw new AppException(AulaStudioErrorCode.NOT_FOUND, 'AULA_NOT_FOUND', HttpStatus.NOT_FOUND);
  }

  /** Il bersaglio di un gesto di moderazione: se non è nell'aula, non esiste. */
  private async partecipanteDi(aulaId: string, utenteId: string) {
    const partecipante = await this.prisma.partecipante.findUnique({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
    });
    if (!partecipante) {
      throw new AppException(
        AulaStudioErrorCode.NON_SEI_PARTECIPANTE,
        'AULA_NON_SEI_PARTECIPANTE',
        HttpStatus.NOT_FOUND,
      );
    }
    return partecipante;
  }

  /**
   * Chi agisce dev'essere dentro.
   *
   * È un diniego, non un nascondere: 403 e non 404. Che l'aula esista è già
   * noto a chi la sta guardando — la lettura della sala ha già deciso se
   * poteva vederla, e lì «esiste ma non puoi vederla» risponde 404 come
   * un'aula che non c'è.
   */
  private async esigiPartecipante(utenteId: string, aulaId: string) {
    await this.aulaEsistente(aulaId);
    const partecipante = await this.prisma.partecipante.findUnique({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
    });
    if (!partecipante) {
      throw new AppException(
        AulaStudioErrorCode.NON_SEI_PARTECIPANTE,
        'AULA_NON_SEI_PARTECIPANTE',
        HttpStatus.FORBIDDEN,
      );
    }
    return partecipante;
  }

  /** Il controllo di moderazione sta QUI, nel modulo, mai nella facciata. */
  private async esigiModeratore(utenteId: string, aulaId: string) {
    const aula = await this.aulaEsistente(aulaId);
    const partecipante = await this.prisma.partecipante.findUnique({
      where: { aulaStudioId_utenteId: { aulaStudioId: aulaId, utenteId } },
    });
    if (!partecipante?.moderatore) {
      throw new AppException(
        AulaStudioErrorCode.NON_SEI_MODERATORE,
        'AULA_NON_SEI_MODERATORE',
        HttpStatus.FORBIDDEN,
      );
    }
    return aula;
  }

  /** AL4: fresco, nell'istante del gesto. */
  private async esigiPermessoDiCaricare(utenteId: string, aulaId: string) {
    const partecipante = await this.esigiPartecipante(utenteId, aulaId);
    if (!permessiEffettivi(partecipante).caricare) {
      throw new AppException(
        AulaStudioErrorCode.NON_PUOI_CARICARE,
        'AULA_NON_PUOI_CARICARE',
        HttpStatus.FORBIDDEN,
      );
    }
    return partecipante;
  }

  private async contaModeratori(aulaId: string): Promise<number> {
    return this.prisma.partecipante.count({ where: { aulaStudioId: aulaId, moderatore: true } });
  }

  /**
   * Blocco ottimistico: incrementa la versione dell'aula dentro la
   * transazione che sta cambiando l'insieme dei partecipanti. Due gesti
   * concorrenti sullo stesso insieme non possono più credere entrambi di
   * vedere la situazione completa.
   */
  private async confermaVersione(tx: Prisma.TransactionClient, aulaId: string): Promise<void> {
    await tx.aulaStudio.update({
      where: { id: aulaId },
      data: { versione: { increment: 1 } },
    });
  }

  private aulaPerIlClient(
    aula: {
      id: string;
      titolo: string;
      visibilita: string;
      ateneo: string | null;
      dataOraInizio: Date | null;
      gruppoId: string | null;
      creatoIl: Date;
    },
    partecipanti: { utenteId: string; moderatore: boolean }[],
    lettoreId: string,
  ): AulaStudioResponse {
    const io = partecipanti.find((p) => p.utenteId === lettoreId);
    return {
      id: aula.id,
      titolo: aula.titolo,
      visibilita: aula.visibilita as AulaStudioResponse['visibilita'],
      ateneo: aula.ateneo,
      // Assente = estemporanea. Nessuno stato dietro: lo deriva il client.
      dataOraInizio: aula.dataOraInizio?.toISOString() ?? null,
      gruppoId: aula.gruppoId,
      creatoIl: aula.creatoIl.toISOString(),
      partecipanti: partecipanti.length,
      sonoModeratore: io?.moderatore ?? false,
      sonoPartecipante: Boolean(io),
    };
  }

  private materialePerIlClient(materiale: {
    id: string;
    nome: string;
    tipo: string;
    dimensione: number;
    chiave: string;
    argomentoId: string | null;
    caricatoDa: string;
    creatoIl: Date;
  }): AllegatoDiAulaStudioResponse {
    return {
      id: materiale.id,
      nome: materiale.nome,
      tipo: materiale.tipo as TipoAllegato,
      dimensione: materiale.dimensione,
      url: this.archivio.urlDiLettura(materiale.chiave),
      argomentoId: materiale.argomentoId,
      caricatoDa: materiale.caricatoDa,
      creatoIl: materiale.creatoIl.toISOString(),
    };
  }

  private messaggioPerIlClient(
    messaggio: { id: string; testo: string; inviatoIl: Date; autoreId: string },
    autore: { nome: string | null; cognome: string | null; universita: string | null } | undefined,
    lettoreId: string,
  ): MessaggioDiChatResponse {
    return {
      id: messaggio.id,
      testo: messaggio.testo,
      inviatoIl: messaggio.inviatoIl.toISOString(),
      autore: {
        utenteId: messaggio.autoreId,
        nome: autore?.nome ?? null,
        cognome: autore?.cognome ?? null,
        universita: autore?.universita ?? null,
        ...(autore ? {} : { rimosso: true }),
      },
      mio: messaggio.autoreId === lettoreId,
    };
  }

  private invitoPerIlClient(
    invito: {
      id: string;
      aulaStudioId: string;
      destinatario: string;
      stato: string;
      scadeIl: Date;
      emessoIl: Date;
    },
    titoloAula: string,
    partecipanteCreato: boolean,
  ): InvitoResponse {
    return {
      id: invito.id,
      aulaStudioId: invito.aulaStudioId,
      titoloAula,
      destinatario: invito.destinatario,
      stato: invito.stato as InvitoResponse['stato'],
      scadeIl: invito.scadeIl.toISOString(),
      emessoIl: invito.emessoIl.toISOString(),
      partecipanteCreato,
    };
  }
}

function argomentoPerIlClient(argomento: {
  id: string;
  titolo: string;
  testo: string | null;
  creatoIl: Date;
}): ArgomentoResponse {
  return {
    id: argomento.id,
    titolo: argomento.titolo,
    testo: argomento.testo,
    creatoIl: argomento.creatoIl.toISOString(),
  };
}

/** Il tipo si deduce dall'estensione: le regole di B3, di nuovo (AL1). */
function tipoDiFile(nome: string): TipoAllegato {
  const estensione = nome.split('.').pop()?.toLowerCase() ?? '';
  if (estensione === 'pdf') return 'PDF';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(estensione)) return 'IMMAGINE';
  return 'TESTO';
}
