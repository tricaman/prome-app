import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  DIMENSIONE_MASSIMA_FOTO_PROFILO,
  type BloccatoResponse,
  type AggiornaImpostazioniPrivacyRequest,
  type CompletaProfiloRequest,
  type ConfermaFotoProfiloRequest,
  type CorsoResponse,
  type ImpostazioniDiPrivacyResponse,
  type PreautorizzaFotoProfiloRequest,
  type ProfiloResponse,
  type UniversitaResponse,
  type Visibilita,
} from '@prome/contracts';
import { CorsoDto, UniversitaDto } from './catalogo.dto';

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

  @ApiProperty({
    nullable: true,
    type: UniversitaDto,
    description: 'L\'ateneo del corso scelto: non è un dato a sé, viene dal corso.',
  })
  universita!: UniversitaResponse | null;

  @ApiProperty({ nullable: true, type: CorsoDto })
  corso!: CorsoResponse | null;

  @ApiProperty()
  onboardingCompletato!: boolean;

  @ApiProperty({ type: ImpostazioniDiPrivacyDto })
  impostazioniPrivacy!: ImpostazioniDiPrivacyDto;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Indirizzo della foto del profilo, o null: allora restano le iniziali',
  })
  foto!: string | null;
}

/**
 * Chiedere di poter caricare una foto: nome e peso, come per un allegato.
 *
 * Il **tipo non si dichiara**: qui è ammessa solo un'immagine, e chiederlo al
 * client vorrebbe dire accettare la sua parola su un valore che non è una
 * scelta. Il peso invece serve prima del caricamento, per rifiutare senza
 * spendere banda.
 */
export class PreautorizzaFotoProfiloDto implements PreautorizzaFotoProfiloRequest {
  @ApiProperty({ example: 'ritratto.jpg' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, 200)
  nome!: string;

  @ApiProperty({ maximum: DIMENSIONE_MASSIMA_FOTO_PROFILO })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DIMENSIONE_MASSIMA_FOTO_PROFILO)
  dimensione!: number;
}

/** La conferma cita la chiave, come la pubblicazione di un post cita le sue. */
export class ConfermaFotoProfiloDto implements ConfermaFotoProfiloRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 500)
  chiave!: string;
}

/**
 * I dati arrivano insieme: l'onboarding è completo se e solo se ci sono tutti,
 * quindi non esiste un aggiornamento parziale da modellare.
 *
 * L'università non compare, e la pipe rifiuta chi prova a mandarla: il corso
 * appartiene già a un ateneo, e accettarli entrambi vorrebbe dire dover
 * respingere la coppia incoerente. Che il corso esista **e sia ancora
 * offerto** è una regola di dominio e vive nel modulo, non qui: il DTO
 * protegge dalla richiesta malformata, non dall'aggregato incoerente.
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

  @ApiProperty({
    description: 'Identificativo di un corso del catalogo (GET /catalogo/universita/:id/corsi)',
  })
  @Transform(ripulisci)
  @IsString()
  @Length(1, 64)
  corsoId!: string;
}

/**
 * Il cambio delle regole di privacy.
 *
 * Entrambi i campi sono facoltativi perché **i due assi si cambiano uno alla
 * volta e non si vincolano a vicenda** (IP3): quello omesso resta al valore
 * che aveva. Che almeno uno sia presente non è una regola di forma ma di
 * dominio, e vive nel modulo — una richiesta vuota non è malformata, è un
 * cambio che non cambia niente.
 */
export class AggiornaPrivacyDto implements AggiornaImpostazioniPrivacyRequest {
  @ApiPropertyOptional({ enum: VISIBILITA, description: 'Chi può scriverti e invitarti' })
  @IsOptional()
  @IsEnum(VISIBILITA)
  contattabilita?: Visibilita;

  @ApiPropertyOptional({ enum: VISIBILITA, description: 'Chi vede i tuoi contenuti' })
  @IsOptional()
  @IsEnum(VISIBILITA)
  visibilita?: Visibilita;
}

export class BloccatoDto implements BloccatoResponse {
  @ApiProperty() utenteId!: string;
  @ApiProperty({ nullable: true, type: String }) nome!: string | null;
  @ApiProperty({ nullable: true, type: String }) cognome!: string | null;
  @ApiProperty() bloccatoIl!: string;

  @ApiPropertyOptional({
    description: 'L\'account non esiste più o è in cancellazione: il nome non si mostra, la riga resta sbloccabile.',
  })
  rimosso?: boolean;
}
