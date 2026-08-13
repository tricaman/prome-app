import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_VERSION, type HealthResponse } from '@prome/contracts';
import { env } from '../../config/env';
import { ApiWrappedResponse, ResponseMessage } from '../../common/decorators';
import { SenzaAccesso } from './guardia-accesso';
import { HealthDto } from './dtos/health.dto';

/**
 * Sonda di salute della facciata REST — anche esempio vivo del pattern degli
 * endpoint: dati NUDI in uscita (l'envelope { data, meta } è automatico),
 * @ResponseMessage con chiave tipizzata di successes.json,
 * @ApiWrappedResponse per documentare l'envelope reale.
 */
// Una sonda di salute dietro l'autenticazione non è una sonda: chi controlla
// che il servizio sia vivo — il bilanciatore, il monitoraggio — non ha una
// sessione, e riceverebbe 401 da un servizio perfettamente sano.
@SenzaAccesso()
@ApiTags('sistema')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ operationId: 'statoDelServizio', summary: 'Stato del servizio' })
  @ApiWrappedResponse({ type: HealthDto })
  @ResponseMessage('successes.HEALTH_OK')
  health(): HealthResponse {
    return {
      status: 'ok',
      role: env.APP_ROLE,
      version: API_VERSION,
    };
  }
}
