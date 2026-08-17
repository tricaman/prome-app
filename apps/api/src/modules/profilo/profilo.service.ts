import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DIMENSIONE_MASSIMA_FOTO_PROFILO,
  type AggiornaImpostazioniPrivacyRequest,
  type BloccatoResponse,
  type CompletaProfiloRequest,
  type PaginatedResult,
  type PreautorizzaAllegatoResponse,
  type ProfiloResponse,
} from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions';
import {
  ARCHIVIO_DI_FILE,
  chiaveFotoProfilo,
  type ArchivioDiFile,
} from '../../infrastruttura/archivio-file/archivio-file';
import { ProfiloErrorCode } from './constants/error-codes';
import { perIlClientCorso, perIlClientUniversita } from './catalogo/catalogo.service';
import { emettiProvaOnboarding, type ProvaOnboardingCompletato } from './prova-onboarding';

/**
 * Il profilo non si legge mai senza il proprio corso: da lì discendono
 * l'ateneo e quindi tutte le decisioni di visibilità. Una lettura che lo
 * dimenticasse restituirebbe una persona senza università, cioè una persona
 * che non vede più niente del proprio ateneo — in silenzio.
 */
const CON_CORSO = {
  impostazioniPrivacy: true,
  corso: { include: { universita: true, classe: true } },
} as const;

/**
 * Bounded context PROFILO — l'identità accademica dell'utente.
 *
 * Possiede due aggregati che nascono e muoiono insieme: il Profilo e le sue
 * Impostazioni di privacy. Non conosce account, sessioni o provider: riceve un
 * identificativo già tradotto da PortaIdentitàUtente.
 */
