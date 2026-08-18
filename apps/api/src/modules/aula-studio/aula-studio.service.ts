import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AccessoAudiochatResponse,
  AllegatoDiAulaStudioResponse,
  ArgomentoResponse,
  AulaStudioResponse,
  CreaAulaStudioRequest,
  InvitoResponse,
  MaterialeSalvatoResponse,
  MessaggioDiChatResponse,
  ModificaAulaStudioRequest,
  PaginatedResult,
  PartecipanteResponse,
  PermessoAulaStudio,
  ProfiloResponse,
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
  PORTA_AUDIOCHAT,
  type PortaAudiochat,
} from '../../infrastruttura/audiochat/audiochat';
import {
  GRUPPO_ELIMINATO,
  MEMBRO_RIMOSSO,
  RecapitoFattiDelGruppoService,
  type PayloadGruppoEliminato,
  type PayloadMembroRimosso,
} from '../gruppo/recapito-fatti.service';
import { CatalogoService } from '../profilo/catalogo/catalogo.service';
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
import { AvvisiService } from '../avvisi/avvisi.service';
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
    private readonly catalogo: CatalogoService,
    private readonly identita: PortaIdentitaUtente,
    private readonly appartenenza: PortaAppartenenzaGruppo,
    private readonly recapito: RecapitoFattiService,
    private readonly recapitoDelGruppo: RecapitoFattiDelGruppoService,
    @Inject(ARCHIVIO_DI_FILE) private readonly archivio: ArchivioDiFile,
    @Inject(CANALE_EMAIL) private readonly email: CanaleEmail,
    private readonly avvisi: AvvisiService,
    @Inject(TRASPORTO_TEMPO_REALE) private readonly trasporto: TrasportoInTempoReale,
    @Inject(PORTA_AUDIOCHAT) private readonly audiochat: PortaAudiochat,
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
      universitaIdDelCreatore: chiSono.universita?.id ?? null,
    });

    // Un'aula può nascere già collocata (AS9), ma solo in un gruppo di cui chi
    // la crea fa parte **adesso**: la stessa verifica della collocazione
    // successiva, perché è la stessa decisione.
    if (dati.gruppoId) await this.esigiMembroDelGruppo(utenteId, dati.gruppoId);

    // AS2 e AS5 alla nascita: chi crea è moderatore, e un moderatore ha i tre
    // permessi. L'aula nasce già governabile, e non esiste l'istante in cui
    // esiste senza nessuno che possa moderarla.
    const aula = await this.prisma.aulaStudio.create({
      data: {
        titolo: daScrivere.titolo,
        visibilita: daScrivere.visibilita,
        ateneoId: daScrivere.ateneoId,
        dataOraInizio: daScrivere.dataOraInizio,
        ...(dati.gruppoId ? { gruppoId: dati.gruppoId } : {}),
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

    return this.aulaPerIlClient(
      aula,
      aula.partecipanti,
      utenteId,
      await this.nomiDegliAtenei([aula]),
    );
  }

  /**
   * Le aule di cui si è partecipanti, dalla più recente.
   *
   * Con `gruppoId` cambia domanda: **le aule collocate in quel gruppo che
   * questa persona può vedere**, anche quelle in cui non è ancora entrata.
   * Senza, la collocazione non servirebbe a niente — un membro non avrebbe
   * modo di trovare le aule del proprio gruppo, che è la sola ragione per cui
   * un'aula viene collocata.
   *
   * Il titolo per vederle si risolve **adesso** e con le regole di sempre:
   * chi è già partecipante, oppure l'aula è pubblica, oppure è dell'ateneo di
   * chi legge, oppure chi legge è membro del gruppo in cui è collocata. Non è
   * una regola nuova: è la stessa che decide l'ammissione, applicata alla
   * lettura di un elenco.
   */
  async elenca(
    utenteId: string,
    pagina: { page: number; limit: number },
    gruppoId?: string,
  ): Promise<PaginatedResult<AulaStudioResponse>> {
    if (gruppoId) return this.elencaDelGruppo(utenteId, gruppoId, pagina);

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

    // Una domanda sola per l'intera pagina: i nomi degli atenei si risolvono
    // in lotto, come i profili degli autori.
    const nomiAtenei = await this.nomiDegliAtenei(righe);

    return {
      data: righe.map((riga) => this.aulaPerIlClient(riga, riga.partecipanti, utenteId, nomiAtenei)),
      meta: {
        total: totale,
        page: pagina.page,
        limit: pagina.limit,
        totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
      },
    };
  }

  /**
   * Le aule collocate in un gruppo, per chi può vederle.
   *
   * L'appartenenza al gruppo si chiede una volta sola e vale per tutte le aule
   * dell'elenco: è la stessa interrogazione su dato fresco dell'ammissione
   * (IA4), non una copia.
   */
  private async elencaDelGruppo(
    utenteId: string,
    gruppoId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<AulaStudioResponse>> {
    const [membro, chiSono] = await Promise.all([
      this.appartenenza.eAmmessoPerAppartenenza(utenteId, gruppoId),
      this.profilo.perUtente(utenteId),
    ]);

    const visibili: Array<Record<string, unknown>> = [
      { partecipanti: { some: { utenteId } } },
      { visibilita: 'PUBBLICO' },
    ];
    if (chiSono.universita) {
      visibili.push({ visibilita: 'ATENEO', ateneoId: chiSono.universita.id });
    }
    // Chi è del gruppo vede tutte le aule collocate lì, comprese le private:
    // è il titolo che la collocazione gli dà, ed è ciò che rende utile
    // collocare un'aula.
    const dove = membro ? { gruppoId } : { gruppoId, OR: visibili };

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

    const nomiAtenei = await this.nomiDegliAtenei(righe);

    return {
      data: righe.map((riga) => this.aulaPerIlClient(riga, riga.partecipanti, utenteId, nomiAtenei)),
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

    // Quali di questi ho già messo da parte: una lettura sola per l'intera
    // sala, non una per materiale.
    const salvati = new Set(
      (
        await this.prisma.materialeSalvato.findMany({
          where: { utenteId, materialeId: { in: allegati.map((a) => a.id) } },
          select: { materialeId: true },
        })
      ).map((riga) => riga.materialeId),
    );

    const [profili, nomiAtenei] = await Promise.all([
      this.profilo.perUtenti([...new Set(partecipanti.map((p) => p.utenteId))]),
      this.nomiDegliAtenei([aula]),
    ]);
    const io = partecipanti.find((p) => p.utenteId === utenteId);

    /*
     * Chi di loro accetta di essere contattato da chi sta guardando.
     *
     * Si calcola **qui e in lotto**, non una domanda per riga: chi apre una
     * sala pubblica senza esserci dentro vede persone con cui non condivide
     * nulla, ed è l'unico posto del prodotto in cui la contattabilità decide
     * qualcosa. Chi è già in questa aula insieme a chi guarda è «già insieme»
     * per definizione — la sala stessa è lo spazio condiviso.
     */
    const dentroInsieme = Boolean(io);
    const contattabili = await this.profilo.contattabiliDa(
      utenteId,
      partecipanti.map((p) => ({ utenteId: p.utenteId, giaInsieme: dentroInsieme })),
    );

    return {
      aula: this.aulaPerIlClient(aula, partecipanti, utenteId, nomiAtenei),
      partecipanti: partecipanti.map((p) => {
        const profilo = profili.get(p.utenteId);
        const permessi = permessiEffettivi(p);
        return {
          utenteId: p.utenteId,
          nome: profilo?.nome ?? null,
          cognome: profilo?.cognome ?? null,
          universita: profilo?.universita?.nome ?? null,
          foto: profilo?.foto ?? null,
          contattabile: contattabili.get(p.utenteId) ?? false,
          // Senza profilo dietro: account cancellato o in cancellazione.
          ...(profilo ? {} : { rimosso: true }),
          moderatore: p.moderatore,
          permessi,
          solaLettura: eSolaLettura(permessi),
        } satisfies PartecipanteResponse;
      }),
      argomenti: argomenti.map(argomentoPerIlClient),
      allegati: allegati.map((a) => this.materialePerIlClient(a, salvati.has(a.id))),
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
    if (dati.gruppoId) await this.esigiMembroDelGruppo(utenteId, dati.gruppoId);

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

    return this.aulaPerIlClient(
      aggiornata,
      aggiornata.partecipanti,
      utenteId,
      await this.nomiDegliAtenei([aggiornata]),
    );
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
    aula: { id: string; visibilita: string; ateneoId: string | null; gruppoId: string | null },
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

    if (aula.visibilita === 'ATENEO' && aula.ateneoId) {
      const chiSono = await this.profilo.perUtente(utenteId);
      return chiSono.universita?.id === aula.ateneoId;
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

  /**
   * Invita **una persona che si sta guardando**, non un indirizzo.
   *
   * È il gesto che nasce dalla sala di un'aula pubblica: si vede chi c'è, e si
   * chiede a qualcuno di venire nella propria. L'indirizzo lo risolve il
   * server e non torna mai indietro: chi invita non deve sapere con quale email
   * quella persona è iscritta.
   *
   * **Qui la contattabilità si applica davvero**, ed è l'unico posto in cui
   * può farlo senza raccontare niente: chi riceve il rifiuto sta già guardando
   * il destinatario in una sala che ha potuto aprire, quindi sa già che
   * esiste. Sull'invito **per indirizzo** la regola resta inapplicata, e non è
   * una dimenticanza: un rifiuto lì direbbe a chiunque, con un modulo aperto a
   * tutti, se una certa email ha un account su Prome.
   */
  async invitaUtente(
    mittenteId: string,
    aulaId: string,
    destinatarioId: string,
  ): Promise<InvitoResponse> {
    // Lo stesso permesso dell'invito per indirizzo: invitare in un'aula è un
    // gesto di chi la modera, comunque si nomini l'invitato.
    await this.esigiModeratore(mittenteId, aulaId);

    const giaInsieme = await this.giaInsieme(mittenteId, destinatarioId);
    if (!(await this.profilo.puoContattare(mittenteId, destinatarioId, giaInsieme))) {
      throw new AppException(
        AulaStudioErrorCode.NON_CONTATTABILE,
        'AULA_NON_CONTATTABILE',
        HttpStatus.FORBIDDEN,
      );
    }

    const indirizzo = await this.identita.indirizzoDi(destinatarioId);
    if (!indirizzo) {
      throw new AppException(
        AulaStudioErrorCode.NON_CONTATTABILE,
        'AULA_NON_CONTATTABILE',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.invita(mittenteId, aulaId, indirizzo);
  }

  /**
   * «Sono già insieme?», nelle due metà che i due contesti sanno rispondere.
   *
   * Le aule le conosce questo modulo; i gruppi li conosce il Gruppo, e la
   * risposta attraversa il confine come un booleano — quale spazio
   * condividano non entra qui, perché non servirebbe a decidere e sarebbe
   * un'informazione in più da custodire.
   */
  private async giaInsieme(unoId: string, altroId: string): Promise<boolean> {
    const [aulaComune, gruppoComune] = await Promise.all([
      this.prisma.partecipante.findFirst({
        where: { utenteId: unoId, aula: { partecipanti: { some: { utenteId: altroId } } } },
        select: { aulaStudioId: true },
      }),
      this.appartenenza.condividonoUnGruppo(unoId, altroId),
    ]);
    return Boolean(aulaComune) || gruppoComune;
  }

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

    // Se dietro quell'indirizzo c'è già un iscritto, l'avviso lo raggiunge
    // anche sul telefono. Il messaggio non nomina né l'aula né chi invita:
    // quelli si leggono aprendo l'invito, dove le regole valgono ancora.
    await this.avvisi.avvisaIndirizzo(
      invito.destinatario,
      {
        tipo: 'INVITO_AULA',
        risorsaTipo: 'INVITO_AULA',
        risorsaId: invito.id,
        chiaveDeduplicazione: invito.id,
        percorso: `/app/inviti/${invito.id}`,
        titolo: 'notifiche.invito.titolo',
        corpo: 'notifiche.invito.corpo',
      },
      utenteId,
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

  /**
   * Il secondo stato conclusivo di IA1: si risponde di no.
   *
   * **Nessuna prova di onboarding, e non è una dimenticanza.** IA2 la esige
   * per *accettare*, perché è l'accettazione a produrre un partecipante: per
   * rifiutare non nasce niente, e chiederla vorrebbe dire obbligare a
   * completare il profilo chi vuole solo togliersi di torno un invito.
   *
   * **Nessun fatto pubblicato**: a valle non c'è nessuno da avvisare — non
   * nasce un partecipante, e chi ha invitato non riceve una notifica di
   * rifiuto (sarebbe il terzo tipo di avviso, cioè una decisione di prodotto,
   * e per giunta racconterebbe che dietro quell'indirizzo c'è qualcuno).
   * Per questo il controller risponde 200 e non 202: qui non c'è nulla di
   * preso in carico, la risposta è completa quando è scritta.
   */
  async rifiuta(utenteId: string, invitoId: string): Promise<InvitoResponse> {
    const invito = await this.prisma.invito.findUnique({ where: { id: invitoId } });
    if (!invito) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_NOT_FOUND,
        'INVITO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // Vale la stessa regola dell'accettazione: l'invito è rivolto a un
    // indirizzo, e solo quello risponde. Chi ha invitato non può rifiutare al
    // posto dell'invitato — per ritirare un invito servirebbe un altro gesto.
    const mioIndirizzo = await this.identita.indirizzoDi(utenteId);
    if (mioIndirizzo && mioIndirizzo !== invito.destinatario) {
      throw new AppException(
        AulaStudioErrorCode.INVITO_DI_UN_ALTRO,
        'INVITO_DI_UN_ALTRO',
        HttpStatus.FORBIDDEN,
      );
    }

    // IA1: dallo stato iniziale si transita una volta sola. Rifiutare ciò che
    // si è già accettato non è un rifiuto: è uscire dall'aula, e ha il suo
    // gesto.
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

    const aggiornato = await this.prisma.invito.update({
      where: { id: invitoId },
      data: { stato: 'RIFIUTATO', chiusoIl: new Date() },
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

  /**
   * Entra nell'audiochat dell'aula.
   *
   * **Se e solo se** chi chiede ha il Permesso di Parlare, letto **adesso** e
   * non da una copia presa all'ingresso: un permesso revocato mentre la sala
   * è aperta chiude la porta al gesto successivo, come per il caricamento e
   * per la scrittura.
   *
   * Il controllo sta qui, nel modulo che possiede il permesso, e mai nella
   * porta tecnica: una porta che decidesse un'ammissione terrebbe la stessa
   * regola in due posti, e la copia fuori dal contesto sarebbe quella
   * dimenticata.
   *
   * **Non registra nulla.** Nessuna riga, nessuno stato del canale, nessun
   * elenco di chi è entrato: AS8 dice che il dominio possiede il solo
   * Permesso di Parlare, e chi sta parlando lo sa il client dal fornitore.
   * Questo metodo rilascia un lasciapassare e dimentica di averlo fatto.
   */
  async accessoAudiochat(utenteId: string, aulaId: string): Promise<AccessoAudiochatResponse> {
    const partecipante = await this.esigiPartecipante(utenteId, aulaId);
    if (!permessiEffettivi(partecipante).parlare) {
      throw new AppException(
        AulaStudioErrorCode.NON_PUOI_PARLARE,
        'AULA_NON_PUOI_PARLARE',
        HttpStatus.FORBIDDEN,
      );
    }

    const accesso = await this.audiochat.apriCanale({ aulaStudioId: aulaId, utenteId });
    if (!accesso) {
      // RE4: l'audio manca, l'aula no. Il 503 dice al client di mostrare la
      // sala senza la voce, invece di trattarla come rotta.
      throw new AppException(
        AulaStudioErrorCode.AUDIOCHAT_NON_DISPONIBILE,
        'AUDIOCHAT_NON_DISPONIBILE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // PE4 chiede i **minuti-partecipante**, non gli ingressi, e quelli non si
    // contano da qui: la durata la conosce il fornitore, e il dominio non
    // tiene lo stato del canale (AS8). Arriveranno dai suoi webhook, letti
    // dall'unità lavoratrice. Finché non ci sono, la misura manca — ed è
    // scritto, invece di essere sostituito da un conteggio che sembra la
    // stessa cosa e non lo è.
    return accesso;
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

  /**
   * Ciò che questa persona ha fatto nelle aule, per l'esportazione.
   *
   * Le partecipazioni, i materiali che **ha caricato** e i messaggi che **ha
   * scritto**. Non la conversazione intorno: i messaggi degli altri sono loro,
   * e una copia dei propri dati non è una copia della stanza.
   */
  async datiPersonaliDi(utenteId: string) {
    const [partecipazioni, materiali, salvati, messaggi] = await Promise.all([
      this.prisma.partecipante.findMany({
        where: { utenteId },
        orderBy: { ammessoIl: 'asc' },
        include: { aula: { select: { id: true, titolo: true } } },
      }),
      this.prisma.allegatoDiAulaStudio.findMany({
        where: { caricatoDa: utenteId },
        orderBy: { creatoIl: 'asc' },
      }),
      // La propria raccolta: **i nomi dei file che si tenevano da parte**, non
      // i file — quelli sono di chi li ha caricati, e una copia dei propri
      // dati non è una copia della stanza.
      this.prisma.materialeSalvato.findMany({
        where: { utenteId },
        orderBy: { salvatoIl: 'asc' },
        include: { materiale: { select: { nome: true } } },
      }),
      this.prisma.messaggioDiChat.findMany({
        where: { autoreId: utenteId },
        orderBy: { inviatoIl: 'asc' },
      }),
    ]);

    return {
      partecipazioni: partecipazioni.map((partecipante) => ({
        id: partecipante.aula.id,
        titolo: partecipante.aula.titolo,
        moderatore: partecipante.moderatore,
        ammessoIl: partecipante.ammessoIl.toISOString(),
      })),
      materialiCaricati: materiali.map((materiale) => ({
        nome: materiale.nome,
        tipo: materiale.tipo as TipoAllegato,
        dimensione: materiale.dimensione,
        caricatoIl: materiale.creatoIl.toISOString(),
        url: this.archivio.urlDiLettura(materiale.chiave),
      })),
      materialiSalvati: salvati.map((riga) => ({
        nome: riga.materiale.nome,
        salvatoIl: riga.salvatoIl.toISOString(),
      })),
      messaggi: messaggi.map((messaggio) => ({
        id: messaggio.id,
        aulaStudioId: messaggio.aulaStudioId,
        testo: messaggio.testo,
        inviatoIl: messaggio.inviatoIl.toISOString(),
      })),
    };
  }

  // --- La raccolta personale (materiali salvati) -----------------------------

  /**
   * Mette da parte un materiale.
   *
   * **Si salva ciò che si vede**, come si segnala ciò che si vede: la
   * partecipazione all'aula si verifica **adesso** (AL4), non da una copia
   * presa all'ingresso. Un materiale di un'aula in cui non si è più dentro non
   * si può mettere da parte, e uno già messo da parte smette di comparire —
   * senza che la riga sparisca, perché rientrando torna.
   *
   * **Salvare due volte non è un errore**: la chiave primaria composta lo
   * rende un'operazione senza effetto, come aggiungere due volte lo stesso
   * membro a un gruppo (G3).
   */
  async salvaMateriale(utenteId: string, materialeId: string): Promise<void> {
    const materiale = await this.materialeVisibilePer(utenteId, materialeId);

    await this.prisma.materialeSalvato.upsert({
      where: { utenteId_materialeId: { utenteId, materialeId: materiale.id } },
      create: { utenteId, materialeId: materiale.id },
      update: {},
    });
  }

  /** Toglie dalla raccolta. Idempotente: senza riga non c'è niente da fare. */
  async dimenticaMateriale(utenteId: string, materialeId: string): Promise<void> {
    await this.prisma.materialeSalvato.deleteMany({ where: { utenteId, materialeId } });
  }

  /**
   * La raccolta di chi legge, dalla più recente.
   *
   * **La visibilità si risolve in lettura**, come per la bacheca: si tengono
   * solo i materiali delle aule di cui si fa ancora parte. Chi esce da
   * un'aula smette di vederne i materiali salvati; se rientra li ritrova, e
   * questo è il motivo per cui uscire non cancella le righe.
   */
  async elencaMaterialiSalvati(
    utenteId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<MaterialeSalvatoResponse>> {
    const aule = (
      await this.prisma.partecipante.findMany({ where: { utenteId }, select: { aulaStudioId: true } })
    ).map((p) => p.aulaStudioId);

    const dove = { utenteId, materiale: { aulaStudioId: { in: aule } } };

    const [totale, righe] = await Promise.all([
      this.prisma.materialeSalvato.count({ where: dove }),
      this.prisma.materialeSalvato.findMany({
        where: dove,
        orderBy: { salvatoIl: 'desc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
        include: { materiale: true },
      }),
    ]);

    // Il materiale riferisce la propria aula per identificativo e non per
    // relazione: i titoli si risolvono in lotto, come i nomi degli atenei.
    const titoli = new Map(
      (
        await this.prisma.aulaStudio.findMany({
          where: { id: { in: [...new Set(righe.map((riga) => riga.materiale.aulaStudioId))] } },
          select: { id: true, titolo: true },
        })
      ).map((aula) => [aula.id, aula.titolo]),
    );

    return {
      data: righe.map((riga) => ({
        materiale: this.materialePerIlClient(riga.materiale, true),
        aulaStudioId: riga.materiale.aulaStudioId,
        titoloAula: titoli.get(riga.materiale.aulaStudioId) ?? '',
        salvatoIl: riga.salvatoIl.toISOString(),
      })),
      meta: {
        total: totale,
        page: pagina.page,
        limit: pagina.limit,
        totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
      },
    };
  }

  /**
   * Il materiale, se chi legge è dentro l'aula che lo contiene.
   *
   * Materiale inesistente e materiale di un'aula in cui non si è dentro danno
   * la **stessa** risposta, come per un post non visibile: dire «esiste ma non
   * puoi» racconta comunque che esiste.
   */
  private async materialeVisibilePer(utenteId: string, materialeId: string) {
    const materiale = await this.prisma.allegatoDiAulaStudio.findUnique({
      where: { id: materialeId },
    });
    const dentro =
      materiale &&
      (await this.prisma.partecipante.findUnique({
        where: {
          aulaStudioId_utenteId: { aulaStudioId: materiale.aulaStudioId, utenteId },
        },
      }));

    if (!materiale || !dentro) {
      throw new AppException(
        AulaStudioErrorCode.ALLEGATO_NOT_FOUND,
        'AULA_ALLEGATO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return materiale;
  }

  // --- Interni --------------------------------------------------------------

  /**
   * Chi colloca un'aula in un gruppo dev'essere membro di quel gruppo, adesso.
   *
   * Altrimenti aprirebbe la propria aula a uno spazio di cui non fa parte, e i
   * membri di quello spazio ci entrerebbero senza che nessuno di loro l'abbia
   * chiesto. Sta in un posto solo perché la decisione è la stessa alla
   * creazione e alla modifica.
   */
  private async esigiMembroDelGruppo(utenteId: string, gruppoId: string): Promise<void> {
    if (await this.appartenenza.eAmmessoPerAppartenenza(utenteId, gruppoId)) return;
    throw new AppException(
      AulaStudioErrorCode.COLLOCAZIONE_NEGATA,
      'AULA_COLLOCAZIONE_NEGATA',
      HttpStatus.FORBIDDEN,
    );
  }

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
      if (aula.ateneoId && chiSono.universita?.id === aula.ateneoId) return aula;
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

  /**
   * I nomi degli atenei congelati in queste aule, in una domanda sola.
   *
   * L'ateneo dell'aula è un identificativo (AS7), ma a schermo è una
   * pastiglia con un nome: la traduzione la chiede il catalogo, che sta in
   * Profilo — il contesto che questo modulo già importa.
   */
  private nomiDegliAtenei(aule: { ateneoId: string | null }[]): Promise<Map<string, string>> {
    return this.catalogo.nomiDiAtenei(aule.map((aula) => aula.ateneoId).filter(Boolean) as string[]);
  }

  /**
   * L'aula per il client.
   *
   * `nomiAtenei` è **obbligatorio** e non ha un valore di ripiego: l'aula
   * conserva l'identificativo dell'ateneo, e chi la mostra deve averne
   * risolto il nome. Un parametro facoltativo qui produrrebbe elenchi con la
   * pastiglia dell'ateneo vuota senza che nessun errore lo segnali.
   */
  private aulaPerIlClient(
    aula: {
      id: string;
      titolo: string;
      visibilita: string;
      ateneoId: string | null;
      dataOraInizio: Date | null;
      gruppoId: string | null;
      creatoIl: Date;
    },
    partecipanti: { utenteId: string; moderatore: boolean }[],
    lettoreId: string,
    nomiAtenei: Map<string, string>,
  ): AulaStudioResponse {
    const io = partecipanti.find((p) => p.utenteId === lettoreId);
    return {
      id: aula.id,
      titolo: aula.titolo,
      visibilita: aula.visibilita as AulaStudioResponse['visibilita'],
      ateneo: aula.ateneoId ? (nomiAtenei.get(aula.ateneoId) ?? null) : null,
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
  }, salvato?: boolean): AllegatoDiAulaStudioResponse {
    return {
      id: materiale.id,
      nome: materiale.nome,
      tipo: materiale.tipo as TipoAllegato,
      dimensione: materiale.dimensione,
      url: this.archivio.urlDiLettura(materiale.chiave),
      argomentoId: materiale.argomentoId,
      caricatoDa: materiale.caricatoDa,
      creatoIl: materiale.creatoIl.toISOString(),
      ...(salvato === undefined ? {} : { salvato }),
    };
  }

  private messaggioPerIlClient(
    messaggio: { id: string; testo: string; inviatoIl: Date; autoreId: string },
    autore: ProfiloResponse | undefined,
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
        universita: autore?.universita?.nome ?? null,
        foto: autore?.foto ?? null,
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
