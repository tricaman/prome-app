import { ApiProperty } from '@nestjs/swagger';
import type {
  MotivoDiSegnalazione,
  SegnalazioneRicevutaResponse,
  TipoDiSoggettoSegnalato,
  UtenteRegistratoResponse,
} from '@prome/contracts';
import { MOTIVI, TIPI } from './segnalazioni.dto';

const NULLABILE = { nullable: true, type: String } as const;

/** A registered user in the admin list. */
export class UtenteRegistratoDto implements UtenteRegistratoResponse {
  @ApiProperty() utenteId!: string;
  @ApiProperty(NULLABILE) email!: string | null;
  @ApiProperty(NULLABILE) nome!: string | null;
  @ApiProperty(NULLABILE) cognome!: string | null;
  @ApiProperty(NULLABILE) universita!: string | null;
  @ApiProperty(NULLABILE) corso!: string | null;
  @ApiProperty() onboardingCompletato!: boolean;
  @ApiProperty() registratoIl!: string;

  @ApiProperty({ ...NULLABILE, description: 'Set while an account deletion is pending' })
  inCancellazioneDal!: string | null;
}

/** A report in the admin list, with what it points at. */
export class SegnalazioneRicevutaDto implements SegnalazioneRicevutaResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TIPI }) tipo!: TipoDiSoggettoSegnalato;
  @ApiProperty({ enum: MOTIVI }) motivo!: MotivoDiSegnalazione;
  @ApiProperty() soggettoId!: string;
  @ApiProperty() creatoIl!: string;
  @ApiProperty() segnalanteId!: string;
  @ApiProperty(NULLABILE) segnalanteNome!: string | null;

  @ApiProperty({ ...NULLABILE, description: 'The content as it is now: null once deleted' })
  testo!: string | null;

  @ApiProperty(NULLABILE) autoreId!: string | null;
  @ApiProperty(NULLABILE) autoreNome!: string | null;

  @ApiProperty({ ...NULLABILE, description: 'The reported post, or the post under the comment' })
  postId!: string | null;
}
