import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { PaginationParams } from '@prome/contracts';

/**
 * Parametri standard di TUTTE le liste. I DTO di query dei moduli la estendono:
 *
 * ```typescript
 * export class QueryPostDto extends PaginationDto { ... }
 * ```
 *
 * I default sono applicati dalla transform, quindi i service possono contare
 * su page/limit/sortOrder sempre presenti.
 */
export class PaginationDto implements PaginationParams {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Campo di ordinamento (dipende dalla risorsa)' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
