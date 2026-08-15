import { ApiProperty } from '@nestjs/swagger';
import type { CancellazioneAccountResponse } from '@prome/contracts';

export class CancellazioneRichiestaRispostaDto implements CancellazioneAccountResponse {
  @ApiProperty({ example: '2026-08-15T10:00:00.000Z' })
  richiestaIl!: string;

  @ApiProperty({
    example: '2026-08-29T10:00:00.000Z',
    description: 'Un nuovo accesso entro questo istante annulla la richiesta',
  })
  riattivabileFinoAl!: string;

  @ApiProperty({
    example: '2026-09-14T10:00:00.000Z',
    description: 'Termine massimo entro cui tutto è eliminato o anonimizzato',
  })
  scadenza!: string;
}
