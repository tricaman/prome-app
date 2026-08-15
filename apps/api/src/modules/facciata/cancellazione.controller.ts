import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CancellazioneAccountResponse } from '@prome/contracts';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import {
  MISURAZIONI,
  type MisurazioniDiUtilizzo,
} from '../../infrastruttura/misurazioni/misurazioni';
import { CancellazioneService } from '../cancellazione/cancellazione.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { CancellazioneRichiestaRispostaDto } from './dtos/cancellazione.dto';
import { Utente } from './guardia-accesso';

/**
 * L'uscita dal prodotto: avviabile dall'app, come V4 e V5 esigono — non per
 * email, non chiedendo a qualcuno.
 *
 * POST e non DELETE, ed è un 202: il gesto non elimina una risorsa adesso —
 * CREA una richiesta con una grazia di 14 giorni, annullabile rientrando.
 * Nessuna conferma ulteriore qui: la conferma è dell'interfaccia (la parola
 * digitata), e la rete di sicurezza vera è la grazia.
 *
 * Non esiste un endpoint di stato: subito dopo questa risposta ogni sessione
 * è revocata, quindi nessuno potrebbe chiamarlo.
 */
@ApiTags('account')
@Controller('account')
export class CancellazioneController {
  constructor(
    private readonly cancellazione: CancellazioneService,
    @Inject(MISURAZIONI) private readonly misurazioni: MisurazioniDiUtilizzo,
  ) {}

  @Post('cancellazione')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: 'richiediCancellazioneAccount',
    summary: "Chiede la cancellazione dell'account (annullabile rientrando entro 14 giorni)",
  })
  @ApiWrappedResponse({ type: CancellazioneRichiestaRispostaDto })
  @ResponseMessage('successes.CANCELLAZIONE_RICHIESTA')
  async richiedi(@Utente() utente: UtenteDiDominio): Promise<CancellazioneAccountResponse> {
    const esito = await this.cancellazione.richiedi(utente.id);

    // Dopo il gesto riuscito, e senza utenteId: chi chiede di sparire non
    // deve rinascere in una serie storica.
    this.misurazioni.registra('cancellazione_richiesta');

    return esito;
  }
}
