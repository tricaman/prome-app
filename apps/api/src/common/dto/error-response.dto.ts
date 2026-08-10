import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiErrorResponse, ValidationErrorDetail } from '@prome/contracts';

export class ValidationErrorDetailDto implements ValidationErrorDetail {
  @ApiProperty({ example: 'titolo' })
  field!: string;

  @ApiProperty({ example: 'isNotEmpty' })
  constraint!: string;

  @ApiProperty({ example: 'Campo obbligatorio' })
  message!: string;
}

/** Rappresentazione OpenAPI di ApiErrorResponse del contratto client. */
export class ErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({
    example: 'PR001',
    description: 'Localizzatore del punto in cui l’errore è stato lanciato (indipendente dal messaggio)',
  })
  errorCode!: string;

  @ApiProperty({
    example: 'Profilo non trovato',
    description: 'Messaggio già tradotto nella lingua della richiesta',
  })
  message!: string;

  @ApiProperty({
    example: '419c6fbd-a6d2-4a75-84c2-8c9e9c06a015',
    description: 'UUID per correlare la segnalazione con i log del server',
  })
  errorId!: string;

  @ApiProperty({ example: '2026-08-09T12:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({
    type: [ValidationErrorDetailDto],
    description: 'Presente solo per gli errori di validazione (errorCode V001)',
  })
  details?: ValidationErrorDetailDto[];
}
