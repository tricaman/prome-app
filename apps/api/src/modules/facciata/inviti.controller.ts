import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { InvitoResponse } from '@prome/contracts';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { AulaStudioService } from '../aula-studio/aula-studio.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { InvitoDto } from './dtos/aula-studio.dto';
import { Utente } from './guardia-accesso';

/**
 * Gli inviti, con l'indirizzo che sta fuori dall'aula perché chi li riceve
 * arriva da un collegamento e spesso non è ancora dentro nulla.
 */
@ApiTags('inviti')
@Controller('inviti')
export class InvitiController {
  constructor(private readonly aule: AulaStudioService) {}

  @Get(':id')
  @ApiOperation({
    operationId: 'leggiInvito',
    summary: 'Stato dell\'invito, incluso se il partecipante è ormai comparso',
  })
  @ApiWrappedResponse({ type: InvitoDto })
  async leggi(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitoResponse> {
    return this.aule.leggiInvito(utente.id, id);
  }

  /**
   * **202, non 201.**
   *
   * L'accettazione non crea il partecipante nella stessa transazione (IA3):
   * rispondere 201 sarebbe mentire al client su un'entità che ancora non
   * esiste. Il 202 seguito da `GET /inviti/{id}` espone esattamente la
   * finestra che il dominio ha dichiarato — pochi secondi, ed è la più stretta
   * del sistema perché c'è una persona che guarda lo schermo.
   */
  @Post(':id/accettazione')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: 'accettaInvito',
    summary: 'Accetta l\'invito: l\'ingresso è preso in carico',
  })
  @ApiWrappedResponse({ type: InvitoDto })
  @ResponseMessage('successes.INVITO_ACCETTATO')
  async accetta(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitoResponse> {
    return this.aule.accetta(utente.id, id);
  }

  /**
   * **200, non 202.**
   *
   * È la differenza con l'accettazione, ed è tutta nel dominio: accettare
   * prende in carico la nascita di un partecipante che non c'è ancora,
   * rifiutare non lascia niente in sospeso. L'invito è chiuso quando la
   * risposta arriva, e non c'è un secondo `GET` da fare per sapere com'è
   * finita.
   */
  @Post(':id/rifiuto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'rifiutaInvito',
    summary: 'Rifiuta l\'invito: l\'invito si chiude e non nasce nulla',
  })
  @ApiWrappedResponse({ type: InvitoDto })
  @ResponseMessage('successes.INVITO_RIFIUTATO')
  async rifiuta(
    @Utente() utente: UtenteDiDominio,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitoResponse> {
    return this.aule.rifiuta(utente.id, id);
  }
}
