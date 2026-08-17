import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DIMENSIONE_MASSIMA_ALLEGATO,
  LUNGHEZZA_MASSIMA_TESTO_ARGOMENTO,
  LUNGHEZZA_MASSIMA_MESSAGGIO,
  LUNGHEZZA_MASSIMA_TITOLO_AULA,
  type AllegatoDiAulaStudioResponse,
  type MaterialeSalvatoResponse,
  type ArgomentoResponse,
  type AulaStudioResponse,
  type CreaAllegatoDiAulaStudioRequest,
  type CreaArgomentoRequest,
  type CreaAulaStudioRequest,
  type CreaInvitoRequest,
  type InviaMessaggioRequest,
  type InvitoResponse,
  type MessaggioDiChatResponse,
  type ModificaAulaStudioRequest,
  type PartecipanteResponse,
  type PermessiResponse,
  type SalaResponse,
  type StatoInvito,
  type TipoAllegato,
  type VisibilitaAulaStudio,
} from '@prome/contracts';
import { PaginationDto } from '../../../common/dto';

const VISIBILITA: VisibilitaAulaStudio[] = ['PRIVATO', 'ATENEO', 'PUBBLICO'];
const TIPI: TipoAllegato[] = ['PDF', 'IMMAGINE', 'TESTO'];

const ripulisci = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// --- Ingresso ---------------------------------------------------------------

export class CreaAulaStudioDto implements CreaAulaStudioRequest {
  @ApiProperty({ example: 'Analisi 1 – giovedì', maxLength: LUNGHEZZA_MASSIMA_TITOLO_AULA })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_TITOLO_AULA)
  titolo!: string;

  @ApiPropertyOptional({ enum: VISIBILITA, default: 'PRIVATO' })
  @IsOptional()
  @IsEnum(VISIBILITA)
  visibilita?: VisibilitaAulaStudio;

  @ApiPropertyOptional({ description: 'Assente = aula estemporanea' })
  @IsOptional()
  @IsISO8601()
  dataOraInizio?: string;

  @ApiPropertyOptional({ type: String, description: 'Gruppo in cui collocarla fin da subito' })
  @IsOptional()
  @IsUUID()
  gruppoId?: string;
}

export class ModificaAulaStudioDto implements ModificaAulaStudioRequest {
  @ApiPropertyOptional({ maxLength: LUNGHEZZA_MASSIMA_TITOLO_AULA })
  @IsOptional()
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_TITOLO_AULA)
  titolo?: string;

  @ApiPropertyOptional({ enum: VISIBILITA })
  @IsOptional()
  @IsEnum(VISIBILITA)
  visibilita?: VisibilitaAulaStudio;

  // Il tipo va dichiarato: senza, lo schema OpenAPI esce senza `type` e il
  // generatore del client lo legge come un oggetto qualunque. Era già così su
  // questo campo, e non se n'era accorto nessuno perché nessun client lo
  // mandava.
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsISO8601()
  dataOraInizio?: string | null;

  /** `null` scioglie la collocazione; un id la stabilisce (AS9). */
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Gruppo in cui collocare l\'aula' })
  @IsOptional()
  @ValidateIf((_oggetto, valore) => valore !== null)
  @IsUUID()
  gruppoId?: string | null;
}

export class QueryAuleStudioDto extends PaginationDto {
  /**
   * Con un gruppo la domanda cambia: non «le mie aule» ma **le aule collocate
   * lì che posso vedere**, comprese quelle in cui non sono ancora entrato.
   */
  @ApiPropertyOptional({ description: 'Aule collocate in questo gruppo' })
  @IsOptional()
  @IsUUID()
  gruppoId?: string;
}

export class CreaArgomentoDto implements CreaArgomentoRequest {
  @ApiProperty({ example: 'Limiti e continuità' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_TITOLO_AULA)
  titolo!: string;

  @ApiPropertyOptional({ maxLength: LUNGHEZZA_MASSIMA_TESTO_ARGOMENTO })
  @IsOptional()
  @Transform(ripulisci)
  @IsString()
  @Length(0, LUNGHEZZA_MASSIMA_TESTO_ARGOMENTO)
  testo?: string;
}

export class PreautorizzaMaterialeDto {
  @ApiProperty({ example: 'dispense.pdf' })
  @Transform(ripulisci)
  @IsString()
  @Length(1, 255)
  nome!: string;

  @ApiProperty({ enum: TIPI })
  @IsEnum(TIPI)
  tipo!: TipoAllegato;

  @ApiProperty({ example: 128_000, maximum: DIMENSIONE_MASSIMA_ALLEGATO })
  @IsInt()
  @Min(1)
  dimensione!: number;
}

export class CreaMaterialeDto implements CreaAllegatoDiAulaStudioRequest {
  @ApiProperty({ description: 'Chiave ottenuta dalla pre-autorizzazione' })
  @IsString()
  chiave!: string;

