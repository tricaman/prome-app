import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import type {
  CreaSegnalazioneRequest,
  MotivoDiSegnalazione,
  TipoDiSoggettoSegnalato,
} from '@prome/contracts';

const TIPI: TipoDiSoggettoSegnalato[] = ['POST', 'COMMENTO'];
const MOTIVI: MotivoDiSegnalazione[] = ['SPAM', 'MOLESTIE', 'CONTENUTO_INAPPROPRIATO'];

/**
 * Una segnalazione: cosa, e perché, da due elenchi chiusi. Nessun campo
 * libero di proposito — diventerebbe un canale di comunicazione da
 * presidiare, e il motivo serve a smistare, non a raccontare.
 */
export class CreaSegnalazioneDto implements CreaSegnalazioneRequest {
  @ApiProperty({ enum: TIPI })
  @IsIn(TIPI)
  tipo!: TipoDiSoggettoSegnalato;

  @ApiProperty({ description: 'Identificativo del contenuto segnalato' })
  @IsUUID()
  soggettoId!: string;

  @ApiProperty({ enum: MOTIVI })
  @IsIn(MOTIVI)
  motivo!: MotivoDiSegnalazione;
}
