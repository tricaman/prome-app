import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MaterialeSalvatoResponse, PaginatedResult } from '@prome/contracts';
import { ApiPaginatedResponse, ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { AulaStudioService } from '../aula-studio/aula-studio.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { PaginationDto } from '../../common/dto';
import { MaterialeSalvatoDto } from './dtos/aula-studio.dto';
import { Utente } from './guardia-accesso';

/**
 * La raccolta personale: i materiali messi da parte.
 *
 * **È una collezione a sé** e non un ramo dell'aula, perché la domanda che
 * risponde è «cosa ho messo da parte», non «cosa c'è in quest'aula»: attraversa
 * le aule, e chi la apre non ne ha in mente nessuna. Per la stessa ragione
 * l'indirizzo cita il materiale e non l'aula — il materiale si identifica da
 * solo, e l'ammissione la verifica il modulo che la possiede.
 *
 * `PUT` e non `POST`: mettere da parte due volte lo stesso materiale è **la
 * stessa cosa** che metterlo da parte una volta, e un verbo idempotente lo
 * dice senza bisogno di gestire il doppione.
 */
@ApiTags('materiali-salvati')
@Controller('materiali-salvati')
export class MaterialiSalvatiController {
  constructor(private readonly aule: AulaStudioService) {}

  @Get()
  @ApiOperation({
    operationId: 'elencaMaterialiSalvati',
    summary: 'I materiali che ho messo da parte, dal più recente',
  })
  @ApiPaginatedResponse({ type: MaterialeSalvatoDto })
  elenca(
    @Utente() utente: UtenteDiDominio,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<MaterialeSalvatoResponse>> {
    return this.aule.elencaMaterialiSalvati(utente.id, { page: query.page, limit: query.limit });
  }

  @Put(':materialeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'salvaMateriale',
    summary: 'Mette da parte un materiale di un’aula di cui faccio parte',
  })
  @ApiWrappedResponse({ description: 'Materiale salvato' })
  @ResponseMessage('successes.MATERIALE_SALVATO')
  async salva(
    @Utente() utente: UtenteDiDominio,
    @Param('materialeId') materialeId: string,
  ): Promise<null> {
    await this.aule.salvaMateriale(utente.id, materialeId);
    return null;
  }

  @Delete(':materialeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'dimenticaMateriale', summary: 'Toglie dalla raccolta' })
  @ApiWrappedResponse({ description: 'Materiale tolto dalla raccolta' })
  @ResponseMessage('successes.MATERIALE_DIMENTICATO')
  async dimentica(
    @Utente() utente: UtenteDiDominio,
    @Param('materialeId') materialeId: string,
  ): Promise<null> {
    await this.aule.dimenticaMateriale(utente.id, materialeId);
    return null;
  }
}
