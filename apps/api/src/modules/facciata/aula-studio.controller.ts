import {
  BadRequestException,
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
  AllegatoDiAulaStudioResponse,
  ArgomentoResponse,
  AulaStudioResponse,
  InvitoResponse,
  PaginatedResult,
  PermessoAulaStudio,
  SalaResponse,
} from '@prome/contracts';
import {
  ApiPaginatedResponse,
  ApiWrappedResponse,
  ResponseMessage,
} from '../../common/decorators';
import { AulaStudioService } from '../aula-studio/aula-studio.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import {
  ArgomentoDto,
  AulaStudioDto,
  CreaArgomentoDto,
  CreaAulaStudioDto,
  CreaInvitoDto,
  CreaMaterialeDto,
  InvitoDto,
  MaterialeDto,
  ModificaAulaStudioDto,
  PreautorizzaMaterialeDto,
  PreautorizzazioneMaterialeDto,
  QueryAuleStudioDto,
  SalaDto,
} from './dtos/aula-studio.dto';
import { Utente } from './guardia-accesso';

/** I tre soli permessi: la strada per gli altri non esiste (AS4). */
const PERMESSI_AMMESSI: readonly string[] = ['parlare', 'scrivere', 'caricare'];

/**
 * L'aula studio verso il client.
 *
 * La facciata orchestra e non decide: chi può moderare, chi può caricare e chi
 * può entrare lo stabilisce il modulo proprietario, sul proprio dato, nel
 * momento del gesto. Qui non c'è una sola riga che somigli a un permesso.
 */
@ApiTags('aule studio')
@Controller('aule-studio')
export class AulaStudioController {
  constructor(private readonly aule: AulaStudioService) {}

