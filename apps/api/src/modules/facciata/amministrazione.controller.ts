import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  PaginatedResult,
  PostResponse,
  SegnalazioneRicevutaResponse,
  UtenteRegistratoResponse,
} from '@prome/contracts';
import { ApiPaginatedResponse } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BachecaService } from '../bacheca/bacheca.service';
import { PortaIdentitaUtente, type UtenteDiDominio } from '../profilo/porta-identita-utente';
import { ProfiloService } from '../profilo/profilo.service';
import { SegnalazioneService } from '../segnalazione/segnalazione.service';
import { SegnalazioneRicevutaDto, UtenteRegistratoDto } from './dtos/amministrazione.dto';
import { PostDto } from './dtos/bacheca.dto';
import { GuardiaAmministratore } from './guardia-amministratore';
import { Utente } from './guardia-accesso';

/**
 * The admin panel: read-only lists across contexts, for one account.
 *
 * Composed here like the data export, not in a new module, so the export and
 * the deletion chain stay the only other readers of every context. Each
 * context still decides what it hands over, through a method named for this
 * panel.
 */
@ApiTags('admin')
@Controller('admin')
@UseGuards(GuardiaAmministratore)
export class AmministrazioneController {
  constructor(
    private readonly profilo: ProfiloService,
    private readonly identita: PortaIdentitaUtente,
    private readonly bacheca: BachecaService,
    private readonly segnalazioni: SegnalazioneService,
  ) {}

  @Get('utenti')
  @ApiOperation({ operationId: 'elencaUtentiRegistrati', summary: 'Registered users, newest first' })
  @ApiPaginatedResponse({ type: UtenteRegistratoDto })
  async utenti(@Query() query: PaginationDto): Promise<PaginatedResult<UtenteRegistratoResponse>> {
    const pagina = await this.profilo.elencoPerAmministrazione(query);
    const indirizzi = await this.identita.indirizziDi(pagina.data.map((u) => u.utenteId));

    return {
      ...pagina,
      data: pagina.data.map((u) => ({ ...u, email: indirizzi.get(u.utenteId) ?? null })),
    };
  }

  @Get('segnalazioni')
  @ApiOperation({
    operationId: 'elencaSegnalazioniRicevute',
    summary: 'Reports, newest first, with the reported content as it is now',
  })
  @ApiPaginatedResponse({ type: SegnalazioneRicevutaDto })
  async segnalazioniRicevute(
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<SegnalazioneRicevutaResponse>> {
    const pagina = await this.segnalazioni.elenco(query);
    const soggettiDi = (tipo: 'POST' | 'COMMENTO') =>
      pagina.data.filter((s) => s.tipo === tipo).map((s) => s.soggettoId);
    const contenuti = await this.bacheca.contenutiPerAmministrazione({
      post: soggettiDi('POST'),
      commenti: soggettiDi('COMMENTO'),
    });
    const persone = await this.profilo.perUtenti([
      ...new Set([
        ...pagina.data.map((s) => s.segnalanteId),
        ...[...contenuti.values()].map((c) => c.autoreId),
      ]),
    ]);
    const nomeDi = (utenteId: string | undefined): string | null => {
      const persona = utenteId ? persone.get(utenteId) : undefined;

      return persona ? [persona.nome, persona.cognome].filter(Boolean).join(' ') || null : null;
    };

    return {
      ...pagina,
      data: pagina.data.map((s) => {
        const contenuto = contenuti.get(s.soggettoId);

        return {
          id: s.id,
          tipo: s.tipo,
          motivo: s.motivo,
          soggettoId: s.soggettoId,
          creatoIl: s.creatoIl.toISOString(),
          segnalanteId: s.segnalanteId,
          segnalanteNome: nomeDi(s.segnalanteId),
          testo: contenuto?.testo ?? null,
          autoreId: contenuto?.autoreId ?? null,
          autoreNome: nomeDi(contenuto?.autoreId),
          postId: contenuto?.postId ?? null,
        };
      }),
    };
  }

  @Get('post')
  @ApiOperation({ operationId: 'elencaTuttiIPost', summary: 'Every post, newest first, privacy ignored' })
  @ApiPaginatedResponse({ type: PostDto })
  post(
    @Utente() amministratore: UtenteDiDominio,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<PostResponse>> {
    return this.bacheca.tuttiPerAmministrazione(amministratore.id, query);
  }
}
