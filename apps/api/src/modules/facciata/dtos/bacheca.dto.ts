import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  DIMENSIONE_MASSIMA_ALLEGATO,
  LUNGHEZZA_MASSIMA_COMMENTO,
  LUNGHEZZA_MASSIMA_POST,
  type AllegatoResponse,
  type AutoreResponse,
  type CreaPostRequest,
  type PostResponse,
  type PreautorizzaAllegatoRequest,
  type CommentoResponse,
  type CreaCommentoRequest,
  type ModificaPostRequest,
  type PreautorizzaAllegatoResponse,
  type TipoAllegato,
} from '@prome/contracts';
import { MASSIMO_ALLEGATI_PER_POST } from '../../bacheca/bacheca.service';
import { PaginationDto } from '../../../common/dto';

const TIPI: TipoAllegato[] = ['PDF', 'IMMAGINE', 'TESTO'];

const ripulisci = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class PreautorizzaAllegatoDto implements PreautorizzaAllegatoRequest {
  @ApiProperty({ example: 'analisi2-esercizi.pdf' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, 255)
  nome!: string;

  @ApiProperty({ enum: TIPI })
  @IsIn(TIPI)
  tipo!: TipoAllegato;

  @ApiProperty({ description: 'Byte, > 0 e ≤ 25 MB', example: 1_048_576 })
  @IsInt()
  @Min(1)
  @Max(DIMENSIONE_MASSIMA_ALLEGATO)
  dimensione!: number;
}

export class PreautorizzaAllegatoRispostaDto implements PreautorizzaAllegatoResponse {
  @ApiProperty({ description: 'Da rimandare alla creazione del post' })
  chiave!: string;

  @ApiProperty({ description: 'Dove mandare i byte: non passano dall\'API' })
  url!: string;

  @ApiProperty({ enum: ['PUT'] })
  metodo!: 'PUT';

  @ApiProperty({ type: Object })
  intestazioni!: Record<string, string>;

  @ApiProperty()
  scadeIl!: string;
}

export class AllegatoDto implements AllegatoResponse {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: TIPI }) tipo!: TipoAllegato;
  @ApiProperty() dimensione!: number;
  @ApiProperty() url!: string;
}

export class AutoreDto implements AutoreResponse {
  @ApiProperty() utenteId!: string;
  @ApiProperty({ nullable: true, type: String }) nome!: string | null;
  @ApiProperty({ nullable: true, type: String }) cognome!: string | null;
  @ApiProperty({ nullable: true, type: String }) universita!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Foto del profilo, o null: allora restano le iniziali',
  })
  foto?: string | null;

  @ApiProperty({
    required: false,
    description: 'Vero quando l\'account dell\'autore non esiste più: il client mostra «Utente rimosso»',
  })
  rimosso?: boolean;
}

export class PostDto implements PostResponse {
  @ApiProperty() id!: string;
  @ApiProperty() testo!: string;
  @ApiProperty() creatoIl!: string;
  @ApiProperty({ type: AutoreDto }) autore!: AutoreDto;
  @ApiProperty({ type: [AllegatoDto] }) allegati!: AllegatoDto[];

  @ApiProperty({ description: 'Se chi legge ne è l\'autore: lo decide il server' })
  puoModificare!: boolean;

  @ApiProperty({ description: 'Quanti commenti ha il post' })
  commenti!: number;
}

/**
 * I filtri della bacheca.
 *
 * **Un parametro, non un endpoint**: «i miei post» è la stessa risorsa con una
 * condizione in meno da risolvere, e `/bacheca/miei` sarebbe una seconda
 * collezione con la stessa forma, la stessa paginazione e gli stessi difetti
 * da correggere due volte.
 *
 * Non esiste invece un filtro per autore qualunque: aprirebbe una funzione che
 * il prodotto non ha — sfogliare i contenuti di una persona — e lo farebbe di
 * straforo, con un parametro.
 */
export class QueryPostDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Solo i post di chi legge' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  soloMiei?: boolean;
}

export class CreaPostDto implements CreaPostRequest {
  @ApiProperty({ maxLength: LUNGHEZZA_MASSIMA_POST })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_POST)
  testo!: string;

  @ApiProperty({ type: [String], required: false, description: 'Chiavi già caricate' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MASSIMO_ALLEGATI_PER_POST)
  @IsString({ each: true })
  allegati?: string[];
}


export class ModificaPostDto implements ModificaPostRequest {
  @ApiProperty({ maxLength: LUNGHEZZA_MASSIMA_POST })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_POST)
  testo!: string;
}

export class CreaCommentoDto implements CreaCommentoRequest {
  @ApiProperty({ maxLength: LUNGHEZZA_MASSIMA_COMMENTO })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_COMMENTO)
  testo!: string;
}

export class CommentoDto implements CommentoResponse {
  @ApiProperty() id!: string;
  @ApiProperty() testo!: string;
  @ApiProperty() creatoIl!: string;
  @ApiProperty({ type: AutoreDto }) autore!: AutoreDto;

  @ApiProperty({ description: "Se chi legge può eliminarlo: lo decide il server" })
  puoEliminare!: boolean;
}
