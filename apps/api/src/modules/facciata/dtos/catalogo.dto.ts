import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import type {
  ClasseDiCorsoResponse,
  CorsoResponse,
  LivelloDiCorso,
  UniversitaResponse,
} from '@prome/contracts';
import { PaginationDto } from '../../../common/dto';

const LIVELLI = ['TRIENNALE', 'MAGISTRALE', 'CICLO_UNICO'] as const;

export class UniversitaDto implements UniversitaResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Lo stesso della pagina pubblica di ateneo' }) slug!: string;
  @ApiProperty({ example: 'Università di Bologna' }) nome!: string;
  @ApiProperty({ example: 'UniBo' }) nomeBreve!: string;
  @ApiProperty({ example: 'Bologna' }) citta!: string;
}

export class ClasseDiCorsoDto implements ClasseDiCorsoResponse {
  @ApiProperty({ example: 'L-18 R', description: 'Codice ministeriale della classe' })
  codice!: string;

  @ApiProperty({ example: 'Scienze dell\'economia e della gestione aziendale' })
  nome!: string;

  @ApiProperty({ enum: LIVELLI })
  livello!: LivelloDiCorso;
}

export class CorsoDto implements CorsoResponse {
  @ApiProperty() id!: string;

  @ApiProperty({ example: '6612', description: 'Codice dell\'ateneo: unico dentro l\'ateneo' })
  codice!: string;

  @ApiProperty({ example: 'Economia e commercio' }) nome!: string;
  @ApiProperty({ example: 3 }) durataAnni!: number;
  @ApiProperty({ type: ClasseDiCorsoDto }) classe!: ClasseDiCorsoResponse;
  @ApiProperty({ type: UniversitaDto }) universita!: UniversitaResponse;
}

/**
 * La ricerca è facoltativa: senza, si ottiene l'elenco intero paginato — è la
 * schermata di chi apre il campo e guarda cosa c'è prima di digitare.
 */
export class RicercaNelCatalogoDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'polimi' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 120)
  ricerca?: string;
}
