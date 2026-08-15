import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  LUNGHEZZA_MASSIMA_COMMENTO,
  type CommentoResponse,
  type PaginatedResult,
  type PostResponse,
  type TipoAllegato,
} from '@prome/contracts';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions';
import {
  ARCHIVIO_DI_FILE,
  chiaveAllegato,
  type ArchivioDiFile,
  type Preautorizzazione,
} from '../../infrastruttura/archivio-file/archivio-file';
import { ProfiloService } from '../profilo/profilo.service';
import { BachecaErrorCode } from './constants/error-codes';
import { PREFISSO_AUTORE_ANONIMO } from './cancellazione-bacheca.service';
import { costruisciPost, verificaFileArchiviato, type FileArchiviato } from './dominio/post';

/** Quanti file può portarsi dietro un post. */
export const MASSIMO_ALLEGATI_PER_POST = 10;

/**
 * Bounded context BACHECA — post e allegati.
 *
 * Importa Profilo, come consente la Context Map: gli serve la prova che
 * l'autore ha completato l'onboarding (B6) e le impostazioni di privacy per
 * risolvere chi vede cosa in lettura (B5). Non importa Gruppo né Aula studio.
 */
@Injectable()
export class BachecaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilo: ProfiloService,
    @Inject(ARCHIVIO_DI_FILE) private readonly archivio: ArchivioDiFile,
  ) {}

  /**
   * Autorizza il caricamento di un file e prenota la sua chiave.
   *
   * La riga dell'allegato nasce qui, **senza post**, in attesa di essere
   * adottata: è l'unico istante in cui esiste un allegato non ancora legato a
   * un contenuto, e infatti non è ancora l'`Allegato` del dominio — è una
   * prenotazione. L'aggregato nasce alla creazione del post, dove B4 vale.
   */
  async preautorizzaAllegato(
    utenteId: string,
    dati: { nome: string; tipo: TipoAllegato; dimensione: number },
  ): Promise<{ chiave: string } & Preautorizzazione> {
    // La stessa regola dell'aggregato (B3), applicata prima di spendere banda:
    // un file da 40 MB non deve essere caricato per intero e poi rifiutato.
    // La chiave non c'è ancora, e non è quella che stiamo verificando qui.
    verificaFileArchiviato({
      chiave: 'da-assegnare',
      nome: dati.nome,
      tipo: dati.tipo,
      dimensione: dati.dimensione,
    });

    const prenotazione = await this.prisma.allegatoInAttesa.create({
      data: {
        autoreId: utenteId,
        nome: dati.nome,
        tipo: dati.tipo,
        dimensione: dati.dimensione,
        chiave: '',
      },
    });

    const chiave = chiaveAllegato(prenotazione.id, dati.nome);
    await this.prisma.allegatoInAttesa.update({
      where: { id: prenotazione.id },
      data: { chiave },
    });

    const preautorizzazione = await this.archivio.preautorizzaCaricamento(chiave, dati.tipo);
    return { chiave, ...preautorizzazione };
  }

  /**
   * Pubblica un post.
   *
   * Post e allegati nella **stessa transazione** (B4): un allegato orfano non
   * deve poter esistere nemmeno per un istante, ed è la garanzia che
   * l'aggregato può dare perché ha tutto dentro il proprio confine.
   */
  async pubblica(
    utenteId: string,
    dati: { testo: string; allegati?: string[] },
  ): Promise<PostResponse> {
    // B6: senza la prova non c'è post. La prova la emette Profilo, che è il
    // contesto che possiede il fatto.
    const prova = await this.profilo.provaDiOnboarding(utenteId);
    const chiavi = dati.allegati ?? [];

    if (chiavi.length > MASSIMO_ALLEGATI_PER_POST) {
      throw new AppException(
        BachecaErrorCode.TROPPI_ALLEGATI,
        'TROPPI_ALLEGATI',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { massimo: MASSIMO_ALLEGATI_PER_POST },
      );
    }

    const file = await this.raccogliFile(utenteId, chiavi);
    const post = costruisciPost(prova, { testo: dati.testo, allegati: file });

    const scritto = await this.prisma.$transaction(async (tx) => {
      const creato = await tx.post.create({
        data: {
          autoreId: post.autoreId,
          testo: post.testo,
          allegati: {
            create: post.allegati.map((f) => ({
              chiave: f.chiave,
              nome: f.nome,
              tipo: f.tipo,
              dimensione: f.dimensione,
            })),
          },
        },
        include: { allegati: true },
      });

      // Le prenotazioni sono state adottate: toglierle nella stessa
      // transazione impedisce che lo stesso file finisca in due post.
      if (chiavi.length) {
        await tx.allegatoInAttesa.deleteMany({ where: { chiave: { in: chiavi } } });
      }
      return creato;
    });

    const autore = await this.profilo.perUtente(utenteId);
    return this.perIlClient(scritto, autore, utenteId);
  }

  /**
   * La bacheca di chi legge, in ordine cronologico e senza alcun ranking.
   *
   * La visibilità si risolve **qui, in lettura** (B5): si guardano le
   * Impostazioni di privacy di ciascun autore adesso, non una copia salvata
   * quando il post è stato scritto. È più costoso, ed è l'unico modo perché
   * cambiare le proprie impostazioni abbia effetto immediato su tutto ciò che
   * si è già pubblicato.
   */
  async elenca(
    lettoreId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<PostResponse>> {
    const lettore = await this.profilo.perUtente(lettoreId);
    const autoriVisibili = await this.profilo.autoriVisibiliA(lettore);

    // I contenuti anonimizzati (autore rimosso con la cancellazione account)
    // restano visibili a ogni iscritto: non c'è più un proprietario, quindi
    // non c'è più una decisione di privacy da interrogare. Mai al web: la
    // guardia della facciata resta.
    const dove = {
      OR: [
        { autoreId: { in: autoriVisibili } },
        { autoreId: { startsWith: PREFISSO_AUTORE_ANONIMO } },
      ],
    };
    const [totale, righe] = await Promise.all([
      this.prisma.post.count({ where: dove }),
      this.prisma.post.findMany({
        where: dove,
        orderBy: { creatoIl: 'desc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
        include: { allegati: true },
      }),
    ]);

    const autori = await this.profilo.perUtenti([...new Set(righe.map((r) => r.autoreId))]);

    return {
      data: righe.map((riga) => this.perIlClient(riga, autori.get(riga.autoreId), lettoreId)),
      meta: {
        total: totale,
        page: pagina.page,
        limit: pagina.limit,
        totalPages: Math.max(1, Math.ceil(totale / pagina.limit)),
      },
    };
  }

  /**
   * Dalle chiavi ai file, verificando che ognuna sia davvero utilizzabile.
   *
   * Tre controlli, tre errori distinti: la chiave non è nostra o non è di chi
   * scrive, i byte non sono mai arrivati, la chiave è già stata usata. Dire
   * «allegato non valido» per tutti e tre lascerebbe l'utente senza sapere
   * cosa fare.
   */
  private async raccogliFile(
    utenteId: string,
    chiavi: string[],
  ): Promise<readonly FileArchiviato[]> {
    if (!chiavi.length) return [];

    const prenotazioni = await this.prisma.allegatoInAttesa.findMany({
      where: { chiave: { in: chiavi }, autoreId: utenteId },
    });

    const perChiave = new Map(prenotazioni.map((p) => [p.chiave, p]));
    const file: FileArchiviato[] = [];

    for (const chiave of chiavi) {
      const prenotazione = perChiave.get(chiave);
      if (!prenotazione) {
        // Sconosciuta, oppure di qualcun altro: la risposta è la stessa,
        // perché distinguerle direbbe a chi prova che quella chiave esiste.
        const giaUsata = await this.prisma.allegato.findUnique({ where: { chiave } });
        throw new AppException(
          giaUsata ? BachecaErrorCode.ALLEGATO_GIA_USATO : BachecaErrorCode.ALLEGATO_SCONOSCIUTO,
          giaUsata ? 'ALLEGATO_GIA_USATO' : 'ALLEGATO_SCONOSCIUTO',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (!(await this.archivio.eStatoCaricato(chiave))) {
        throw new AppException(
          BachecaErrorCode.ALLEGATO_NON_CARICATO,
          'ALLEGATO_NON_CARICATO',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      file.push({
        chiave: prenotazione.chiave,
        nome: prenotazione.nome,
        tipo: prenotazione.tipo,
        dimensione: prenotazione.dimensione,
      });
    }

    return file;
  }

  /**
   * Un post solo, se chi legge può vederlo.
   *
   * La visibilità si risolve **qui, in lettura**, con la stessa regola della
   * bacheca (B5): un post raggiungibile dal suo indirizzo ma non dal feed
   * sarebbe un buco, e chi conosce un identificativo lo proverebbe.
   *
   * Post inesistente e post non visibile danno la **stessa** risposta: dire
   * «esiste ma non puoi vederlo» racconta comunque che esiste.
   */
  async leggi(lettoreId: string, postId: string): Promise<PostResponse> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { allegati: true },
    });

    const lettore = await this.profilo.perUtente(lettoreId);
    const visibili = await this.profilo.autoriVisibiliA(lettore);

    const anonimo = post?.autoreId.startsWith(PREFISSO_AUTORE_ANONIMO) ?? false;
    if (!post || (!visibili.includes(post.autoreId) && !anonimo)) {
      throw new AppException(
        BachecaErrorCode.POST_NOT_FOUND,
        'POST_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const autori = await this.profilo.perUtenti([post.autoreId]);
    return this.perIlClient(post, autori.get(post.autoreId), lettoreId);
  }

  /**
   * Modifica il testo di un post.
   *
   * Solo l'autore, e il controllo sta **qui**: la facciata attraversa quattro
   * contesti, e una decisione su chi può fare cosa presa lì sarebbe presa
   * fuori dal contesto che la possiede. Gli allegati non si toccano — cambiarli
   * è un'altra operazione, con altre garanzie.
   */
  async modifica(utenteId: string, postId: string, testo: string): Promise<PostResponse> {
    const esistente = await this.postDiCui(utenteId, postId);

    // Le stesse invarianti della creazione: un post non può diventare vuoto o
    // sforare i 5.000 caratteri passando dalla modifica.
    const prova = await this.profilo.provaDiOnboarding(utenteId);
    const validato = costruisciPost(prova, { testo, allegati: [] });

    const aggiornato = await this.prisma.post.update({
      where: { id: esistente.id },
      data: { testo: validato.testo },
      include: { allegati: true },
    });

    return this.perIlClient(aggiornato, await this.profilo.perUtente(utenteId), utenteId);
  }

  /**
   * Elimina un post.
   *
   * Due tempi, e la differenza è di modello:
   * - gli **allegati** spariscono nella stessa transazione (B4), perché sono
   *   entità interne e un allegato orfano non deve esistere nemmeno per un
   *   istante; i file corrispondenti escono dall'archivio subito dopo;
   * - i **commenti** sono aggregati autonomi e spariscono **in differita**:
   *   nessuno li sta aspettando, e tenerli nella stessa transazione
   *   significherebbe far dipendere la cancellazione di un post dal numero di
   *   commenti che ha.
   */
  async elimina(utenteId: string, postId: string): Promise<void> {
    const post = await this.postDiCui(utenteId, postId);
    const chiavi = post.allegati.map((a) => a.chiave);

    // La cascata dello schema porta via gli allegati con il post: è l'unica
    // dello schema, ed è qui che serve.
    await this.prisma.post.delete({ where: { id: post.id } });

    // I file dopo, e non dentro: un archivio lento o momentaneamente
    // irraggiungibile non deve tenere aperta una transazione sul database.
    // Se un file resta, resta un file senza riferimenti — non un allegato
    // orfano — e la pulizia dell'unità lavoratrice lo raccoglie.
    for (const chiave of chiavi) {
      await this.archivio.rimuovi(chiave).catch(() => undefined);
    }
  }

  /**
   * Pubblica un commento.
   *
   * L'esistenza del post è verificata **al comando**, su lettura fresca, e non
   * protetta al commit (C3): fra il controllo e la scrittura resta una finestra
   * sottilissima in cui il post può sparire. Il modello non finge di poterla
   * chiudere — la chiude la pulizia differita.
   */
  async commenta(utenteId: string, postId: string, testo: string): Promise<CommentoResponse> {
    await this.profilo.provaDiOnboarding(utenteId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new AppException(
        BachecaErrorCode.POST_NOT_FOUND,
        'POST_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const pulito = testo.trim();
    if (!pulito) {
      throw new AppException(
        BachecaErrorCode.COMMENTO_TESTO_VUOTO,
        'COMMENTO_TESTO_VUOTO',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (pulito.length > LUNGHEZZA_MASSIMA_COMMENTO) {
      throw new AppException(
        BachecaErrorCode.COMMENTO_TESTO_TROPPO_LUNGO,
        'COMMENTO_TESTO_TROPPO_LUNGO',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { massimo: LUNGHEZZA_MASSIMA_COMMENTO },
      );
    }

    const commento = await this.prisma.commento.create({
      data: { postId, autoreId: utenteId, testo: pulito },
    });

    const autore = await this.profilo.perUtente(utenteId);
    return this.commentoPerIlClient(commento, autore, post.autoreId, utenteId);
  }

  /** I commenti di un post, dal più vecchio: una discussione si legge in ordine. */
  async commentiDi(
    lettoreId: string,
    postId: string,
    pagina: { page: number; limit: number },
  ): Promise<PaginatedResult<CommentoResponse>> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new AppException(
        BachecaErrorCode.POST_NOT_FOUND,
        'POST_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const [totale, righe] = await Promise.all([
      this.prisma.commento.count({ where: { postId } }),
      this.prisma.commento.findMany({
        where: { postId },
        orderBy: { creatoIl: 'asc' },
        skip: (pagina.page - 1) * pagina.limit,
        take: pagina.limit,
      }),
    ]);

    const autori = await this.profilo.perUtenti([...new Set(righe.map((r) => r.autoreId))]);

    return {
      data: righe.map((riga) =>
        this.commentoPerIlClient(riga, autori.get(riga.autoreId), post.autoreId, lettoreId),
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
   * Elimina un commento.
   *
   * Possono farlo in due: chi l'ha scritto, e l'autore del post — che modera
   * ciò che sta sotto al proprio contenuto. Sono due permessi diversi con lo
   * stesso esito, e vivono qui perché è la Bacheca a possedere la regola.
   */
  async eliminaCommento(utenteId: string, commentoId: string): Promise<void> {
    const commento = await this.prisma.commento.findUnique({ where: { id: commentoId } });
    if (!commento) {
      throw new AppException(
        BachecaErrorCode.COMMENTO_NOT_FOUND,
        'COMMENTO_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // Il post potrebbe non esserci più (C3): in quel caso resta solo il
    // permesso dell'autore del commento, e va bene così.
    const post = await this.prisma.post.findUnique({ where: { id: commento.postId } });
    const puo = commento.autoreId === utenteId || post?.autoreId === utenteId;
    if (!puo) {
      throw new AppException(
        BachecaErrorCode.NON_PUOI_MODERARE,
        'NON_PUOI_MODERARE',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.commento.delete({ where: { id: commentoId } });
  }

  /**
   * I contenuti scritti da questa persona, per l'esportazione.
   *
   * Solo i suoi: i commenti **ricevuti** sotto i suoi post non sono suoi da
   * esportare — sono di chi li ha scritti, e finirebbero in una copia che
   * quella persona non ha chiesto.
   */
  async datiPersonaliDi(utenteId: string) {
    const [post, commenti] = await Promise.all([
      this.prisma.post.findMany({
        where: { autoreId: utenteId },
        orderBy: { creatoIl: 'asc' },
        include: { allegati: true },
      }),
      this.prisma.commento.findMany({
        where: { autoreId: utenteId },
        orderBy: { creatoIl: 'asc' },
      }),
    ]);

    return {
      post: post.map((riga) => ({
        id: riga.id,
        testo: riga.testo,
        creatoIl: riga.creatoIl.toISOString(),
        aggiornatoIl: riga.aggiornatoIl.toISOString(),
        allegati: riga.allegati.map((allegato) => ({
          nome: allegato.nome,
          tipo: allegato.tipo as TipoAllegato,
          dimensione: allegato.dimensione,
          caricatoIl: allegato.creatoIl.toISOString(),
          url: this.archivio.urlDiLettura(allegato.chiave),
        })),
      })),
      commenti: commenti.map((commento) => ({
        id: commento.id,
        postId: commento.postId,
        testo: commento.testo,
        creatoIl: commento.creatoIl.toISOString(),
      })),
    };
  }

  /**
   * Il post, se esiste e se è di chi lo chiede.
   *
   * Post inesistente e post altrui danno risposte diverse di proposito: il
   * primo è un 404 e il secondo un 403, perché all'utente servono due azioni
   * diverse. Non c'è nulla da nascondere — che un post esista lo si vede già
   * dalla bacheca di chi può leggerlo.
   */
  private async postDiCui(utenteId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { allegati: true },
    });

    if (!post) {
      throw new AppException(
        BachecaErrorCode.POST_NOT_FOUND,
        'POST_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    if (post.autoreId !== utenteId) {
      throw new AppException(
        BachecaErrorCode.NON_SEI_AUTORE,
        'NON_SEI_AUTORE',
        HttpStatus.FORBIDDEN,
      );
    }
    return post;
  }

  private commentoPerIlClient(
    commento: { id: string; testo: string; creatoIl: Date; autoreId: string },
    autore: { nome: string | null; cognome: string | null; universita: string | null } | undefined,
    autoreDelPost: string,
    lettoreId: string,
  ): CommentoResponse {
    return {
      id: commento.id,
      testo: commento.testo,
      creatoIl: commento.creatoIl.toISOString(),
      autore: {
        utenteId: commento.autoreId,
        nome: autore?.nome ?? null,
        cognome: autore?.cognome ?? null,
        universita: autore?.universita ?? null,
        // Senza profilo dietro: account cancellato (contenuto anonimizzato)
        // o in corso di cancellazione. Il client mostra «Utente rimosso».
        ...(autore ? {} : { rimosso: true }),
      },
      // Lo decide il server: ricalcolarlo nel client vorrebbe dire tenere due
      // copie della stessa regola, e quella del client sarebbe aggirabile.
      puoEliminare: commento.autoreId === lettoreId || autoreDelPost === lettoreId,
    };
  }

  private perIlClient(
    post: {
      id: string;
      testo: string;
      creatoIl: Date;
      autoreId: string;
      allegati: { id: string; nome: string; tipo: TipoAllegato; dimensione: number; chiave: string }[];
    },
    autore?: { utenteId: string; nome: string | null; cognome: string | null; universita: string | null },
    lettoreId?: string,
  ): PostResponse {
    return {
      id: post.id,
      testo: post.testo,
      creatoIl: post.creatoIl.toISOString(),
      autore: {
        utenteId: post.autoreId,
        nome: autore?.nome ?? null,
        cognome: autore?.cognome ?? null,
        universita: autore?.universita ?? null,
        // Senza profilo dietro: account cancellato (contenuto anonimizzato)
        // o in corso di cancellazione. Il client mostra «Utente rimosso».
        ...(autore ? {} : { rimosso: true }),
      },
      puoModificare: post.autoreId === lettoreId,
      allegati: post.allegati.map((a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        dimensione: a.dimensione,
        url: this.archivio.urlDiLettura(a.chiave),
      })),
    };
  }
}
