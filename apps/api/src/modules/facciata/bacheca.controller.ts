import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CommentoResponse,
  PaginatedResult,
  PostResponse,
  PreautorizzaAllegatoResponse,
} from '@prome/contracts';
import { ApiPaginatedResponse, ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';
import { BachecaService } from '../bacheca/bacheca.service';
import { MISURAZIONI, type MisurazioniDiUtilizzo } from '../../infrastruttura/misurazioni/misurazioni';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import {
  CommentoDto,
  CreaCommentoDto,
  CreaPostDto,
  ModificaPostDto,
  PostDto,
  QueryPostDto,
  PreautorizzaAllegatoDto,
  PreautorizzaAllegatoRispostaDto,
} from './dtos/bacheca.dto';
import { Utente } from './guardia-accesso';

/**
 * La bacheca: post con allegati.
 *
 * Il caricamento è in due tempi — si chiede l'autorizzazione, si mandano i
 * byte direttamente all'archivio, poi si pubblica citando le chiavi — perché
 * far transitare 25 MB da qui vorrebbe dire pagarli due volte in banda e
 * tenere occupato un processo per tutta la durata del caricamento.
 */
@ApiTags('bacheca')
@Controller('bacheca')
export class BachecaController {
  constructor(
    private readonly bacheca: BachecaService,
    @Inject(MISURAZIONI) private readonly misurazioni: MisurazioniDiUtilizzo,
  ) {}

  @Post('allegati/pre-autorizzazione')
  // Non crea una risorsa che il client possa poi indirizzare: autorizza un
  // caricamento. 201 prometterebbe qualcosa che non c'è, e contraddirebbe la
  // spec che questo stesso endpoint pubblica.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'preautorizzaAllegato',
    summary: 'Autorizza il caricamento di un file e prenota la sua chiave',
  })
  @ApiWrappedResponse({ type: PreautorizzaAllegatoRispostaDto })
  @ResponseMessage('successes.ALLEGATO_PREAUTORIZZATO')
  async preautorizza(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: PreautorizzaAllegatoDto,
  ): Promise<PreautorizzaAllegatoResponse> {
    const esito = await this.bacheca.preautorizzaAllegato(utente.id, corpo);
    // Il tipo è una categoria, il nome del file no: quello resta fuori.
    this.misurazioni.registra('allegato_caricato', { utenteId: utente.id, tipo: corpo.tipo });
    return {
      chiave: esito.chiave,
      url: esito.url,
      metodo: esito.metodo,
      intestazioni: esito.intestazioni,
      scadeIl: esito.scadeIl.toISOString(),
    };
  }

  @Post()
  @ApiOperation({ operationId: 'pubblicaPost', summary: 'Pubblica un post, con i suoi allegati' })
  @ApiWrappedResponse({ type: PostDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.POST_PUBBLICATO')
  async pubblica(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: CreaPostDto,
  ): Promise<PostResponse> {
    const post = await this.bacheca.pubblica(utente.id, corpo);
    // Quanti allegati, non quali: il numero è una misura, i file no.
    this.misurazioni.registra('post_pubblicato', {
      utenteId: utente.id,
      allegati: post.allegati.length,
    });
    return post;
  }

  @Get()
  @ApiOperation({
    operationId: 'elencaPost',
    summary: 'La bacheca di chi legge, dal più recente',
  })
  @ApiPaginatedResponse({ type: PostDto })
  @ResponseMessage('successes.POST_ELENCATI')
  elenca(
    @Utente() utente: UtenteDiDominio,
    @Query() query: QueryPostDto,
  ): Promise<PaginatedResult<PostResponse>> {
    return this.bacheca.elenca(
      utente.id,
      { page: query.page, limit: query.limit },
      { soloMiei: query.soloMiei ?? false },
    );
  }

  @Get(':id')
  @ApiOperation({ operationId: 'leggiPost', summary: 'Un post, se chi legge può vederlo' })
  @ApiWrappedResponse({ type: PostDto })
  leggi(@Utente() utente: UtenteDiDominio, @Param('id') id: string): Promise<PostResponse> {
    return this.bacheca.leggi(utente.id, id);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'modificaPost', summary: 'Corregge il testo di un proprio post' })
  @ApiWrappedResponse({ type: PostDto })
  @ResponseMessage('successes.POST_MODIFICATO')
  modifica(
    @Utente() utente: UtenteDiDominio,
    @Param('id') id: string,
    @Body() corpo: ModificaPostDto,
  ): Promise<PostResponse> {
    return this.bacheca.modifica(utente.id, id, corpo.testo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'eliminaPost', summary: 'Elimina un proprio post e i suoi allegati' })
  @ApiWrappedResponse({ description: 'Post eliminato' })
  @ResponseMessage('successes.POST_ELIMINATO')
  async elimina(@Utente() utente: UtenteDiDominio, @Param('id') id: string): Promise<null> {
    await this.bacheca.elimina(utente.id, id);
    return null;
  }

  @Get(':id/commenti')
  @ApiOperation({ operationId: 'elencaCommenti', summary: 'I commenti di un post, dal più vecchio' })
  @ApiPaginatedResponse({ type: CommentoDto })
  @ResponseMessage('successes.COMMENTI_ELENCATI')
  commenti(
    @Utente() utente: UtenteDiDominio,
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<CommentoResponse>> {
    return this.bacheca.commentiDi(utente.id, id, { page: query.page, limit: query.limit });
  }

  @Post(':id/commenti')
  @ApiOperation({ operationId: 'commentaPost', summary: 'Commenta un post' })
  @ApiWrappedResponse({ type: CommentoDto, status: HttpStatus.CREATED })
  @ResponseMessage('successes.COMMENTO_PUBBLICATO')
  commenta(
    @Utente() utente: UtenteDiDominio,
    @Param('id') id: string,
    @Body() corpo: CreaCommentoDto,
  ): Promise<CommentoResponse> {
    return this.bacheca.commenta(utente.id, id, corpo.testo);
  }

  @Delete('commenti/:commentoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'eliminaCommento',
    summary: 'Elimina un commento: proprio, o sotto un proprio post',
  })
  @ApiWrappedResponse({ description: 'Commento eliminato' })
  @ResponseMessage('successes.COMMENTO_ELIMINATO')
  async eliminaCommento(
    @Utente() utente: UtenteDiDominio,
    @Param('commentoId') commentoId: string,
  ): Promise<null> {
    await this.bacheca.eliminaCommento(utente.id, commentoId);
    return null;
  }
}
