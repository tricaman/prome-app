import { Injectable } from '@nestjs/common';

/**
 * Segnaposto del bounded context BACHECA.
 *
 * Regole della Context Map (grafo di import in-process):
 * - può importare Profilo;
 * - NON importa Gruppo né AulaStudio;
 * - nessun altro contesto importa Bacheca.
 */
@Injectable()
export class BachecaService {}
