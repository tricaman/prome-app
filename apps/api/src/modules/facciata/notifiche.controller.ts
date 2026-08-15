import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PreferenzeDiNotificaResponse } from '@prome/contracts';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { ProfiloService } from '../profilo/profilo.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import {
  AggiornaPreferenzeDto,
  PreferenzeDiNotificaDto,
  RegistraDispositivoDto,
} from './dtos/notifiche.dto';
import { Utente } from './guardia-accesso';

/**
 * Gli apparecchi su cui si vuole essere raggiunti, e cosa si vuole sapere.
 *
 * Sta sotto Profilo perché è Profilo a possedere «l'Utente come persona
 * identificabile e **contattabile**»: gli apparecchi e le preferenze sono la
 * forma tecnica di quella contattabilità, non un contesto a sé.
 */
@ApiTags('notifiche')
@Controller('notifiche')
export class NotificheController {
  constructor(private readonly profilo: ProfiloService) {}

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
