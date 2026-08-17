import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  BloccatoResponse,
  PaginatedResult,
  PreautorizzaAllegatoResponse,
  ProfiloResponse,
} from '@prome/contracts';
import { ApiPaginatedResponse, ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { ProfiloService } from '../profilo/profilo.service';
import { MISURAZIONI, type MisurazioniDiUtilizzo } from '../../infrastruttura/misurazioni/misurazioni';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { PaginationDto } from '../../common/dto';
import { PreautorizzaAllegatoRispostaDto } from './dtos/bacheca.dto';
import {
  AggiornaPrivacyDto,
  BloccatoDto,
  CompletaProfiloDto,
  ConfermaFotoProfiloDto,
  PreautorizzaFotoProfiloDto,
  ProfiloDto,
} from './dtos/profilo.dto';
import { Utente } from './guardia-accesso';

/**
 * Il profilo di chi sta usando Prome.
 *
 * Solo il proprio: non c'è un endpoint per leggere il profilo di un altro, e
 * quando ci sarà dovrà passare dalle regole di visibilità del contesto Profilo,
 * non da qui.
 */
@ApiTags('profilo')
@Controller('profilo')
export class ProfiloController {
  constructor(
    private readonly profilo: ProfiloService,
    @Inject(MISURAZIONI) private readonly misurazioni: MisurazioniDiUtilizzo,
  ) {}

  @Get('me')
  @ApiOperation({ operationId: 'leggiMioProfilo', summary: 'Il profilo di chi ha la sessione' })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.PROFILO_LETTO')
  leggi(@Utente() utente: UtenteDiDominio): Promise<ProfiloResponse> {
    return this.profilo.perUtente(utente.id);
  }

  /**
   * La foto, in tre tempi come un allegato: si dichiara, si mandano i byte
   * **diritti all'archivio**, si conferma citando la chiave.
   *
   * Sono tre endpoint e non uno perché sono tre momenti che possono fallire
   * separatamente, e chi carica deve sapere quale dei tre è andato storto.
   */
  @Post('me/foto/pre-autorizzazione')
  @ApiOperation({
    operationId: 'preautorizzaFotoProfilo',
    summary: 'Autorizza il caricamento della foto del profilo',
  })
  @ApiWrappedResponse({ type: PreautorizzaAllegatoRispostaDto })
  @ResponseMessage('successes.ALLEGATO_PREAUTORIZZATO')
  preautorizzaFoto(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: PreautorizzaFotoProfiloDto,
  ): Promise<PreautorizzaAllegatoResponse & { chiave: string }> {
    return this.profilo.preautorizzaFoto(utente.id, corpo);
  }

  @Put('me/foto')
  @ApiOperation({
    operationId: 'confermaFotoProfilo',
    summary: 'Adotta la foto caricata e la mette sul profilo',
  })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.FOTO_AGGIORNATA')
  confermaFoto(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: ConfermaFotoProfiloDto,
  ): Promise<ProfiloResponse> {
    return this.profilo.confermaFoto(utente.id, corpo.chiave);
  }

  @Delete('me/foto')
  @ApiOperation({
    operationId: 'rimuoviFotoProfilo',
    summary: 'Toglie la foto: restano le iniziali',
  })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.FOTO_RIMOSSA')
  rimuoviFoto(@Utente() utente: UtenteDiDominio): Promise<ProfiloResponse> {
    return this.profilo.rimuoviFoto(utente.id);
  }

  @Put('me')
  @ApiOperation({
    operationId: 'completaMioProfilo',
    summary: 'Completa l\'onboarding con nome, cognome, università e corso',
  })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.PROFILO_COMPLETATO')
  async completa(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: CompletaProfiloDto,
  ): Promise<ProfiloResponse> {
    const profilo = await this.profilo.completaOnboarding(utente.id, corpo);
    // Niente università né corso nell'evento: sono dati del profilo, non una
    // misura di prodotto.
    this.misurazioni.registra('onboarding_completato', { utenteId: utente.id });
    return profilo;
  }

  /**
   * Le regole di privacy: il solo gesto che le cambia.
   *
   * Nessun evento di misurazione. Quante persone aprono i propri contenuti
   * sarebbe una domanda legittima, ma l'elenco degli eventi è chiuso per
   * scelta, e una decisione di privacy contata è una decisione che comincia a
   * lasciare una traccia altrove.
   */
  @Put('me/privacy')
  @ApiOperation({
    operationId: 'aggiornaMiaPrivacy',
    summary: 'Cambia chi può contattarti e chi vede i tuoi contenuti',
  })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.PRIVACY_AGGIORNATA')
  aggiornaPrivacy(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: AggiornaPrivacyDto,
  ): Promise<ProfiloResponse> {
    return this.profilo.aggiornaImpostazioni(utente.id, corpo);
  }

  // --- Blocchi ---------------------------------------------------------------
  //
  // Il blocco vale per la bacheca — la superficie non scelta — in entrambe le
  // direzioni, e vince su ogni impostazione di privacy. Dentro un'aula o un
  // gruppo condivisi non decide niente: lì restano l'uscita e la moderazione.

  @Put('me/blocchi/:utenteId')
  @ApiOperation({
    operationId: 'bloccaUtente',
    summary: 'Blocca una persona: non vedrete più i contenuti l\'uno dell\'altro',
  })
  @ApiWrappedResponse({ description: 'Utente bloccato' })
  @ResponseMessage('successes.UTENTE_BLOCCATO')
  async blocca(
    @Utente() utente: UtenteDiDominio,
    @Param('utenteId') bloccatoId: string,
  ): Promise<null> {
    await this.profilo.blocca(utente.id, bloccatoId);
    return null;
  }

  @Delete('me/blocchi/:utenteId')
  @ApiOperation({ operationId: 'sbloccaUtente', summary: 'Toglie un blocco' })
  @ApiWrappedResponse({ description: 'Utente sbloccato' })
  @ResponseMessage('successes.UTENTE_SBLOCCATO')
  async sblocca(
    @Utente() utente: UtenteDiDominio,
    @Param('utenteId') bloccatoId: string,
  ): Promise<null> {
    await this.profilo.sblocca(utente.id, bloccatoId);
    return null;
  }

  @Get('me/blocchi')
  @ApiOperation({ operationId: 'elencaBlocchi', summary: 'Le persone che hai bloccato' })
  @ApiPaginatedResponse({ type: BloccatoDto })
  elencaBlocchi(
    @Utente() utente: UtenteDiDominio,
    @Query() pagina: PaginationDto,
  ): Promise<PaginatedResult<BloccatoResponse>> {
    return this.profilo.bloccati(utente.id, pagina);
  }
}
