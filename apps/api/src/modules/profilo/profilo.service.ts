import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  AggiornaImpostazioniPrivacyRequest,
  CompletaProfiloRequest,
  ProfiloResponse,
} from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions';
import { ProfiloErrorCode } from './constants/error-codes';
import { emettiProvaOnboarding, type ProvaOnboardingCompletato } from './prova-onboarding';

/**
 * Bounded context PROFILO — l'identità accademica dell'utente.
 *
 * Possiede due aggregati che nascono e muoiono insieme: il Profilo e le sue
 * Impostazioni di privacy. Non conosce account, sessioni o provider: riceve un
 * identificativo già tradotto da PortaIdentitàUtente.
 */
@Injectable()
export class ProfiloService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { impostazioniPrivacy: true },
    });

    return this.perIlClient(profilo);
  }

  /** Il profilo di chi sta chiedendo. Se non c'è, non c'è: non lo si inventa qui. */
  async perUtente(utenteId: string): Promise<ProfiloResponse> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      include: { impostazioniPrivacy: true },
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
   * I quattro dati arrivano insieme perché insieme definiscono la condizione:
   * l'onboarding è completo **se e solo se** nome, cognome, università e corso
   * sono valorizzati. Non esiste un completamento parziale, quindi non esiste
   * un endpoint che ne aggiorni uno solo.
   *
   * L'università è **autodichiarata**: non la verifichiamo contro alcun
   * elenco, e scriverla sbagliata non è un errore del sistema.
   */
  async completaOnboarding(
    utenteId: string,
    dati: CompletaProfiloRequest,
  ): Promise<ProfiloResponse> {
    // Che il profilo esista è responsabilità del primo ingresso: se manca qui,
    // manca davvero, e crearlo di nascosto nasconderebbe il difetto.
    await this.perUtente(utenteId);

    const profilo = await this.prisma.profilo.update({
      where: { utenteId },
      data: {
        nome: dati.nome.trim(),
        cognome: dati.cognome.trim(),
        universita: dati.universita.trim(),
        corso: dati.corso.trim(),
        onboardingCompletato: true,
      },
      include: { impostazioniPrivacy: true },
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
      include: { impostazioniPrivacy: true },
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
      condizioni.push({
        universita: lettore.universita,
        impostazioniPrivacy: { visibilita: 'ATENEO' },
      });
    }

    const visibili = await this.prisma.profilo.findMany({
      // Chi è in cancellazione «scompare subito» (grazia di 14 giorni): il
      // profilo esiste ancora — la riattivazione deve trovarlo intatto — ma
      // nessuna lettura lo espone più.
      where: { OR: condizioni, inCancellazioneDal: null },
      select: { utenteId: true },
    });

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
      include: { impostazioniPrivacy: true },
    });

    return new Map(profili.map((p) => [p.utenteId, this.perIlClient(p)]));
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

  /**
   * Eliminazione dei dati personali (V5): Profilo e Impostazioni di privacy
   * cadono insieme — la cascata è nello schema. Idempotente: a zero righe non
   * c'è niente da fare, non un errore.
   */
  async eliminaDatiDi(utenteId: string): Promise<void> {
    await this.prisma.profilo.deleteMany({ where: { utenteId } });
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
    const [profili, impostazioni, preferenze, dispositivi] = await Promise.all([
      this.prisma.profilo.count({ where: { utenteId } }),
      this.prisma.impostazioniDiPrivacy.count({ where: { utenteId } }),
      this.prisma.preferenzeDiNotifica.count({ where: { utenteId } }),
      this.prisma.dispositivoDiNotifica.count({ where: { utenteId } }),
    ]);
    return profili + impostazioni + preferenze + dispositivi;
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
    corso: string | null;
    onboardingCompletato: boolean;
    impostazioniPrivacy: { contattabilita: string; visibilita: string };
    preferenzeDiNotifica: { commenti: boolean; inviti: boolean };
    dispositiviRegistrati: Array<{ piattaforma: string; registratoIl: Date }>;
  } | null> {
    const profilo = await this.prisma.profilo.findUnique({
      where: { utenteId },
      include: { impostazioniPrivacy: true, preferenzeNotifiche: true, dispositivi: true },
    });
    if (!profilo) return null;

    const perIlClient = this.perIlClient(profilo);
    return {
      nome: perIlClient.nome,
      cognome: perIlClient.cognome,
      universita: perIlClient.universita,
      corso: perIlClient.corso,
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
    const preferenze = await this.prisma.preferenzeDiNotifica.findUnique({ where: { utenteId } });
    // Assenti significa «mai scelto»: valgono i valori di partenza, che sono
    // accesi. Non esiste lo stato «non impostato».
    const acceso = tipo === 'commento' ? (preferenze?.commenti ?? true) : (preferenze?.inviti ?? true);
    if (!acceso) return [];

    const dispositivi = await this.prisma.dispositivoDiNotifica.findMany({
      where: { utenteId },
      select: { token: true },
    });
    return dispositivi.map((d) => d.token);
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
    universita: string | null;
    corso: string | null;
    onboardingCompletato: boolean;
    impostazioniPrivacy: { contattabilita: string; visibilita: string } | null;
  }): ProfiloResponse {
    return {
      utenteId: profilo.utenteId,
      nome: profilo.nome,
      cognome: profilo.cognome,
      universita: profilo.universita,
      corso: profilo.corso,
      onboardingCompletato: profilo.onboardingCompletato,
      impostazioniPrivacy: {
        contattabilita: (profilo.impostazioniPrivacy?.contattabilita ??
          'PRIVATO') as ProfiloResponse['impostazioniPrivacy']['contattabilita'],
        visibilita: (profilo.impostazioniPrivacy?.visibilita ??
          'PRIVATO') as ProfiloResponse['impostazioniPrivacy']['visibilita'],
      },
    };
  }
}
