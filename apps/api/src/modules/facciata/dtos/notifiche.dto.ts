import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import type {
  AggiornaPreferenzeDiNotificaRequest,
  ConteggioNotificheResponse,
  NotificaResponse,
  PiattaformaDiNotifica,
  PreferenzeDiNotificaResponse,
  RegistraDispositivoRequest,
  RisorsaDiNotifica,
  TipoDiNotifica,
} from '@prome/contracts';

const PIATTAFORME = ['IOS', 'ANDROID', 'WEB'] as const;
const TIPI_DI_NOTIFICA = ['COMMENTO', 'INVITO_AULA', 'INVITO_GRUPPO'] as const;
const RISORSE_DI_NOTIFICA = ['POST', 'INVITO_AULA', 'INVITO_GRUPPO'] as const;

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

/**
 * La riga della campanella. Non porta testi né nomi: il client traduce dal
 * `tipo`, e la destinazione si costruisce da `risorsaTipo` + `risorsaId`.
 */
export class NotificaDto implements NotificaResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TIPI_DI_NOTIFICA })
  tipo!: TipoDiNotifica;

  @ApiProperty({ enum: RISORSE_DI_NOTIFICA })
  risorsaTipo!: RisorsaDiNotifica;

  @ApiProperty()
  risorsaId!: string;

  @ApiProperty()
  letta!: boolean;

  @ApiProperty()
  creatoIl!: string;
}

/** Il numero sulla campanella: leggero apposta, il badge lo chiede spesso. */
export class ConteggioNotificheDto implements ConteggioNotificheResponse {
  @ApiProperty()
  nonLette!: number;
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
