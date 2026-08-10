import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaginationMeta, ResponseMeta } from '@prome/contracts';

/** Rappresentazione OpenAPI di PaginationMeta del contratto client. */
export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

/** Rappresentazione OpenAPI di ResponseMeta del contratto client. */
export class ResponseMetaDto implements ResponseMeta {
  @ApiProperty({ example: 200 })
  status!: number;

  @ApiProperty({
    example: 'Operazione completata',
    description: 'Messaggio di esito, già tradotto nella lingua della richiesta',
  })
  message!: string;

  @ApiProperty({ example: '2026-08-09T12:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({ type: PaginationMetaDto })
  pagination?: PaginationMetaDto;
}
