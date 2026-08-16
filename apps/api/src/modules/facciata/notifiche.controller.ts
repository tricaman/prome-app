import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ConteggioNotificheResponse,
  NotificaResponse,
  PaginatedResult,
  PreferenzeDiNotificaResponse,
} from '@prome/contracts';
import { ApiPaginatedResponse, ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProfiloService } from '../profilo/profilo.service';
import { NotificheInAppService } from '../profilo/notifiche-in-app.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import {
  AggiornaPreferenzeDto,
  ConteggioNotificheDto,
  NotificaDto,
  PreferenzeDiNotificaDto,
  RegistraDispositivoDto,
} from './dtos/notifiche.dto';
import { Utente } from './guardia-accesso';

/**
 * La casella delle notifiche, gli apparecchi su cui si vuole essere raggiunti
 * e cosa si vuole sapere.
 *
 * Sta sotto Profilo perché è Profilo a possedere «l'Utente come persona
 * identificabile e **contattabile**»: la casella, gli apparecchi e le
 * preferenze sono la forma tecnica di quella contattabilità, non un contesto
 * a sé.
 */
@ApiTags('notifiche')
@Controller('notifiche')
export class NotificheController {
  constructor(
    private readonly profilo: ProfiloService,
    private readonly notifiche: NotificheInAppService,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'elencaNotifiche', summary: 'Le mie notifiche, dalla più recente' })
  @ApiPaginatedResponse({ type: NotificaDto })
  elenca(
    @Utente() utente: UtenteDiDominio,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<NotificaResponse>> {
    return this.notifiche.elenca(utente.id, query);
  }

  @Get('conteggio')
  @ApiOperation({
    operationId: 'contaNotificheNonLette',
    summary: 'Quante notifiche non ho ancora letto',
  })
  @ApiWrappedResponse({ type: ConteggioNotificheDto })
  conteggio(@Utente() utente: UtenteDiDominio): Promise<ConteggioNotificheResponse> {
    return this.notifiche.contaNonLette(utente.id);
  }

  // Dichiarata PRIMA di `:id/letta`: le rotte si valutano in ordine, e
  // «lette» finirebbe catturato come un id.
  @Put('lette')
  @ApiOperation({ operationId: 'segnaTutteLeNotificheLette', summary: 'Segna tutto come letto' })
  @ApiWrappedResponse({ type: ConteggioNotificheDto })
  @ResponseMessage('successes.NOTIFICHE_LETTE')
  segnaTutte(@Utente() utente: UtenteDiDominio): Promise<ConteggioNotificheResponse> {
    return this.notifiche.segnaTutteLette(utente.id);
  }

  @Put(':id/letta')
  @ApiOperation({ operationId: 'segnaNotificaLetta', summary: 'Segna una notifica come letta' })
  @ApiWrappedResponse({ type: NotificaDto })
  @ResponseMessage('successes.NOTIFICA_LETTA')
  segnaLetta(
    @Utente() utente: UtenteDiDominio,
    @Param('id') id: string,
  ): Promise<NotificaResponse> {
    return this.notifiche.segnaLetta(utente.id, id);
  }

  @Post('dispositivi')
  @ApiOperation({
    operationId: 'registraDispositivo',
    summary: 'Registra un apparecchio su cui ricevere gli avvisi',
  })
  @ApiWrappedResponse({ description: 'Dispositivo registrato', status: HttpStatus.CREATED })
  @ResponseMessage('successes.DISPOSITIVO_REGISTRATO')
  async registra(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: RegistraDispositivoDto,
  ): Promise<null> {
    await this.profilo.registraDispositivo(utente.id, corpo);
    return null;
  }

  @Delete('dispositivi/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'dimenticaDispositivo',
    summary: 'Smette di mandare avvisi a questo apparecchio',
  })
  @ApiWrappedResponse({ description: 'Dispositivo dimenticato' })
  @ResponseMessage('successes.DISPOSITIVO_DIMENTICATO')
  async dimentica(
    @Utente() utente: UtenteDiDominio,
    @Param('token') token: string,
  ): Promise<null> {
    await this.profilo.dimenticaDispositivo(utente.id, token);
    return null;
  }

  @Get('preferenze')
  @ApiOperation({ operationId: 'leggiPreferenzeNotifiche', summary: 'Cosa voglio sapere' })
  @ApiWrappedResponse({ type: PreferenzeDiNotificaDto })
  preferenze(@Utente() utente: UtenteDiDominio): Promise<PreferenzeDiNotificaResponse> {
    return this.profilo.preferenzeDiNotifica(utente.id);
  }

  @Put('preferenze')
  @ApiOperation({
    operationId: 'aggiornaPreferenzeNotifiche',
    summary: 'Accende o spegne un tipo di avviso',
  })
  @ApiWrappedResponse({ type: PreferenzeDiNotificaDto })
  @ResponseMessage('successes.PREFERENZE_AGGIORNATE')
  aggiorna(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: AggiornaPreferenzeDto,
  ): Promise<PreferenzeDiNotificaResponse> {
    return this.profilo.aggiornaPreferenzeDiNotifica(utente.id, corpo);
  }
}