@Injectable()
export class ProfiloService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ARCHIVIO_DI_FILE) private readonly archivio: ArchivioDiFile,
  ) {}

  /**
   * Il profilo di chi ha appena fatto il primo ingresso, creandolo se manca.
   *
   * Profilo e Impostazioni di privacy nascono **nella stessa scrittura**: fra
   * le due non deve esistere un istante in cui il profilo c'è e le sue regole
   * di privacy no, perché in quell'istante non si saprebbe chi può vedere
   * cosa. Le impostazioni partono dal valore più chiuso.
   *
   * Il profilo può esistere con l'onboarding non completato: è la condizione
   * normale fra il primo ingresso e la compilazione dei quattro dati.
   *
   * È idempotente: al secondo ingresso non crea niente e ritorna quello che
   * c'è. Chiamarla a ogni verifica del codice è quindi corretto e non costa
   * una riga in più.
   */
  async assicuraEsistenza(utenteId: string): Promise<ProfiloResponse> {
    const profilo = await this.prisma.profilo.upsert({
      where: { utenteId },
      // L'upsert non tocca nulla se il profilo c'è già: aggiornare qui
      // vorrebbe dire sovrascrivere dati veri a ogni accesso.
      update: {},
      create: {
        utenteId,
        impostazioniPrivacy: { create: {} },
        // Le preferenze di notifica nascono con il profilo, come le regole di
        // privacy: una domanda che si pone al recapito deve avere sempre una
        // risposta. Partono **accese**, al contrario della privacy — un avviso
        // che non arriva non espone nulla, ma un prodotto che non avvisa mai
        // sembra morto.
        preferenzeNotifiche: { create: {} },
      },
      include: CON_CORSO,
    });

    return this.perIlClient(profilo);
  }

  /** Il profilo di chi sta chiedendo. Se non c'è, non c'è: non lo si inventa qui. */
  async perUtente(utenteId: string): Promise<ProfiloResponse> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      include: CON_CORSO,
    });

    if (!profilo) {
      throw new AppException(
        ProfiloErrorCode.NOT_FOUND,
        'PROFILO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        { utenteId },
      );
    }

    return this.perIlClient(profilo);
  }

  /**
   * Completamento dell'onboarding.
   *
   * I dati arrivano insieme perché insieme definiscono la condizione:
   * l'onboarding è completo **se e solo se** nome, cognome e corso sono
   * valorizzati. Non esiste un completamento parziale, quindi non esiste un
   * endpoint che ne aggiorni uno solo.
   *
   * L'università non si manda e non si scrive: il corso appartiene già a un
   * ateneo. Mandarli entrambi vorrebbe dire dover respingere la coppia
   * incoerente — un errore che così non può esistere.
   *
   * Il catalogo è **chiuso**: un corso che non c'è non si sceglie, e il
   * rifiuto distingue i due casi perché a chi lo riceve dicono cose diverse —
   * «quel corso non esiste» e «quel corso non si offre più».
   */
  async completaOnboarding(
    utenteId: string,
    dati: CompletaProfiloRequest,
  ): Promise<ProfiloResponse> {
    // Che il profilo esista è responsabilità del primo ingresso: se manca qui,
    // manca davvero, e crearlo di nascosto nasconderebbe il difetto.
    await this.perUtente(utenteId);

    const corso = await this.prisma.corso.findUnique({
      where: { id: dati.corsoId },
      select: { id: true, attivo: true },
    });
    if (!corso) {
      throw new AppException(
        ProfiloErrorCode.CORSO_NON_TROVATO,
        'CORSO_NON_TROVATO',
        HttpStatus.NOT_FOUND,
        { corsoId: dati.corsoId },
      );
    }
    // Un corso ritirato non si sceglie più, ma chi l'aveva già scelto se lo
    // tiene: la verifica è qui, alla scelta, non sulla lettura del profilo.
    if (!corso.attivo) {
      throw new AppException(
        ProfiloErrorCode.CORSO_NON_ATTIVO,
        'CORSO_NON_ATTIVO',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { corsoId: dati.corsoId },
      );
    }

    const profilo = await this.prisma.profilo.update({
      where: { utenteId },
      data: {
        nome: dati.nome.trim(),
        cognome: dati.cognome.trim(),
        corsoId: corso.id,
        onboardingCompletato: true,
      },
      include: CON_CORSO,
    });

    return this.perIlClient(profilo);
  }

  /**
   * Cambia le regole di privacy: l'unico gesto che le tocca (IP4).
   *
   * Si aggiornano **solo gli assi indicati**, ed è ciò che rende vero IP2 senza
   * doverselo ricordare: l'asse omesso resta al valore che aveva, e non esiste
   * lo stato «non impostato». I due assi non si vincolano a vicenda (IP3), per
   * cui qui non c'è alcuna regola di coerenza da applicare — ogni combinazione
   * è legittima, e introdurne una reintrodurrebbe il «livello di privacy» che
   * il modello ha rifiutato.
   *
   * Non emette alcun evento: se nessun altro le modifica, non c'è nulla da
   * propagare — e una decisione di privacy replicata sarebbe una decisione
   * presa su un dato vecchio. Chi deve saperle le interroga alla lettura, che
   * è anche il motivo per cui il cambio vale subito, senza finestra (SE2).
   */
  async aggiornaImpostazioni(
    utenteId: string,
    dati: AggiornaImpostazioniPrivacyRequest,
  ): Promise<ProfiloResponse> {
    if (!dati.contattabilita && !dati.visibilita) {
      throw new AppException(
        ProfiloErrorCode.PRIVACY_SENZA_MODIFICHE,
        'PRIVACY_SENZA_MODIFICHE',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Che il profilo esista è responsabilità del primo ingresso; le
    // impostazioni nascono con lui, quindi qui c'è sempre qualcosa da
    // aggiornare (IP1).
    await this.perUtente(utenteId);

    const profilo = await this.prisma.profilo.update({
      where: { utenteId },
      data: {
        impostazioniPrivacy: {
          update: {
            ...(dati.contattabilita ? { contattabilita: dati.contattabilita } : {}),
            ...(dati.visibilita ? { visibilita: dati.visibilita } : {}),
          },
        },
      },
      include: CON_CORSO,
    });

    return this.perIlClient(profilo);
  }

  /**
   * La prova che questo Utente ha completato l'onboarding.
   *
   * La emette Profilo perché è Profilo a possedere il fatto: la Bacheca non
   * potrebbe verificarlo, e infatti non lo verifica — esige la prova (B6).
   * Se l'onboarding non è completo la prova non esiste, e il chiamante non ha
   * un valore mancante da gestire: ha un errore.
   */
  async provaDiOnboarding(utenteId: string): Promise<ProvaOnboardingCompletato> {
    const profilo = await this.perUtente(utenteId);
    if (!profilo.onboardingCompletato) {
      throw new AppException(
        ProfiloErrorCode.ONBOARDING_INCOMPLETO,
        'ONBOARDING_INCOMPLETO',
        HttpStatus.FORBIDDEN,
      );
    }
    return emettiProvaOnboarding(utenteId);
  }

  /**
   * Gli autori i cui contenuti questo lettore può vedere adesso.
   *
   * È la traduzione in elenco della regola di visibilità, risolta **al momento
   * della lettura**: chi cambia le proprie impostazioni le vede valere subito
   * su tutto ciò che ha già pubblicato.
   *
   * - `PUBBLICO` → tutti gli iscritti a Prome, mai il web;
   * - `ATENEO`   → chi ha dichiarato la stessa università;
   * - `PRIVATO`  → nessuno, oltre all'autore stesso.
   *
   * Sé stessi si vede sempre: le impostazioni dicono chi *altro* vede i tuoi
   * contenuti, non se li vedi tu.
   */
  async autoriVisibiliA(lettore: ProfiloResponse): Promise<string[]> {
    const condizioni: Array<Record<string, unknown>> = [
      { impostazioniPrivacy: { visibilita: 'PUBBLICO' } },
    ];
    if (lettore.universita) {
      // L'ateneo si attraversa dal corso, che è l'unico riferimento del
      // profilo: il confronto è fra identificativi, non fra nomi scritti a
      // mano in momenti diversi — che è ciò che prima falliva in silenzio.
      condizioni.push({
        corso: { universitaId: lettore.universita.id },
        impostazioniPrivacy: { visibilita: 'ATENEO' },
      });
    }

    // Il blocco è la stessa domanda con il segno opposto — «chi NON voglio
    // vedere, e chi non vuole essere visto da me» — e si risponde qui, nello
    // stesso punto della privacy, in entrambe le direzioni. Vince su ogni
    // impostazione: un profilo PUBBLICO bloccato non è visibile.
    const coppie = await this.coppieBloccateCon(lettore.utenteId);

    const visibili = await this.prisma.profilo.findMany({
      // Chi è in cancellazione «scompare subito» (grazia di 14 giorni): il
      // profilo esiste ancora — la riattivazione deve trovarlo intatto — ma
      // nessuna lettura lo espone più.
      where: {
        OR: condizioni,
        inCancellazioneDal: null,
        ...(coppie.length ? { utenteId: { notIn: coppie } } : {}),
      },
      select: { utenteId: true },
    });

    // Sé stessi DOPO la sottrazione: nessun blocco può togliere una persona
    // dalla vista dei propri contenuti.
    return [...new Set([lettore.utenteId, ...visibili.map((v) => v.utenteId)])];
  }

  /** Più profili in un colpo solo: evita una query per ogni post letto. */
  async perUtenti(utenteIds: string[]): Promise<Map<string, ProfiloResponse>> {
    if (!utenteIds.length) return new Map();

    const profili = await this.prisma.profilo.findMany({
      // Il filtro fa sparire subito anche il nome nei commenti di chi è in
      // grazia: il client mostra «Utente rimosso». L'identificativo resta nel
      // payload durante la grazia — era già pubblico prima, e se la grazia
      // finisce lo stacca l'anonimizzazione.
      where: { utenteId: { in: utenteIds }, inCancellazioneDal: null },
      include: CON_CORSO,
    });

    return new Map(profili.map((p) => [p.utenteId, this.perIlClient(p)]));
  }

  // --- Blocchi ---------------------------------------------------------------

  /**
   * Blocca una persona. Idempotente per chiave primaria (stile G3): bloccare
   * due volte è un'operazione senza effetto, non un errore.
   *
   * Il bersaglio deve esistere: `perUtente` lancia PR001 dal suo punto
   * sancito, e un id `anonimo-` — che un profilo non l'ha mai avuto — cade
   * nello stesso modo. Bloccare chi è in grazia di cancellazione è invece
   * legittimo: se torna, il blocco lo aspetta; se la catena finisce, la
   * cascata porta via la riga.
   */
  async blocca(bloccanteId: string, bloccatoId: string): Promise<void> {
    if (bloccanteId === bloccatoId) {
      throw new AppException(
        ProfiloErrorCode.BLOCCO_DI_SE_STESSI,
        'BLOCCO_NON_VALIDO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.esisteProfilo(bloccatoId);

    await this.prisma.blocco.upsert({
      where: { bloccanteId_bloccatoId: { bloccanteId, bloccatoId } },
      create: { bloccanteId, bloccatoId },
      update: {},
    });
  }

  /** Sblocca. Idempotente: togliere un blocco che non c'è non è un errore. */
  async sblocca(bloccanteId: string, bloccatoId: string): Promise<void> {
    await this.prisma.blocco.deleteMany({ where: { bloccanteId, bloccatoId } });
  }

  /**
   * Chi ho bloccato, con il nome fresco: è la lista da cui si torna indietro.
   * Chi nel frattempo è entrato in grazia di cancellazione compare come
   * «rimosso» — il nome non si mostra più, ma la riga resta sbloccabile.
   */
  async bloccati(
    utenteId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<BloccatoResponse>> {
    const [righe, totale] = await Promise.all([
      this.prisma.blocco.findMany({
        where: { bloccanteId: utenteId },
        orderBy: { creatoIl: 'desc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
      }),
      this.prisma.blocco.count({ where: { bloccanteId: utenteId } }),
    ]);

    const profili = await this.perUtenti(righe.map((riga) => riga.bloccatoId));
    return {
      data: righe.map((riga) => {
        const profilo = profili.get(riga.bloccatoId);
        return {
          utenteId: riga.bloccatoId,
          nome: profilo?.nome ?? null,
          cognome: profilo?.cognome ?? null,
          bloccatoIl: riga.creatoIl.toISOString(),
          ...(profilo ? {} : { rimosso: true as const }),
        };
      }),
      meta: {
        total: totale,
        page: pagina.page,
        limit: pagina.limit,
        totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
      },
    };
  }

  /**
   * Le due direzioni insieme: chi ho bloccato e chi ha bloccato me. È
   * l'insieme che la visibilità sottrae, e si interroga **fresco a ogni
   * lettura** come le impostazioni di privacy — una copia sarebbe una
   * decisione presa su un dato vecchio.
   */
  async coppieBloccateCon(utenteId: string): Promise<string[]> {
    const righe = await this.prisma.blocco.findMany({
      where: { OR: [{ bloccanteId: utenteId }, { bloccatoId: utenteId }] },
      select: { bloccanteId: true, bloccatoId: true },
    });
    return righe.map((riga) =>
      riga.bloccanteId === utenteId ? riga.bloccatoId : riga.bloccanteId,
    );
  }

  /** C'è un blocco fra i due, in una direzione qualunque? Per gli avvisi. */
  async esisteBloccoFra(unoId: string, altroId: string): Promise<boolean> {
    const conteggio = await this.prisma.blocco.count({
      where: {
        OR: [
          { bloccanteId: unoId, bloccatoId: altroId },
          { bloccanteId: altroId, bloccatoId: unoId },
        ],
      },
    });
    return conteggio > 0;
  }

  /** Esiste un profilo con questo id? PR001 altrimenti, dal punto sancito. */
  private async esisteProfilo(utenteId: string): Promise<void> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      select: { utenteId: true },
    });
    if (!profilo) {
      throw new AppException(ProfiloErrorCode.NOT_FOUND, 'PROFILO_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
  }

  // --- Cancellazione dell'account (V5) --------------------------------------
  //
  // La sorte dei dati di Profilo la decide Profilo: la catena di cancellazione
  // orchestra e verifica, ma elimina attraverso questi metodi.

  /** Apre la grazia: il profilo scompare dalle letture senza essere toccato. */
  async segnaInCancellazione(utenteId: string): Promise<void> {
    // updateMany e non update: se il profilo non c'è (utente mai entrato
    // davvero) non è un errore, e la ri-asserzione del worker è idempotente.
    await this.prisma.profilo.updateMany({
      where: { utenteId, inCancellazioneDal: null },
      data: { inCancellazioneDal: new Date() },
    });
  }

  /** Chiude la grazia al rientro: l'account torna con tutto com'era. */
  async annullaCancellazione(utenteId: string): Promise<void> {
    await this.prisma.profilo.updateMany({
      where: { utenteId },
      data: { inCancellazioneDal: null },
    });
  }

  // --- Chi può contattare chi (IP «contattabilita») --------------------------

  /**
   * Chi di questi si lascia contattare da chi chiede, adesso.
   *
   * **La regola vive qui una volta sola** perché è una decisione di privacy, e
   * le decisioni di privacy le possiede Profilo. Chi la applica — oggi l'Aula
   * studio, domani chiunque abbia un gesto rivolto a una persona — chiede, non
   * riscrive.
   *
   * `giaInsieme` **lo dichiara chi chiama**, e non è una scorciatoia: «Privato»
   * significa «solo chi è già nei tuoi gruppi o nelle tue aule», e Profilo non
   * conosce né gli uni né le altre — chiederglielo sarebbe la dipendenza che la
   * Context Map vieta. Chi possiede gli spazi sa rispondere; Profilo sa cosa
   * farne.
   *
   * I tre livelli, e sopra a tutti il blocco:
   *
   * - **bloccati in una delle due direzioni** → mai, qualunque livello. È la
   *   stessa regola della bacheca, con lo stesso segno.
   * - **Pubblico** → chiunque sia iscritto a Prome.
   * - **Ateneo** → chi studia nello stesso ateneo, più chi è già insieme:
   *   restringere anche quest'ultimo caso vorrebbe dire non poter più scrivere
   *   a una persona con cui si condivide un'aula da mesi.
   * - **Privato** → solo chi è già insieme.
   */
  async contattabiliDa(
    mittenteId: string,
    destinatari: Array<{ utenteId: string; giaInsieme: boolean }>,
  ): Promise<Map<string, boolean>> {
    const esito = new Map<string, boolean>();
    if (!destinatari.length) return esito;

    const [mittente, profili, bloccati] = await Promise.all([
      this.perUtente(mittenteId).catch(() => null),
      this.prisma.profilo.findMany({
        where: { utenteId: { in: destinatari.map((d) => d.utenteId) } },
        include: { impostazioniPrivacy: true, corso: { select: { universitaId: true } } },
      }),
      this.coppieBloccateCon(mittenteId),
    ]);

    const perUtente = new Map(profili.map((profilo) => [profilo.utenteId, profilo]));
    const bloccatiSet = new Set(bloccati);

    for (const destinatario of destinatari) {
      const profilo = perUtente.get(destinatario.utenteId);
      // Chi non ha un profilo — o è in cancellazione — non si contatta: non
      // c'è nessuno dall'altra parte.
      if (!profilo || profilo.inCancellazioneDal || bloccatiSet.has(destinatario.utenteId)) {
        esito.set(destinatario.utenteId, false);
        continue;
      }
      // Sé stessi non è un caso: nessun gesto di contatto è rivolto a sé.
      if (destinatario.utenteId === mittenteId) {
        esito.set(destinatario.utenteId, false);
        continue;
      }

      const livello = profilo.impostazioniPrivacy?.contattabilita ?? 'PRIVATO';
      const stessoAteneo = Boolean(
        mittente?.universita?.id && profilo.corso?.universitaId === mittente.universita.id,
      );

      esito.set(
        destinatario.utenteId,
        livello === 'PUBBLICO' ||
          (livello === 'ATENEO' && (stessoAteneo || destinatario.giaInsieme)) ||
          (livello === 'PRIVATO' && destinatario.giaInsieme),
      );
    }

    return esito;
  }

  /** Lo stesso giudizio per una persona sola. */
  async puoContattare(
    mittenteId: string,
    destinatarioId: string,
    giaInsieme: boolean,
  ): Promise<boolean> {
    const esito = await this.contattabiliDa(mittenteId, [
      { utenteId: destinatarioId, giaInsieme },
    ]);
    return esito.get(destinatarioId) ?? false;
  }

  // --- La foto del profilo --------------------------------------------------

  /**
   * Autorizza il caricamento di una foto e prenota la sua chiave.
   *
   * Stessi tre tempi degli allegati — si dichiara, si caricano i byte
   * **diritti all'archivio**, si conferma — perché è lo stesso problema: far
   * transitare l'immagine dall'API significherebbe pagarne la banda due volte.
   *
   * La chiave prenotata sta **sulla riga del profilo** e non in una tabella di
   * prenotazioni: la foto è una sola, quindi la seconda pre-autorizzazione
   * sovrascrive la prima e non resta niente da ripulire. È anche ciò che rende
   * verificabile la conferma — si accetta solo la chiave emessa per questa
   * persona.
   */
  async preautorizzaFoto(
    utenteId: string,
    dati: { nome: string; dimensione: number },
  ): Promise<PreautorizzaAllegatoResponse & { chiave: string }> {
    // Il peso si verifica **prima** di spendere banda, come per gli allegati:
    // cinque megabyte caricati per intero e poi rifiutati sono cinque
    // megabyte di dati mobili di qualcun altro.
    if (dati.dimensione <= 0 || dati.dimensione > DIMENSIONE_MASSIMA_FOTO_PROFILO) {
      throw new AppException(
        ProfiloErrorCode.FOTO_NON_VALIDA,
        'FOTO_NON_VALIDA',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { massimo: DIMENSIONE_MASSIMA_FOTO_PROFILO },
      );
    }

    const chiave = chiaveFotoProfilo(randomUUID(), dati.nome);
    await this.prisma.profilo.update({
      where: { utenteId },
      data: { fotoChiaveInAttesa: chiave },
    });

    const preautorizzazione = await this.archivio.preautorizzaCaricamento(chiave, 'IMMAGINE');
    return { chiave, ...preautorizzazione, scadeIl: preautorizzazione.scadeIl.toISOString() };
  }

  /**
   * Adotta la foto caricata.
   *
   * Due verifiche, e nessuna è di forma: la chiave dev'essere **quella
   * prenotata da questa persona** (altrimenti si adotterebbe il file di
   * chiunque, indovinando un indirizzo) e i byte devono essere davvero
   * arrivati (altrimenti il profilo mostrerebbe un'immagine rotta, che è
   * peggio delle iniziali).
   *
   * La foto precedente si toglie **dopo** che la nuova è al suo posto: se
   * l'archivio non risponde resta un file orfano, e un file orfano è meno
   * grave di un profilo senza ritratto per un errore di rete.
   */
  async confermaFoto(utenteId: string, chiave: string): Promise<ProfiloResponse> {
    const profilo = await this.prisma.profilo.findUnique({ where: { utenteId } });
    if (!profilo) {
      throw new AppException(ProfiloErrorCode.NOT_FOUND, 'PROFILO_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!profilo.fotoChiaveInAttesa || profilo.fotoChiaveInAttesa !== chiave) {
      throw new AppException(
        ProfiloErrorCode.FOTO_CHIAVE_SCONOSCIUTA,
        'FOTO_CHIAVE_SCONOSCIUTA',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!(await this.archivio.eStatoCaricato(chiave))) {
      throw new AppException(
        ProfiloErrorCode.FOTO_NON_CARICATA,
        'FOTO_NON_CARICATA',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const precedente = profilo.fotoChiave;
    const aggiornato = await this.prisma.profilo.update({
      where: { utenteId },
      data: { fotoChiave: chiave, fotoChiaveInAttesa: null },
      include: CON_CORSO,
    });

    if (precedente && precedente !== chiave) await this.togliDallArchivio(precedente);
    return this.perIlClient(aggiornato);
  }

  /**
   * Toglie la foto: si torna alle iniziali, che non sono uno stato incompleto.
   *
   * Idempotente: senza foto non c'è niente da fare, non un errore.
   */
  async rimuoviFoto(utenteId: string): Promise<ProfiloResponse> {
    const profilo = await this.prisma.profilo.findUnique({ where: { utenteId } });
    if (!profilo) {
      throw new AppException(ProfiloErrorCode.NOT_FOUND, 'PROFILO_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const aggiornato = await this.prisma.profilo.update({
      where: { utenteId },
      data: { fotoChiave: null, fotoChiaveInAttesa: null },
      include: CON_CORSO,
    });

    if (profilo.fotoChiave) await this.togliDallArchivio(profilo.fotoChiave);
    return this.perIlClient(aggiornato);
  }

  /** Un archivio che non risponde non deve far fallire ciò che è già scritto. */
  private async togliDallArchivio(chiave: string): Promise<void> {
    await this.archivio.rimuovi(chiave).catch(() => undefined);
  }

  /**
   * Eliminazione dei dati personali (V5): Profilo e Impostazioni di privacy
   * cadono insieme — la cascata è nello schema. Idempotente: a zero righe non
   * c'è niente da fare, non un errore.
   *
   * **La foto se ne va con la riga**, e qui è l'opposto degli allegati dei
   * post: quelli restano dietro un autore anonimizzato perché sono contenuti,
   * questo è il ritratto di una persona e non c'è nessuno dietro cui possa
   * restare. La chiave si legge **prima** di eliminare — dopo, non saprebbe
   * dirla più nessuno.
   */
  async eliminaDatiDi(utenteId: string): Promise<void> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      select: { fotoChiave: true, fotoChiaveInAttesa: true },
    });

    await this.prisma.profilo.deleteMany({ where: { utenteId } });

    // Anche quella in attesa: dei byte caricati e mai confermati restano
    // comunque la foto di questa persona.
    for (const chiave of [profilo?.fotoChiave, profilo?.fotoChiaveInAttesa]) {
      if (chiave) await this.togliDallArchivio(chiave);
    }
  }

  /**
   * Verifica del residuo (SE3): quante righe portano ancora questo id.
   *
   * >>> PUNTO DA AGGIORNARE A OGNI NUOVA TABELLA DI QUESTO SCHEMA <<<
   * Dispositivi e preferenze cadono in cascata con il profilo, ma vanno
   * **contati lo stesso**: una verifica che non guarda una tabella dichiara
   * «totale» senza esserlo, ed è il difetto peggiore possibile qui.
   */
  async contaResiduiDi(utenteId: string): Promise<number> {
    // Il catalogo accademico NON si conta e non si tocca: nessuna delle sue
    // righe porta un utenteId — è l'elenco degli atenei d'Italia, non un dato
    // di questa persona. Cancellare un corso perché l'ultimo iscritto se ne va
    // sarebbe la stessa cosa che chiudere l'università.
    const [profili, impostazioni, preferenze, dispositivi, notifiche] = await Promise.all([
      this.prisma.profilo.count({ where: { utenteId } }),
      this.prisma.impostazioniDiPrivacy.count({ where: { utenteId } }),
      this.prisma.preferenzeDiNotifica.count({ where: { utenteId } }),
      this.prisma.dispositivoDiNotifica.count({ where: { utenteId } }),
      this.prisma.notifica.count({ where: { destinatarioId: utenteId } }),
    ]);
    return profili + impostazioni + preferenze + dispositivi + notifiche;
  }

  /**
   * I dati personali di questo utente, per l'esportazione (§«Scarica i tuoi
   * dati» della privacy policy).
   *
   * Li descrive Profilo perché è Profilo a possederli — la stessa regola per
   * cui è Profilo a saperli cancellare. L'elenco dei detentori che esportano è
   * lo stesso che deve cancellare: uno che sapesse fare solo una delle due
   * produrrebbe una copia incompleta, o un residuo.
   */
  async datiPersonaliDi(utenteId: string): Promise<{
    nome: string | null;
    cognome: string | null;
    universita: string | null;
    corso: { nome: string; codiceCorso: string; classe: string; durataAnni: number } | null;
    onboardingCompletato: boolean;
    impostazioniPrivacy: { contattabilita: string; visibilita: string };
    preferenzeDiNotifica: { commenti: boolean; inviti: boolean };
    foto: string | null;
    dispositiviRegistrati: Array<{ piattaforma: string; registratoIl: Date }>;
    notifiche: Array<{ tipo: string; letta: boolean; ricevutaIl: Date }>;
    bloccati: Array<{ utenteId: string; bloccatoIl: Date }>;
  } | null> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      include: {
        ...CON_CORSO,
        preferenzeNotifiche: true,
        dispositivi: true,
        notifiche: { orderBy: { creatoIl: 'desc' } },
        blocchiFatti: true,
      },
    });
    if (!profilo) return null;

    const perIlClient = this.perIlClient(profilo);
    return {
      nome: perIlClient.nome,
      cognome: perIlClient.cognome,
      // Il corso per esteso, mai il suo identificativo: una copia dei propri
      // dati deve restare leggibile da sola, mesi dopo, senza il catalogo
      // accanto per tradurre un uuid.
      // L'indirizzo della propria foto, firmato al momento dell'esportazione
      // come per gli allegati: scaduto, si riscarica la copia.
      foto: perIlClient.foto,
      universita: perIlClient.universita?.nome ?? null,
      corso: perIlClient.corso
        ? {
            nome: perIlClient.corso.nome,
            codiceCorso: perIlClient.corso.codice,
            classe: `${perIlClient.corso.classe.codice} — ${perIlClient.corso.classe.nome}`,
            durataAnni: perIlClient.corso.durataAnni,
          }
        : null,
      onboardingCompletato: perIlClient.onboardingCompletato,
      impostazioniPrivacy: perIlClient.impostazioniPrivacy,
      preferenzeDiNotifica: {
        commenti: profilo.preferenzeNotifiche?.commenti ?? true,
        inviti: profilo.preferenzeNotifiche?.inviti ?? true,
      },
      // **Il token del dispositivo non esce**, come non escono la sessione e i
      // codici d'accesso: non è un dato della persona ma il modo in cui il
      // sistema raggiunge un suo apparecchio, e in un file nella cartella dei
      // download sarebbe un modo per mandarle notifiche a nome nostro. Ciò
      // che la riguarda — quanti apparecchi, di che tipo, da quando — c'è.
      dispositiviRegistrati: profilo.dispositivi.map((dispositivo) => ({
        piattaforma: dispositivo.piattaforma,
        registratoIl: dispositivo.creatoIl,
      })),
      // Della notifica esce cosa era e quando: **non il `risorsaId`**, che è
      // l'identificativo di un contenuto altrui — da solo illeggibile, e in
      // una copia scaricata sarebbe solo un uuid che punta a casa d'altri.
      // Stessa logica del corso per esteso, al contrario.
      notifiche: profilo.notifiche.map((notifica) => ({
        tipo: notifica.tipo,
        letta: notifica.lettaIl !== null,
        ricevutaIl: notifica.creatoIl,
      })),
      // Chi HO bloccato: l'identificativo senza il nome, che è un dato suo.
      // Chi ha bloccato ME non è un mio dato — è una scelta altrui — e non
      // compare in alcuna esportazione. La cancellazione invece conta e porta
      // via entrambe le direzioni: asimmetria deliberata, non dimenticanza.
      bloccati: profilo.blocchiFatti.map((blocco) => ({
        utenteId: blocco.bloccatoId,
        bloccatoIl: blocco.creatoIl,
      })),
    };
  }

  // --- Avvisi (E8) -----------------------------------------------------------

  /**
   * Gli apparecchi su cui questa persona vuole ancora essere interrotta.
   *
   * La preferenza si legge **adesso**, non da una copia presa quando il fatto
   * è nato: chi ha appena spento gli avvisi dei commenti non deve riceverne
   * uno per un commento arrivato un istante prima.
   *
   * Elenco vuoto è una risposta normale — nessun apparecchio, o avvisi spenti
   * — e chi chiama non manda niente. Non è un errore.
   */
  async dispositiviDaAvvisare(utenteId: string, tipo: 'commento' | 'invito'): Promise<string[]> {
    if (!(await this.preferenzaAccesa(utenteId, tipo))) return [];

    const dispositivi = await this.prisma.dispositivoDiNotifica.findMany({
      where: { utenteId },
      select: { token: true },
    });
    return dispositivi.map((d) => d.token);
  }

  /**
   * La persona vuole ancora essere interrotta per questo tipo di avviso?
   *
   * Letta **adesso**, mai da una copia: chi ha appena spento i commenti non
   * deve riceverne uno per un commento arrivato un istante prima. Governa i
   * canali che interrompono — push, email — mai la riga nella campanella, che
   * nasce comunque: spegnere un asse significa «non disturbarmi», non
   * «nascondimi l'informazione».
   */
  async preferenzaAccesa(utenteId: string, tipo: 'commento' | 'invito'): Promise<boolean> {
    const preferenze = await this.prisma.preferenzeDiNotifica.findUnique({ where: { utenteId } });
    // Assenti significa «mai scelto»: valgono i valori di partenza, che sono
    // accesi. Non esiste lo stato «non impostato».
    return tipo === 'commento' ? (preferenze?.commenti ?? true) : (preferenze?.inviti ?? true);
  }

  async preferenzeDiNotifica(utenteId: string): Promise<{ commenti: boolean; inviti: boolean }> {
    await this.perUtente(utenteId);
    const preferenze = await this.prisma.preferenzeDiNotifica.upsert({
      where: { utenteId },
      update: {},
      create: { utenteId },
    });
    return { commenti: preferenze.commenti, inviti: preferenze.inviti };
  }

  /** Si cambia un asse alla volta: quello omesso resta com'era. */
  async aggiornaPreferenzeDiNotifica(
    utenteId: string,
    dati: { commenti?: boolean; inviti?: boolean },
  ): Promise<{ commenti: boolean; inviti: boolean }> {
    await this.preferenzeDiNotifica(utenteId);
    const aggiornate = await this.prisma.preferenzeDiNotifica.update({
      where: { utenteId },
      data: {
        ...(dati.commenti === undefined ? {} : { commenti: dati.commenti }),
        ...(dati.inviti === undefined ? {} : { inviti: dati.inviti }),
      },
    });
    return { commenti: aggiornate.commenti, inviti: aggiornate.inviti };
  }

  /**
   * Registra un apparecchio.
   *
   * Il token è unico: lo stesso apparecchio registrato due volte è **una**
   * registrazione, e se a registrarlo è un altro account passa a lui — è il
   * caso vero del telefono prestato o dell'account cambiato, e lasciare gli
   * avvisi al primo vorrebbe dire mandarli a chi ora ha quel telefono in mano.
   */
  async registraDispositivo(
    utenteId: string,
    dati: { token: string; piattaforma: 'IOS' | 'ANDROID' | 'WEB' },
  ): Promise<void> {
    await this.perUtente(utenteId);
    await this.prisma.dispositivoDiNotifica.upsert({
      where: { token: dati.token },
      update: { utenteId, piattaforma: dati.piattaforma },
      create: { utenteId, token: dati.token, piattaforma: dati.piattaforma },
    });
  }

  /** Idempotente: togliere un apparecchio già tolto non è un errore. */
  async dimenticaDispositivo(utenteId: string, token: string): Promise<void> {
    await this.prisma.dispositivoDiNotifica.deleteMany({ where: { utenteId, token } });
  }

  /** Vero quando i quattro dati ci sono: è il solo criterio. */
  async onboardingCompletato(utenteId: string): Promise<boolean> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      select: { onboardingCompletato: true },
    });
    return profilo?.onboardingCompletato ?? false;
  }

  /**
   * Dal record alla forma del contratto.
   *
   * Le impostazioni sono opzionali nello schema (la relazione lo è), ma non
   * nel dominio: se mancano è un difetto, non uno stato previsto, e il valore
   * di ripiego è quello più chiuso — mai lasciare che un dato mancante apra i
   * contenuti di qualcuno.
   */
  private perIlClient(profilo: {
    utenteId: string;
    nome: string | null;
    cognome: string | null;
    corso: {
      id: string;
      codice: string;
      nome: string;
      durataAnni: number;
      classe: { codice: string; nome: string; livello: string };
      universita: { id: string; slug: string; nome: string; nomeBreve: string; citta: string };
    } | null;
    onboardingCompletato: boolean;
    impostazioniPrivacy: { contattabilita: string; visibilita: string } | null;
    fotoChiave?: string | null;
  }): ProfiloResponse {
    return {
      utenteId: profilo.utenteId,
      nome: profilo.nome,
      cognome: profilo.cognome,
      // L'università esce dal corso e non da un campo suo: non esiste un
      // profilo con ateneo e senza corso, e due colonne per la stessa cosa
      // prima o poi divergono.
      universita: profilo.corso ? perIlClientUniversita(profilo.corso.universita) : null,
      corso: profilo.corso ? perIlClientCorso(profilo.corso) : null,
      onboardingCompletato: profilo.onboardingCompletato,
      impostazioniPrivacy: {
        contattabilita: (profilo.impostazioniPrivacy?.contattabilita ??
          'PRIVATO') as ProfiloResponse['impostazioniPrivacy']['contattabilita'],
        visibilita: (profilo.impostazioniPrivacy?.visibilita ??
          'PRIVATO') as ProfiloResponse['impostazioniPrivacy']['visibilita'],
      },
      // L'indirizzo si costruisce a ogni lettura dalla chiave: conservarlo
      // vorrebbe dire conservare un indirizzo che il giorno in cui l'archivio
      // cambia fornitore punta al nulla.
      foto: profilo.fotoChiave ? this.archivio.urlDiLettura(profilo.fotoChiave) : null,
    };
  }
}