  @ApiPropertyOptional({ description: 'Assente = materiale sciolto, stato normale' })
  @IsOptional()
  @IsUUID()
  argomentoId?: string;
}

export class CreaInvitoDto implements CreaInvitoRequest {
  @ApiProperty({ example: 'compagno@studenti.unibo.it' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  destinatario!: string;
}

export class InviaMessaggioDto implements InviaMessaggioRequest {
  @ApiProperty({ example: 'Ci vediamo alle 21', maxLength: LUNGHEZZA_MASSIMA_MESSAGGIO })
  @Transform(ripulisci)
  @IsString()
  @Length(1, LUNGHEZZA_MASSIMA_MESSAGGIO)
  testo!: string;
}

export class QueryMessaggiDto extends PaginationDto {}

// --- Uscita -----------------------------------------------------------------

export class AutoreDiAulaDto {
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

  @ApiPropertyOptional({ description: 'Account non più esistente: «Utente rimosso»' })
  rimosso?: boolean;
}

export class PermessiDto implements PermessiResponse {
  @ApiProperty() @IsBoolean() parlare!: boolean;
  @ApiProperty() @IsBoolean() scrivere!: boolean;
  @ApiProperty() @IsBoolean() caricare!: boolean;
}

/**
 * Chi si invita, nominato per identificativo.
 *
 * L'indirizzo **non compare**, né in ingresso né in uscita: chi invita sta
 * guardando una persona in una sala, non un'email, e il server risolve il
 * recapito senza raccontarlo a nessuno.
 */
export class InvitaUtenteDto {
  // **Non è un UUID**: l'identificativo dell'utente arriva dal fornitore di
  // identità e ha la sua forma. Validarlo come UUID rifiutava ogni invito con
  // un errore di validazione, che è il modo più silenzioso di rompere una
  // funzione — il codice dice «campo malformato» e il campo era giusto.
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  utenteId!: string;
}

export class PartecipanteDto implements PartecipanteResponse {
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

  @ApiPropertyOptional({
    description: 'Se chi legge può invitarla altrove: lo decidono le sue impostazioni',
  })
  contattabile?: boolean;

  @ApiPropertyOptional({ description: 'Account non più esistente: «Utente rimosso»' })
  rimosso?: boolean;
  @ApiProperty() moderatore!: boolean;
  @ApiProperty({ type: PermessiDto }) permessi!: PermessiDto;
  @ApiProperty({ description: 'Nessun permesso: stato legittimo, non un errore' })
  solaLettura!: boolean;
}

export class AulaStudioDto implements AulaStudioResponse {
  @ApiProperty() id!: string;
  @ApiProperty() titolo!: string;
  @ApiProperty({ enum: VISIBILITA }) visibilita!: VisibilitaAulaStudio;
  @ApiProperty({ nullable: true, type: String }) ateneo!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Assente = estemporanea' })
  dataOraInizio!: string | null;
  @ApiProperty({ nullable: true, type: String }) gruppoId!: string | null;
  @ApiProperty() creatoIl!: string;
  @ApiProperty() partecipanti!: number;
  @ApiProperty() sonoModeratore!: boolean;
  @ApiProperty() sonoPartecipante!: boolean;
}

export class ArgomentoDto implements ArgomentoResponse {
  @ApiProperty() id!: string;
  @ApiProperty() titolo!: string;
  @ApiProperty({ nullable: true, type: String }) testo!: string | null;
  @ApiProperty() creatoIl!: string;
}

export class MaterialeDto implements AllegatoDiAulaStudioResponse {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: TIPI }) tipo!: TipoAllegato;
  @ApiProperty() dimensione!: number;
  @ApiProperty() url!: string;
  @ApiProperty({ nullable: true, type: String }) argomentoId!: string | null;
  @ApiProperty() caricatoDa!: string;
  @ApiProperty() creatoIl!: string;

  @ApiPropertyOptional({ description: 'Vero se chi legge lo ha messo da parte' })
  salvato?: boolean;
}

/** Un materiale della propria raccolta, con l'aula da cui viene. */
export class MaterialeSalvatoDto implements MaterialeSalvatoResponse {
  @ApiProperty({ type: MaterialeDto }) materiale!: MaterialeDto;
  @ApiProperty() aulaStudioId!: string;
  @ApiProperty({ description: 'Un elenco di nomi di file senza provenienza non dice niente' })
  titoloAula!: string;
  @ApiProperty() salvatoIl!: string;
}

export class SalaDto implements SalaResponse {
  @ApiProperty({ type: AulaStudioDto }) aula!: AulaStudioDto;
  @ApiProperty({ type: [PartecipanteDto] }) partecipanti!: PartecipanteDto[];
  @ApiProperty({ type: [ArgomentoDto] }) argomenti!: ArgomentoDto[];
  @ApiProperty({ type: [MaterialeDto] }) allegati!: MaterialeDto[];
  @ApiProperty() sonoModeratore!: boolean;
  @ApiProperty({ type: PermessiDto }) mieiPermessi!: PermessiDto;
}

export class PreautorizzazioneMaterialeDto {
  @ApiProperty() chiave!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ example: 'PUT' }) metodo!: 'PUT';
  @ApiProperty({ type: Object }) intestazioni!: Record<string, string>;
  @ApiProperty() scadeIl!: Date;
}

export class InvitoDto implements InvitoResponse {
  @ApiProperty() id!: string;
  @ApiProperty() aulaStudioId!: string;
  @ApiProperty() titoloAula!: string;
  @ApiProperty() destinatario!: string;
  @ApiProperty({ enum: ['IN_ATTESA', 'ACCETTATO', 'SCADUTO'] }) stato!: StatoInvito;
  @ApiProperty() scadeIl!: string;
  @ApiProperty() emessoIl!: string;
  @ApiProperty({ description: 'Falso subito dopo l\'accettazione: compare entro pochi secondi' })
  partecipanteCreato!: boolean;
}

export class MessaggioDiChatDto implements MessaggioDiChatResponse {
  @ApiProperty() id!: string;
  @ApiProperty() testo!: string;
  @ApiProperty() inviatoIl!: string;
  @ApiProperty({ type: AutoreDiAulaDto }) autore!: AutoreDiAulaDto;
  @ApiProperty({ description: 'Se chi legge ne è l\'autore: lo dice il server' })
  mio!: boolean;
}

/** Massimo consentito, ri-dichiarato qui per la documentazione. */
export const DIMENSIONE_MASSIMA_MATERIALE = DIMENSIONE_MASSIMA_ALLEGATO;
