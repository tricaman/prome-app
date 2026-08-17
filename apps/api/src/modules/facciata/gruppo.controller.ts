import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  DettaglioGruppoResponse,
  GruppoResponse,
  InvitoAlGruppoResponse,
  PaginatedResult,
} from '@prome/contracts';
import { ApiPaginatedResponse, ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { GruppoService } from '../gruppo/gruppo.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import {
  CreaGruppoDto,
  CreaInvitoAlGruppoDto,
  DettaglioGruppoDto,
  GruppoDto,
  InvitoAlGruppoDto,
  ModificaGruppoDto,
  QueryGruppiDto,
} from './dtos/gruppo.dto';
import { Utente } from './guardia-accesso';

/**
 * Il gruppo verso il client.
 *
 * La facciata orchestra e non decide: chi modera, chi può invitare e chi può
 * vedere un gruppo lo stabilisce il modulo proprietario, sul proprio dato, nel
 * momento del gesto.
 */
@ApiTags('gruppi')
@Controller('gruppi')
export class GruppoController {
  constructor(private readonly gruppi: GruppoService) {}

  @Post()
  @ApiOperation({ operationId: 'creaGruppo', summary: 'Crea un gruppo' })
  @ApiWrappedResponse({ type: GruppoDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.GRUPPO_CREATO')
  crea(@Utente() utente: UtenteDiDominio, @Body() corpo: CreaGruppoDto): Promise<GruppoResponse> {
    return this.gruppi.crea(utente.id, corpo);
  }

  @Get()
  @ApiOperation({ operationId: 'elencaMieiGruppi', summary: 'I gruppi di cui faccio parte' })
  @ApiPaginatedResponse({ type: GruppoDto })
  elenca(
    @Utente() utente: UtenteDiDominio,
    @Query() query: QueryGruppiDto,
  ): Promise<PaginatedResult<GruppoResponse>> {
    return this.gruppi.elenca(utente.id, query);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'leggiGruppo', summary: 'Il gruppo con i suoi membri' })
  @ApiWrappedResponse({ type: DettaglioGruppoDto })
  dettaglio(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DettaglioGruppoResponse> {
    return this.gruppi.dettaglio(utente.id, id);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'modificaGruppo', summary: 'Cambia nome o visibilità' })
  @ApiWrappedResponse({ type: GruppoDto })
  @ResponseMessage('successes.GRUPPO_MODIFICATO')
  modifica(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: ModificaGruppoDto,
  ): Promise<GruppoResponse> {
    return this.gruppi.modifica(utente.id, id, corpo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'eliminaGruppo',
    summary: 'Elimina il gruppo (le aule collocate restano, e tornano sciolte)',
  })
  @ApiWrappedResponse({ description: 'Gruppo eliminato' })
  @ResponseMessage('successes.GRUPPO_ELIMINATO')
  async elimina(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.gruppi.elimina(utente.id, id);
    return null;
  }

  // --- I membri -------------------------------------------------------------

  @Delete(':id/membri/:utenteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'rimuoviMembro',
    summary: 'Rimuove un membro, o esce dal gruppo',
  })
  @ApiWrappedResponse({ description: 'Membro rimosso' })
  @ResponseMessage('successes.GRUPPO_MEMBRO_RIMOSSO')
  async rimuoviMembro(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
  ): Promise<null> {
    await this.gruppi.rimuoviMembro(utente.id, id, utenteId);
    return null;
  }

  @Post(':id/membri/:utenteId/moderazione')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'promuoviNelGruppo', summary: 'Promuove a moderatore del gruppo' })
  @ApiWrappedResponse({ description: 'Promosso' })
  @ResponseMessage('successes.GRUPPO_MODERATORE_PROMOSSO')
  async promuovi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
  ): Promise<null> {
    await this.gruppi.promuovi(utente.id, id, utenteId);
    return null;
  }

  @Delete(':id/membri/:utenteId/moderazione')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'retrocediNelGruppo', summary: 'Toglie il ruolo di moderatore' })
  @ApiWrappedResponse({ description: 'Retrocesso' })
  @ResponseMessage('successes.GRUPPO_MODERATORE_RETROCESSO')
  async retrocedi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
  ): Promise<null> {
    await this.gruppi.retrocedi(utente.id, id, utenteId);
    return null;
  }

  // --- Inviti ---------------------------------------------------------------

  @Post(':id/inviti')
  @ApiOperation({ operationId: 'invitaNelGruppo', summary: 'Invita un indirizzo nel gruppo' })
  @ApiWrappedResponse({ type: InvitoAlGruppoDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.GRUPPO_INVITO_EMESSO')
  invita(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: CreaInvitoAlGruppoDto,
  ): Promise<InvitoAlGruppoResponse> {
    return this.gruppi.invita(utente.id, id, corpo.destinatario);
  }
}

/**
 * Gli inviti al gruppo hanno un percorso proprio, e non è simmetria: un invito
 * si apre da un'email, spesso prima di sapere a quale gruppo appartenga, e chi
 * lo apre non è ancora membro di niente.
 */
@ApiTags('gruppi')
@Controller('inviti-gruppo')
export class InvitiAlGruppoController {
  constructor(private readonly gruppi: GruppoService) {}

  @Get(':id')
  @ApiOperation({ operationId: 'leggiInvitoDiGruppo', summary: 'Stato di un invito al gruppo' })
  @ApiWrappedResponse({ type: InvitoAlGruppoDto })
  leggi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitoAlGruppoResponse> {
    return this.gruppi.leggiInvito(utente.id, id);
  }

  /**
   * 202 e non 201: il membro **non** nasce nella stessa transazione (IG3), e
   * dire 201 sarebbe mentire su un'entità che ancora non esiste.
   */
  @Post(':id/accettazione')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ operationId: 'accettaInvitoDiGruppo', summary: 'Accetta l\'invito' })
  @ApiWrappedResponse({ type: InvitoAlGruppoDto })
  @ResponseMessage('successes.GRUPPO_INVITO_ACCETTATO')
  accetta(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitoAlGruppoResponse> {
    return this.gruppi.accetta(utente.id, id);
  }

  /** 200 e non 202: rifiutando non resta niente in sospeso da aspettare. */
  @Post(':id/rifiuto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'rifiutaInvitoDiGruppo', summary: 'Rifiuta l\'invito' })
  @ApiWrappedResponse({ type: InvitoAlGruppoDto })
  @ResponseMessage('successes.GRUPPO_INVITO_RIFIUTATO')
  rifiuta(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitoAlGruppoResponse> {
    return this.gruppi.rifiuta(utente.id, id);
  }
}
