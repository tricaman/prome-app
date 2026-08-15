import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nContext } from 'nestjs-i18n';
import type { FastifyRequest } from 'fastify';
import type { RichiestaCodiceResponse, VerificaCodiceResponse } from '@prome/contracts';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { AppException } from '../../common/exceptions';
import { FORNITORE_IDENTITA } from '../../infrastruttura/accesso/accesso.module';
import {
  DURATA_CODICE_SECONDI,
  type FornitoreIdentita,
} from '../../infrastruttura/accesso/better-auth';
import { traduciErroreDelFornitore } from '../../infrastruttura/accesso/errori-del-fornitore';
import { CANALE_EMAIL, type CanaleEmail } from '../../infrastruttura/avvisi-in-uscita/canale-email';
import { CancellazioneErrorCode } from '../cancellazione/constants/error-codes';
import { CancellazioneService } from '../cancellazione/cancellazione.service';
import { ProfiloErrorCode } from '../profilo/constants/error-codes';
import { ProfiloService } from '../profilo/profilo.service';
import { MISURAZIONI, type MisurazioniDiUtilizzo } from '../../infrastruttura/misurazioni/misurazioni';
import {
  RichiestaCodiceDto,
  RichiestaCodiceRispostaDto,
  VerificaCodiceDto,
  VerificaCodiceRispostaDto,
} from './dtos/accesso.dto';
import { SenzaAccesso, intestazioniStandard } from './guardia-accesso';

/**
 * Ingresso a Prome: un solo modo, in due gesti.
 *
 * Si chiede un codice al proprio indirizzo e lo si verifica. Non esiste una
 * registrazione separata: chi verifica un codice per la prima volta ottiene un
 * account e un profilo vuoto, e prosegue con l'onboarding.
 *
 * Le rotte del fornitore di identità non sono montate: qui lo chiamiamo come
 * libreria, così ingresso e uscita restano quelli del contratto — una sola
 * envelope, un solo formato d'errore, messaggi già tradotti.
 */
@ApiTags('accesso')
@Controller('accesso')
export class AccessoController {
  constructor(
    @Inject(FORNITORE_IDENTITA) private readonly fornitore: FornitoreIdentita,
    @Inject(CANALE_EMAIL) private readonly email: CanaleEmail,
    private readonly profilo: ProfiloService,
    private readonly cancellazione: CancellazioneService,
    @Inject(MISURAZIONI) private readonly misurazioni: MisurazioniDiUtilizzo,
  ) {}