  @Post()
  @ApiOperation({ operationId: 'creaAulaStudio', summary: 'Crea un\'aula studio' })
  @ApiWrappedResponse({ type: AulaStudioDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.AULA_CREATA')
  async crea(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: CreaAulaStudioDto,
  ): Promise<AulaStudioResponse> {
    return this.aule.crea(utente.id, corpo);
  }

  @Get()
  @ApiOperation({ operationId: 'elencaAuleStudio', summary: 'Le aule di cui faccio parte' })
  @ApiPaginatedResponse({ type: AulaStudioDto })
  async elenca(
    @Utente() utente: UtenteDiDominio,
    @Query() query: QueryAuleStudioDto,
  ): Promise<PaginatedResult<AulaStudioResponse>> {
    return this.aule.elenca(utente.id, { page: query.page, limit: query.limit });
  }

  @Get(':id/sala')
  @ApiOperation({
    operationId: 'apriSalaAulaStudio',
    summary: 'Apre l\'aula: partecipanti, argomenti e materiali in una sola risposta',
  })
  @ApiWrappedResponse({ type: SalaDto })
  async sala(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalaResponse> {
    return this.aule.leggiSala(utente.id, id);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'modificaAulaStudio', summary: 'Modifica un\'aula studio' })
  @ApiWrappedResponse({ type: AulaStudioDto })
  @ResponseMessage('successes.AULA_MODIFICATA')
  async modifica(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: ModificaAulaStudioDto,
  ): Promise<AulaStudioResponse> {
    return this.aule.modifica(utente.id, id, corpo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'eliminaAulaStudio', summary: 'Elimina un\'aula studio vuota' })
  @ApiWrappedResponse({ description: 'Aula eliminata' })
  @ResponseMessage('successes.AULA_ELIMINATA')
  async elimina(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.aule.elimina(utente.id, id);
    return null;
  }

  // --- Ammissione e partecipanti --------------------------------------------

  @Post(':id/ingresso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'entraInAulaStudio',
    summary: 'Chiede di entrare: il titolo di ammissione è risolto su dato fresco',
  })
  @ApiWrappedResponse({ description: 'Ingresso effettuato' })
  @ResponseMessage('successes.AULA_INGRESSO')
  async entra(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.aule.entra(utente.id, id);
    return null;
  }

  @Delete(':id/partecipanti/:utenteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'rimuoviPartecipante',
    summary: 'Esce dall\'aula, o rimuove qualcuno se si modera',
  })
  @ApiWrappedResponse({ description: 'Partecipante rimosso' })
  @ResponseMessage('successes.PARTECIPANTE_RIMOSSO')
  async rimuovi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
  ): Promise<null> {
    await this.aule.rimuoviPartecipante(utente.id, id, utenteId);
    return null;
  }

  @Post(':id/partecipanti/:utenteId/moderazione')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'promuoviAModeratore', summary: 'Promuove a moderatore' })
  @ApiWrappedResponse({ description: 'Ora è moderatore' })
  @ResponseMessage('successes.MODERAZIONE_CONCESSA')
  async promuovi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
  ): Promise<null> {
    await this.aule.promuovi(utente.id, id, utenteId);
    return null;
  }

  @Delete(':id/partecipanti/:utenteId/moderazione')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'retrocediDaModeratore', summary: 'Toglie il ruolo di moderatore' })
  @ApiWrappedResponse({ description: 'Non è più moderatore' })
  @ResponseMessage('successes.MODERAZIONE_REVOCATA')
  async retrocedi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
  ): Promise<null> {
    await this.aule.retrocedi(utente.id, id, utenteId);
    return null;
  }

  /**
   * Un permesso alla volta, mai un insieme (AS4).
   *
   * Non esiste un endpoint per la sola lettura: quella si raggiunge per
   * revoche successive. Un `POST .../sola-lettura` reintrodurrebbe come gesto
   * ciò che il linguaggio ha eliminato come ruolo.
   */
  @Post(':id/partecipanti/:utenteId/permessi/:permesso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'concediPermesso', summary: 'Concede UN permesso' })
  @ApiWrappedResponse({ description: 'Permesso concesso' })
  @ResponseMessage('successes.PERMESSO_CONCESSO')
  async concedi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
    @Param('permesso') permesso: string,
  ): Promise<null> {
    await this.aule.cambiaPermesso(utente.id, id, utenteId, esigiPermesso(permesso), true);
    return null;
  }

  @Delete(':id/partecipanti/:utenteId/permessi/:permesso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'revocaPermesso', summary: 'Revoca UN permesso' })
  @ApiWrappedResponse({ description: 'Permesso revocato' })
  @ResponseMessage('successes.PERMESSO_REVOCATO')
  async revoca(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('utenteId') utenteId: string,
    @Param('permesso') permesso: string,
  ): Promise<null> {
    await this.aule.cambiaPermesso(utente.id, id, utenteId, esigiPermesso(permesso), false);
    return null;
  }

  // --- Inviti ---------------------------------------------------------------

  @Post(':id/inviti')
  @ApiOperation({ operationId: 'invitaInAulaStudio', summary: 'Invita qualcuno via email' })
  @ApiWrappedResponse({ type: InvitoDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.INVITO_EMESSO')
  async invita(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: CreaInvitoDto,
  ): Promise<InvitoResponse> {
    return this.aule.invita(utente.id, id, corpo.destinatario);
  }

  // --- Argomenti e materiali ------------------------------------------------

  @Post(':id/argomenti')
  @ApiOperation({ operationId: 'creaArgomento', summary: 'Crea un argomento nell\'aula' })
  @ApiWrappedResponse({ type: ArgomentoDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.ARGOMENTO_CREATO')
  async creaArgomento(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: CreaArgomentoDto,
  ): Promise<ArgomentoResponse> {
    return this.aule.creaArgomento(utente.id, id, corpo);
  }

  @Delete(':id/argomenti/:argomentoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'eliminaArgomento',
    summary: 'Elimina un argomento: i materiali restano e tornano sciolti',
  })
  @ApiWrappedResponse({ description: 'Argomento eliminato' })
  @ResponseMessage('successes.ARGOMENTO_ELIMINATO')
  async eliminaArgomento(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('argomentoId', ParseUUIDPipe) argomentoId: string,
  ): Promise<null> {
    await this.aule.eliminaArgomento(utente.id, id, argomentoId);
    return null;
  }

  @Post(':id/allegati/pre-autorizzazione')
  @ApiOperation({
    operationId: 'preautorizzaMaterialeAula',
    summary: 'Autorizza il caricamento di un materiale (i byte non passano di qui)',
  })
  @ApiWrappedResponse({ type: PreautorizzazioneMaterialeDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.ALLEGATO_PREAUTORIZZATO')
  async preautorizza(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: PreautorizzaMaterialeDto,
  ) {
    return this.aule.preautorizzaMateriale(utente.id, id, corpo);
  }

  @Post(':id/allegati')
  @ApiOperation({ operationId: 'condividiMaterialeAula', summary: 'Condivide un materiale' })
  @ApiWrappedResponse({ type: MaterialeDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.MATERIALE_CARICATO')
  async aggiungiMateriale(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: CreaMaterialeDto,
  ): Promise<AllegatoDiAulaStudioResponse> {
    return this.aule.aggiungiMateriale(utente.id, id, corpo);
  }

  @Delete(':id/allegati/:materialeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'eliminaMaterialeAula', summary: 'Elimina un materiale' })
  @ApiWrappedResponse({ description: 'Materiale eliminato' })
  @ResponseMessage('successes.MATERIALE_ELIMINATO')
  async eliminaMateriale(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('materialeId', ParseUUIDPipe) materialeId: string,
  ): Promise<null> {
    await this.aule.eliminaMateriale(utente.id, id, materialeId);
    return null;
  }
}

/**
 * Il permesso arriva dall'indirizzo: o è uno dei tre, o la strada non esiste.
 * Un quarto valore non è un errore di dominio, è una rotta che non c'è.
 */
function esigiPermesso(valore: string): PermessoAulaStudio {
  if (!PERMESSI_AMMESSI.includes(valore)) {
    throw new BadRequestException(`Permesso non riconosciuto: ${valore}`);
  }
  return valore as PermessoAulaStudio;
}
