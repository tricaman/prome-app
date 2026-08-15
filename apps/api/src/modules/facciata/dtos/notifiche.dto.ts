import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import type {
  AggiornaPreferenzeDiNotificaRequest,
  PiattaformaDiNotifica,
  PreferenzeDiNotificaResponse,
  RegistraDispositivoRequest,
} from '@prome/contracts';

const PIATTAFORME = ['IOS', 'ANDROID', 'WEB'] as const;

export class RegistraDispositivoDto implements RegistraDispositivoRequest {
  @ApiProperty({ description: 'Token rilasciato dalla piattaforma' })
  @IsString()
  @Length(1, 512)
  token!: string;

  @ApiProperty({ enum: PIATTAFORME })
  @IsEnum(PIATTAFORME)
  piattaforma!: PiattaformaDiNotifica;
}

export class PreferenzeDiNotificaDto implements PreferenzeDiNotificaResponse {
  @ApiProperty({ description: 'Qualcuno ha commentato un mio contenuto' })
  commenti!: boolean;

  @ApiProperty({ description: 'Sono stato invitato in un\'aula studio o in un gruppo' })
  inviti!: boolean;
}

/** Si cambia un asse alla volta: quello omesso resta com'era. */
export class AggiornaPreferenzeDto implements AggiornaPreferenzeDiNotificaRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commenti?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inviti?: boolean;
}
