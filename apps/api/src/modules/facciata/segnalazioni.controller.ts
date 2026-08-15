import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { BachecaService } from '../bacheca/bacheca.service';
import { SegnalazioneService } from '../segnalazione/segnalazione.service';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { CreaSegnalazioneDto } from './dtos/segnalazioni.dto';
import { Utente } from './guardia-accesso';

/**
 * Le segnalazioni dei contenuti.
 *
 * La facciata orchestra e non decide, come per l'esportazione: **il soggetto
 * si verifica attraverso la lettura del modulo che lo possiede**, che applica
 * le sue regole di visibilità — *si segnala ciò che si vede*, e un contenuto
 * invisibile risponde 404 come se non esistesse. È anche ciò che procura
 * l'estratto per l'email al supporto senza che Segnalazione conosca i
 * contenuti.
 */
@ApiTags('segnalazioni')
@Controller('segnalazioni')
export class SegnalazioniController {
  constructor(
    private readonly bacheca: BachecaService,
    private readonly segnalazioni: SegnalazioneService,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'segnalaContenuto',
    summary: 'Segnala un post o un commento: qualcuno lo guarda entro 24 ore',
  })
  @ApiWrappedResponse({ description: 'Segnalazione ricevuta', status: HttpStatus.CREATED })
  @ResponseMessage('successes.SEGNALAZIONE_RICEVUTA')
  async segnala(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: CreaSegnalazioneDto,
  ): Promise<null> {
    const contenuto =
      corpo.tipo === 'POST'
        ? (await this.bacheca.leggi(utente.id, corpo.soggettoId)).testo
        : (await this.bacheca.commentoVisibilePer(utente.id, corpo.soggettoId)).testo;

    await this.segnalazioni.registra(
      utente.id,
      corpo.tipo,
      corpo.soggettoId,
      corpo.motivo,
      contenuto,
    );
    return null;
  }
}
