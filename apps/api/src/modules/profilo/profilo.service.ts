import { Injectable } from '@nestjs/common';

/**
 * Segnaposto del bounded context PROFILO.
 *
 * Regole della Context Map (grafo di import in-process):
 * - Profilo è upstream: Bacheca, Gruppo e AulaStudio possono importarlo;
 * - Profilo NON importa nessun altro contesto (né Bacheca, né Gruppo,
 *   né AulaStudio, né la Facciata).
 */
@Injectable()
export class ProfiloService {}
