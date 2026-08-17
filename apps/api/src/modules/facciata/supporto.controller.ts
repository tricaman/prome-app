import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { SegnalazioneService } from '../segnalazione/segnalazione.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { RichiestaDiSupportoDto } from './dtos/supporto.dto';
import { Utente } from './guardia-accesso';

/**
 * «Scrivici»: la stessa coda delle segnalazioni, con una domanda invece di un
 * contenuto.
 *
 * Sta nel modulo Segnalazione e non in uno nuovo perché è **la stessa cosa
 * vista dall'altra parte**: qualcuno scrive, qualcuno legge, e il posto in cui
 * si legge è la casella del supporto. Un contesto a sé avrebbe uno schema
 * vuoto, nessun aggregato e nessuna invariante — cioè non sarebbe un contesto.
 *
 * **Serve una sessione**, come per ogni endpoint: la guardia è globale. Non è
 * un modulo di contatto pubblico — quello sta sul sito, dove chi non è entrato
 * può comunque scrivere.
 */
@ApiTags('supporto')
@Controller('supporto')
export class SupportoController {
  constructor(private readonly segnalazioni: SegnalazioneService) {}

  @Post()
  @ApiOperation({
    operationId: 'chiediAiuto',
    summary: 'Manda una richiesta di aiuto al supporto',
  })
  @ApiWrappedResponse({ description: 'Richiesta inoltrata', status: HttpStatus.CREATED })
  @ResponseMessage('successes.RICHIESTA_SUPPORTO_INVIATA')
  async chiedi(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: RichiestaDiSupportoDto,
  ): Promise<null> {
    await this.segnalazioni.inoltraRichiesta(utente.id, corpo);
    return null;
  }
}
