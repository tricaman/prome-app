import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  LUNGHEZZA_MASSIMA_NOME_GRUPPO,
  type CreaGruppoRequest,
  type CreaInvitoAlGruppoRequest,
  type DettaglioGruppoResponse,
  type GruppoResponse,
  type InvitoAlGruppoResponse,
  type MembroResponse,
  type ModificaGruppoRequest,
  type StatoInvitoAlGruppo,
  type VisibilitaGruppo,
} from '@prome/contracts';
import { PaginationDto } from '../../../common/dto';

const VISIBILITA = ['PRIVATO', 'ATENEO', 'PUBBLICO'] as const;
const STATI = ['IN_ATTESA', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO'] as const;

/** Spazi ai bordi tolti prima della validazione: "  " non è un nome valido. */
const ripulisci = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class MembroDto implements MembroResponse {
  @ApiProperty()
  utenteId!: string;

  @ApiProperty({ nullable: true, type: String })
  nome!: string | null;

  @ApiProperty({ nullable: true, type: String })
  cognome!: string | null;

  @ApiProperty({ nullable: true, type: String })
  universita!: string | null;

  @ApiPropertyOptional({ description: 'Vero se l\'account non esiste più' })
  rimosso?: boolean;

  @ApiProperty({ description: 'Vale solo dentro il gruppo: non concede nulla in un\'aula' })
  moderatore!: boolean;

  @ApiProperty()
  entratoIl!: string;
}

export class GruppoDto implements GruppoResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nome!: string;

  @ApiProperty({ enum: VISIBILITA })
  visibilita!: VisibilitaGruppo;

  @ApiProperty({ nullable: true, type: String, description: 'Congelato alla creazione' })
  ateneo!: string | null;

  @ApiProperty()
  creatoIl!: string;

  @ApiProperty()
  membri!: number;

  @ApiProperty()
  sonoMembro!: boolean;

  @ApiProperty()
  sonoModeratore!: boolean;
}

export class DettaglioGruppoDto implements DettaglioGruppoResponse {
  @ApiProperty({ type: GruppoDto })
  gruppo!: GruppoDto;

  @ApiProperty({ type: [MembroDto] })
  membri!: MembroDto[];
}

export class CreaGruppoDto implements CreaGruppoRequest {
  @ApiProperty({ example: 'Ingegneria informatica – 2° anno' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_NOME_GRUPPO)
  nome!: string;

  @ApiPropertyOptional({ enum: VISIBILITA, default: 'PRIVATO' })
  @IsOptional()
  @IsEnum(VISIBILITA)
  visibilita?: VisibilitaGruppo;
}

/**
 * L'ateneo non c'è, e la pipe rifiuta chi prova a mandarlo: è congelato alla
 * creazione (G5), e un gruppo non cambia pubblico dopo essere nato.
 */
export class ModificaGruppoDto implements ModificaGruppoRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_NOME_GRUPPO)
  nome?: string;

  @ApiPropertyOptional({ enum: VISIBILITA })
  @IsOptional()
  @IsEnum(VISIBILITA)
  visibilita?: VisibilitaGruppo;
}

export class CreaInvitoAlGruppoDto implements CreaInvitoAlGruppoRequest {
  @ApiProperty({ example: 'compagno@studenti.unibo.it' })
  @Transform(ripulisci)
  @IsEmail()
  destinatario!: string;
}

export class InvitoAlGruppoDto implements InvitoAlGruppoResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  gruppoId!: string;

  @ApiProperty()
  nomeGruppo!: string;

  @ApiProperty()
  destinatario!: string;

  @ApiProperty({ enum: STATI })
  stato!: StatoInvitoAlGruppo;

  @ApiProperty()
  scadeIl!: string;

  @ApiProperty()
  emessoIl!: string;

  @ApiProperty({ description: 'Falso subito dopo l\'accettazione: il membro nasce dopo (IG3)' })
  membroCreato!: boolean;
}

export class QueryGruppiDto extends PaginationDto {}