  @Post('codice')
  @SenzaAccesso()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'richiediCodiceAccesso',
    summary: 'Manda un codice di accesso a un indirizzo email',
  })
  @ApiWrappedResponse({ type: RichiestaCodiceRispostaDto })
  @ResponseMessage('successes.CODICE_INVIATO')
  async richiediCodice(@Body() corpo: RichiestaCodiceDto): Promise<RichiestaCodiceResponse> {
    // Il codice lo fa generare al fornitore, ma **l'email la manda Prome**.
    //
    // Non è una preferenza: `sendVerificationOTP` esegue l'invio come lavoro
    // di sfondo e ne inghiotte l'errore, quindi con il canale email guasto
    // l'utente riceverebbe «ti abbiamo mandato un codice» e aspetterebbe per
    // sempre un messaggio che non è mai partito. Separando le due cose il
    // guasto torna visibile, ed è ciò che rende vero PR007.
    let codice: string;
    try {
      codice = (await this.fornitore.api.createVerificationOTP({
        body: { email: corpo.email, type: 'sign-in' },
      })) as unknown as string;
    } catch (errore) {
      throw traduciErroreDelFornitore(errore, {
        codice: ProfiloErrorCode.INVIO_CODICE_FALLITO,
        messaggio: 'INVIO_CODICE_FALLITO',
      });
    }

    try {
      // La lingua è quella della richiesta, non una costante: chi scrive in
      // inglese non deve ricevere un'email in italiano.
      await this.email.inviaCodiceAccesso(corpo.email, codice, linguaDellaRichiesta());
    } catch (errore) {
      // Il dettaglio resta nei log; all'utente arriva una frase che gli dice
      // cosa fare — riprovare — invece di un 500 muto.
      throw new AppException(
        ProfiloErrorCode.INVIO_CODICE_FALLITO,
        'INVIO_CODICE_FALLITO',
        HttpStatus.SERVICE_UNAVAILABLE,
        { causa: errore instanceof Error ? errore.message : 'sconosciuta' },
      );
    }

    // Nessun indirizzo nell'evento: quanti codici partono è una misura, chi
    // li chiede è un dato personale.
    this.misurazioni.registra('codice_richiesto');

    // La risposta è la stessa che l'indirizzo esista o no, ed è voluto:
    // rispondere diversamente trasformerebbe questo endpoint in un modo per
    // scoprire chi è iscritto a Prome.
    return { scadeIl: new Date(Date.now() + DURATA_CODICE_SECONDI * 1000).toISOString() };
  }

  @Post('verifica')
  @SenzaAccesso()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'verificaCodiceAccesso',
    summary: 'Verifica il codice ed entra (creando l\'account al primo ingresso)',
  })
  @ApiWrappedResponse({ type: VerificaCodiceRispostaDto })
  @ResponseMessage('successes.ACCESSO_EFFETTUATO')
  async verificaCodice(@Body() corpo: VerificaCodiceDto): Promise<VerificaCodiceResponse> {
    let esito: Awaited<ReturnType<FornitoreIdentita['api']['signInEmailOTP']>>;
    try {
      esito = await this.fornitore.api.signInEmailOTP({
        body: { email: corpo.email, otp: corpo.codice },
        // Il token di sessione torna nelle intestazioni, non nel corpo:
        // chiediamo la risposta completa per poterlo leggere.
        returnHeaders: true,
      } as Parameters<FornitoreIdentita['api']['signInEmailOTP']>[0]);
    } catch (errore) {
      throw traduciErroreDelFornitore(errore, {
        codice: ProfiloErrorCode.VERIFICA_FALLITA,
        messaggio: 'VERIFICA_FALLITA',
      });
    }

    const { token, utenteId, scadeIl } = leggiSessione(esito);

    // Rientrare entro la grazia di 14 giorni annulla la cancellazione; oltre,
    // la catena è in arrivo e questo accesso non deve lasciare tracce — la
    // sessione appena creata è già stata revocata dal servizio.
    const esitoCancellazione = await this.cancellazione.annullaSePendente(utenteId);
    if (esitoCancellazione === 'oltre-grazia') {
      throw new AppException(
        CancellazioneErrorCode.ACCOUNT_IN_CANCELLAZIONE,
        'ACCOUNT_IN_CANCELLAZIONE',
        HttpStatus.FORBIDDEN,
        { utenteId },
      );
    }
    if (esitoCancellazione === 'annullata') {
      // Senza utenteId, come tutti gli eventi della cancellazione.
      this.misurazioni.registra('cancellazione_annullata');
    }

    // Il profilo nasce al primo ingresso, insieme alle sue impostazioni di
    // privacy: da qui in poi esiste un Utente di dominio, non solo un account.
    const profilo = await this.profilo.assicuraEsistenza(utenteId);

    // `primoIngresso` distingue chi arriva da chi torna, che è la sola
    // domanda a cui questo evento deve poter rispondere.
    this.misurazioni.registra('accesso_effettuato', {
      utenteId,
      primoIngresso: !profilo.onboardingCompletato,
    });

    return {
      token,
      scadeIl,
      onboardingCompletato: profilo.onboardingCompletato,
      ...(esitoCancellazione === 'annullata' ? { cancellazioneAnnullata: true } : {}),
    };
  }

  @Post('esci')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'esciDaProme', summary: 'Chiude la sessione corrente' })
  @ApiWrappedResponse({ description: "Sessione chiusa" })
  @ResponseMessage('successes.USCITA_EFFETTUATA')
  async esci(@Req() richiesta: FastifyRequest): Promise<null> {
    await this.fornitore.api.signOut({ headers: intestazioniStandard(richiesta) });
    return null;
  }
}

/**
 * La lingua di questa richiesta, con lo stesso ripiego di tutto il resto.
 * Vive qui e non nel canale email perché è la richiesta a portarla.
 */
function linguaDellaRichiesta(): string {
  return I18nContext.current()?.lang ?? 'it';
}

/**
 * Estrae token, utente e scadenza dall'esito del fornitore.
 *
 * La forma dipende dalla versione della libreria: il token può arrivare nel
 * corpo oppure nell'intestazione `set-auth-token`. Guardiamo entrambi qui, in
 * un punto solo, invece di spargere la conoscenza di quel dettaglio.
 */
function leggiSessione(esito: unknown): { token: string; utenteId: string; scadeIl: string } {
  const risposta = esito as {
    headers?: Headers;
    response?: { token?: string; user?: { id?: string } };
    token?: string;
    user?: { id?: string };
  };
  const corpo = risposta.response ?? risposta;
  const token = corpo.token ?? risposta.headers?.get('set-auth-token') ?? undefined;
  const utenteId = corpo.user?.id;

  if (!token || !utenteId) {
    // Il fornitore ha detto di sì ma non ha dato una sessione: è un difetto
    // nostro di integrazione, non un errore dell'utente.
    throw new Error('Il fornitore di identità non ha restituito una sessione utilizzabile');
  }

  return {
    token,
    utenteId,
    scadeIl: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
