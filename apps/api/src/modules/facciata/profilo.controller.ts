import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProfiloResponse } from '@prome/contracts';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { ProfiloService } from '../profilo/profilo.service';
import { MISURAZIONI, type MisurazioniDiUtilizzo } from '../../infrastruttura/misurazioni/misurazioni';
import type { UtenteDiDominio } from '../profilo/porta-identita-utente';
import { AggiornaPrivacyDto, CompletaProfiloDto, ProfiloDto } from './dtos/profilo.dto';
import { Utente } from './guardia-accesso';

/**
 * Il profilo di chi sta usando Prome.
 *
 * Solo il proprio: non c'è un endpoint per leggere il profilo di un altro, e
 * quando ci sarà dovrà passare dalle regole di visibilità del contesto Profilo,
 * non da qui.
 */
@ApiTags('profilo')
@Controller('profilo')
export class ProfiloController {
  constructor(
    private readonly profilo: ProfiloService,
    @Inject(MISURAZIONI) private readonly misurazioni: MisurazioniDiUtilizzo,
  ) {}

  @Get('me')
  @ApiOperation({ operationId: 'leggiMioProfilo', summary: 'Il profilo di chi ha la sessione' })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.PROFILO_LETTO')
  leggi(@Utente() utente: UtenteDiDominio): Promise<ProfiloResponse> {
    return this.profilo.perUtente(utente.id);
  }

  @Put('me')
  @ApiOperation({
    operationId: 'completaMioProfilo',
    summary: 'Completa l\'onboarding con nome, cognome, università e corso',
  })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.PROFILO_COMPLETATO')
  async completa(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: CompletaProfiloDto,
  ): Promise<ProfiloResponse> {
    const profilo = await this.profilo.completaOnboarding(utente.id, corpo);
    // Niente università né corso nell'evento: sono dati del profilo, non una
    // misura di prodotto.
    this.misurazioni.registra('onboarding_completato', { utenteId: utente.id });
    return profilo;
  }

  /**
   * Le regole di privacy: il solo gesto che le cambia.
   *
   * Nessun evento di misurazione. Quante persone aprono i propri contenuti
   * sarebbe una domanda legittima, ma l'elenco degli eventi è chiuso per
   * scelta, e una decisione di privacy contata è una decisione che comincia a
   * lasciare una traccia altrove.
   */
  @Put('me/privacy')
  @ApiOperation({
    operationId: 'aggiornaMiaPrivacy',
    summary: 'Cambia chi può contattarti e chi vede i tuoi contenuti',
  })
  @ApiWrappedResponse({ type: ProfiloDto })
  @ResponseMessage('successes.PRIVACY_AGGIORNATA')
  aggiornaPrivacy(
    @Utente() utente: UtenteDiDominio,
    @Body() corpo: AggiornaPrivacyDto,
  ): Promise<ProfiloResponse> {
    return this.profilo.aggiornaImpostazioni(utente.id, corpo);
  }
}
