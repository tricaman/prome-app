import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DIMENSIONE_MASSIMA_ALLEGATO } from '@prome/contracts';
import { SkipResponseWrapper } from '../../common/decorators';
import { ArchivioLocale } from '../../infrastruttura/archivio-file/archivio-locale';
import { SenzaAccesso } from './guardia-accesso';

/**
 * Dove atterrano i byte dell'archivio locale.
 *
 * **Non è un endpoint di dominio** ed è escluso dalla documentazione: esiste
 * finché l'archivio è quello locale, e sparirà con lui — quando i file
 * andranno a un fornitore, il client caricherà là e questo controller non
 * servirà più. Per questo non usa l'envelope: chi carica un file si aspetta le
 * convenzioni di un archivio, non quelle della nostra API.
 *
 * È aperto senza sessione perché l'autorizzazione è **nell'indirizzo**: la
 * firma vale per una chiave sola e per pochi minuti. È lo stesso modello dei
 * fornitori veri, ed è ciò che permette al client di caricare direttamente.
 */
@ApiExcludeController()
@SenzaAccesso()
@Controller('archivio')
export class ArchivioController {
  constructor(private readonly archivio: ArchivioLocale) {}

  @Put('*')
  @SkipResponseWrapper()
  @HttpCode(HttpStatus.OK)
  async carica(
    @Query('scadenza') scadenza: string,
    @Query('firma') firma: string,
    @Req() richiesta: FastifyRequest,
    @Res() risposta: FastifyReply,
  ): Promise<void> {
    const contenuto = corpoInByte(richiesta.body);

    // Il limite si applica anche qui, non solo alla dichiarazione: chi ha
    // dichiarato 1 MB e ne manda 40 sta aggirando il controllo, non sbagliando.
    if (!contenuto.byteLength || contenuto.byteLength > DIMENSIONE_MASSIMA_ALLEGATO) {
      await risposta.status(HttpStatus.PAYLOAD_TOO_LARGE).send();
      return;
    }

    const autorizzato = await this.archivio.scriviSeAutorizzato(
      chiaveDi(richiesta),
      Number(scadenza),
      firma,
      contenuto,
    );

    // Firma sbagliata e autorizzazione scaduta danno la stessa risposta:
    // distinguerle aiuterebbe solo chi sta provando a indovinare.
    await risposta.status(autorizzato ? HttpStatus.OK : HttpStatus.FORBIDDEN).send();
  }

  @Get('*')
  @SkipResponseWrapper()
  @Header('cache-control', 'private, max-age=3600')
  async scarica(
    @Req() richiesta: FastifyRequest,
    @Res() risposta: FastifyReply,
  ): Promise<void> {
    const contenuto = await this.archivio.leggi(chiaveDi(richiesta));
    if (!contenuto) {
      await risposta.status(HttpStatus.NOT_FOUND).send();
      return;
    }
    await risposta.send(contenuto);
  }
}

/**
 * La chiave è tutto ciò che segue `/archivio/`.
 *
 * Fastify mette il resto del percorso nel parametro jolly `*`, e le chiavi
 * hanno più segmenti (`bacheca/allegato/<id>/<nome>`): un parametro con nome
 * ne prenderebbe uno solo.
 */
function chiaveDi(richiesta: FastifyRequest): string {
  const parametri = richiesta.params as Record<string, string | undefined>;
  return parametri['*'] ?? '';
}

/** Il corpo grezzo, comunque Fastify lo abbia interpretato. */
function corpoInByte(corpo: unknown): Buffer {
  if (Buffer.isBuffer(corpo)) return corpo;
  if (typeof corpo === 'string') return Buffer.from(corpo);
  if (corpo === undefined || corpo === null) return Buffer.alloc(0);
  return Buffer.from(JSON.stringify(corpo));
}
