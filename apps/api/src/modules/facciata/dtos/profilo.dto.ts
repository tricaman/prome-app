import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import type {
  CompletaProfiloRequest,
  ImpostazioniDiPrivacyResponse,
  ProfiloResponse,
  Visibilita,
} from '@prome/contracts';

const VISIBILITA = ['PRIVATO', 'ATENEO', 'PUBBLICO'] as const;

/** Spazi ai bordi tolti prima della validazione: "  " non è un nome valido. */
const ripulisci = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ImpostazioniDiPrivacyDto implements ImpostazioniDiPrivacyResponse {
  @ApiProperty({ enum: VISIBILITA, description: 'Chi può scriverti e invitarti' })
  contattabilita!: Visibilita;

  @ApiProperty({ enum: VISIBILITA, description: 'Chi vede i tuoi contenuti' })
  visibilita!: Visibilita;
}

export class ProfiloDto implements ProfiloResponse {
  @ApiProperty()
  utenteId!: string;

  @ApiProperty({ nullable: true, type: String })
  nome!: string | null;

  @ApiProperty({ nullable: true, type: String })
  cognome!: string | null;

  @ApiProperty({ nullable: true, type: String })
  universita!: string | null;

  @ApiProperty({ nullable: true, type: String })
  corso!: string | null;

  @ApiProperty()
  onboardingCompletato!: boolean;

  @ApiProperty({ type: ImpostazioniDiPrivacyDto })
  impostazioniPrivacy!: ImpostazioniDiPrivacyDto;
}

/**
 * I quattro dati arrivano insieme: l'onboarding è completo se e solo se ci
 * sono tutti e quattro, quindi non esiste un aggiornamento parziale da
 * modellare. L'università è autodichiarata e non viene verificata.
 */
export class CompletaProfiloDto implements CompletaProfiloRequest {
  @ApiProperty({ example: 'Marta' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, 80)
  nome!: string;

  @ApiProperty({ example: 'Rossi' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, 80)
  cognome!: string;

  @ApiProperty({ example: 'Università di Bologna' })
  @Transform(ripulisci)
  @IsString()
  @Length(2, 160)
  universita!: string;

  @ApiProperty({ example: 'Ingegneria informatica' })
  @Transform(ripulisci)
  @IsString()
  @Length(2, 160)
  corso!: string;
}
