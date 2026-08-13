import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import type {
  RichiestaCodiceRequest,
  RichiestaCodiceResponse,
  VerificaCodiceRequest,
  VerificaCodiceResponse,
} from '@prome/contracts';
import { LUNGHEZZA_CODICE } from '../../../infrastruttura/accesso/better-auth';

/** L'email si normalizza subito: "Mario@X.IT" e "mario@x.it" sono la stessa persona. */
const normalizzaEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RichiestaCodiceDto implements RichiestaCodiceRequest {
  @ApiProperty({ example: 'marta.rossi@studenti.unibo.it' })
  @Transform(normalizzaEmail)
  @IsEmail()
  email!: string;
}

export class RichiestaCodiceRispostaDto implements RichiestaCodiceResponse {
  @ApiProperty({ example: '2026-08-10T21:40:00.000Z' })
  scadeIl!: string;
}

export class VerificaCodiceDto implements VerificaCodiceRequest {
  @ApiProperty({ example: 'marta.rossi@studenti.unibo.it' })
  @Transform(normalizzaEmail)
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '104729', description: `${LUNGHEZZA_CODICE} cifre` })
  @IsString()
  @Length(LUNGHEZZA_CODICE, LUNGHEZZA_CODICE)
  // Solo cifre: uno spazio incollato dalla mail non deve diventare un
  // tentativo sbagliato, e questo vincolo lo dice prima di consumarlo.
  @Matches(/^\d+$/, { message: 'validation.SOLO_CIFRE' })
  codice!: string;
}

export class VerificaCodiceRispostaDto implements VerificaCodiceResponse {
  @ApiProperty({ description: 'Da rimandare come Authorization: Bearer <token>' })
  token!: string;

  @ApiProperty({ example: '2026-09-09T21:40:00.000Z' })
  scadeIl!: string;

  @ApiProperty({ description: "Falso finché i quattro dati del profilo non ci sono" })
  onboardingCompletato!: boolean;
}
