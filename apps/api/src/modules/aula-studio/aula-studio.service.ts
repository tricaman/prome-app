import { Injectable } from '@nestjs/common';

/**
 * Segnaposto del bounded context AULA STUDIO.
 *
 * Regole della Context Map (grafo di import in-process):
 * - può importare Profilo;
 * - NON importa Bacheca né Gruppo;
 * - nessun altro contesto importa AulaStudio.
 */
@Injectable()
export class AulaStudioService {}
