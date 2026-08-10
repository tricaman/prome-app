import { Injectable } from '@nestjs/common';

/**
 * Segnaposto del bounded context GRUPPO.
 *
 * Regole della Context Map (grafo di import in-process):
 * - può importare Profilo;
 * - NON importa Bacheca né AulaStudio;
 * - nessun altro contesto importa Gruppo.
 */
@Injectable()
export class GruppoService {}
