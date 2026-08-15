import { ApiProperty } from '@nestjs/swagger';
import type { EsportazioneDatiResponse, FileEsportato, TipoAllegato } from '@prome/contracts';
import { ImpostazioniDiPrivacyDto } from './profilo.dto';

const TIPI = ['PDF', 'IMMAGINE', 'TESTO'] as const;

export class FileEsportatoDto implements FileEsportato {
  @ApiProperty()
  nome!: string;

  @ApiProperty({ enum: TIPI })
  tipo!: TipoAllegato;

  @ApiProperty()
  dimensione!: number;

  @ApiProperty()
  caricatoIl!: string;

  @ApiProperty({ description: 'Collegamento firmato, con validità limitata' })
  url!: string;
}

class PostEsportatoDto {
  @ApiProperty() id!: string;
  @ApiProperty() testo!: string;
  @ApiProperty() creatoIl!: string;
  @ApiProperty() aggiornatoIl!: string;
  @ApiProperty({ type: [FileEsportatoDto] }) allegati!: FileEsportatoDto[];
}

class CommentoEsportatoDto {
  @ApiProperty() id!: string;
  @ApiProperty() postId!: string;
  @ApiProperty() testo!: string;
  @ApiProperty() creatoIl!: string;
}

class BachecaEsportataDto {
  @ApiProperty({ type: [PostEsportatoDto] }) post!: PostEsportatoDto[];
  @ApiProperty({ type: [CommentoEsportatoDto] }) commenti!: CommentoEsportatoDto[];
}

class GruppoEsportatoDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() moderatore!: boolean;
  @ApiProperty() entratoIl!: string;
}

class PartecipazioneEsportataDto {
  @ApiProperty() id!: string;
  @ApiProperty() titolo!: string;
  @ApiProperty() moderatore!: boolean;
  @ApiProperty() ammessoIl!: string;
}

class MessaggioEsportatoDto {
  @ApiProperty() id!: string;
  @ApiProperty() aulaStudioId!: string;
  @ApiProperty() testo!: string;
  @ApiProperty() inviatoIl!: string;
}

class AuleEsportateDto {
  @ApiProperty({ type: [PartecipazioneEsportataDto] })
  partecipazioni!: PartecipazioneEsportataDto[];

  @ApiProperty({ type: [FileEsportatoDto] })
  materialiCaricati!: FileEsportatoDto[];

  @ApiProperty({ type: [MessaggioEsportatoDto] })
  messaggi!: MessaggioEsportatoDto[];
}

class AccountEsportatoDto {
  @ApiProperty() utenteId!: string;

  @ApiProperty({ nullable: true, type: String })
  email!: string | null;
}

class PreferenzeEsportateDto {
  @ApiProperty() commenti!: boolean;
  @ApiProperty() inviti!: boolean;
}

/** Senza il token: è il modo di raggiungere l'apparecchio, non un dato suo. */
class DispositivoEsportatoDto {
  @ApiProperty() piattaforma!: string;
  @ApiProperty() registratoIl!: string;
}

class ProfiloEsportatoDto {
  @ApiProperty({ nullable: true, type: String }) nome!: string | null;
  @ApiProperty({ nullable: true, type: String }) cognome!: string | null;
  @ApiProperty({ nullable: true, type: String }) universita!: string | null;
  @ApiProperty({ nullable: true, type: String }) corso!: string | null;
  @ApiProperty() onboardingCompletato!: boolean;
  @ApiProperty({ type: ImpostazioniDiPrivacyDto })
  impostazioniPrivacy!: ImpostazioniDiPrivacyDto;

  @ApiProperty({ type: PreferenzeEsportateDto })
  preferenzeDiNotifica!: PreferenzeEsportateDto;

  @ApiProperty({ type: [DispositivoEsportatoDto] })
  dispositiviRegistrati!: DispositivoEsportatoDto[];
}

/**
 * La copia dei propri dati.
 *
 * Non contiene credenziali, token di sessione né codici di accesso: non sono
 * dati **dell'utente**, sono il modo in cui il sistema lo riconosce, e
 * metterli in un file che finisce nella cartella dei download sarebbe
 * regalarli a chiunque apra quel file.
 */
export class EsportazioneDatiDto implements EsportazioneDatiResponse {
  @ApiProperty() generataIl!: string;
  @ApiProperty({ type: AccountEsportatoDto }) account!: AccountEsportatoDto;
  @ApiProperty({ type: ProfiloEsportatoDto }) profilo!: ProfiloEsportatoDto;
  @ApiProperty({ type: BachecaEsportataDto }) bacheca!: BachecaEsportataDto;
  @ApiProperty({ type: [GruppoEsportatoDto] }) gruppi!: GruppoEsportatoDto[];
  @ApiProperty({ type: AuleEsportateDto }) auleStudio!: AuleEsportateDto;
}
