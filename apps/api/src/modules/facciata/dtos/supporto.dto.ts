import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import {
  CATEGORIE_DI_SUPPORTO,
  LUNGHEZZA_MASSIMA_RICHIESTA_SUPPORTO,
  type CategoriaDiSupporto,
  type RichiestaDiSupportoRequest,
} from '@prome/contracts';

/** Quanto può essere lunga la riga tecnica che il client allega. */
const LUNGHEZZA_MASSIMA_CONTESTO = 200;

const ripulisci = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Una richiesta di aiuto: di cosa parla, cosa succede, dove rispondere.
 *
 * Qui il campo libero **c'è**, ed è la differenza con la segnalazione: quella
 * smista un contenuto verso una decisione già definita (rimuovere o no), e un
 * testo libero la trasformerebbe in un canale da presidiare. Questa È il
 * canale — «scrivici» — e senza il testo non resterebbe niente da leggere.
 */
export class RichiestaDiSupportoDto implements RichiestaDiSupportoRequest {
  @ApiProperty({ enum: CATEGORIE_DI_SUPPORTO })
  @IsIn(CATEGORIE_DI_SUPPORTO)
  categoria!: CategoriaDiSupporto;

  @ApiProperty({ maxLength: LUNGHEZZA_MASSIMA_RICHIESTA_SUPPORTO })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_RICHIESTA_SUPPORTO)
  testo!: string;

  @ApiPropertyOptional({ description: 'Indirizzo su cui vuole risposta, se diverso' })
  @IsOptional()
  @Transform(ripulisci)
  @IsEmail()
  contatto?: string;

  @ApiPropertyOptional({ description: 'Versione app, piattaforma, sistema' })
  @IsOptional()
  @Transform(ripulisci)
  @IsString()
  @MaxLength(LUNGHEZZA_MASSIMA_CONTESTO)
  contesto?: string;
}
