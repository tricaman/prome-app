import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CorsoResponse, PaginatedResult, UniversitaResponse } from '@prome/contracts';
import { ApiPaginatedResponse } from '../../common/decorators';
import { CatalogoService } from '../profilo/catalogo/catalogo.service';
import { CorsoDto, RicercaNelCatalogoDto, UniversitaDto } from './dtos/catalogo.dto';

/**
 * Il catalogo accademico: gli atenei e i loro corsi.
 *
 * **Solo letture, e nessun endpoint che scriva.** Il catalogo si aggiorna da
 * un posto solo — il file versionato nel repo, portato nel database dalla
 * semina — perché un corso creato da una richiesta HTTP non comparirebbe in
 * alcuna diff e sparirebbe al primo ripristino del database.
 *
 * Restano sotto la guardia globale: si compilano dall'onboarding, che avviene
 * con la sessione già aperta. Il sito pubblico continua a leggere i propri
 * contenuti redazionali e non ha bisogno di questi endpoint.
 */
@ApiTags('catalogo')
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get('universita')
  @ApiOperation({
    operationId: 'elencaUniversita',
    summary: 'Gli atenei del catalogo, con ricerca per nome, sigla o città',
  })
  @ApiPaginatedResponse({ type: UniversitaDto })
  elencaUniversita(@Query() query: RicercaNelCatalogoDto): Promise<PaginatedResult<UniversitaResponse>> {
    return this.catalogo.elencaUniversita(query);
  }

  @Get('universita/:universitaId/corsi')
  @ApiOperation({
    operationId: 'elencaCorsiDiUniversita',
    summary: 'I corsi ancora offerti da un ateneo',
  })
  @ApiPaginatedResponse({ type: CorsoDto })
  elencaCorsi(
    @Param('universitaId') universitaId: string,
    @Query() query: RicercaNelCatalogoDto,
  ): Promise<PaginatedResult<CorsoResponse>> {
    return this.catalogo.corsiDiUniversita(universitaId, query);
  }
}
