import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { API_VERSION } from '@prome/contracts';

/**
 * Documentazione OpenAPI su /docs — SOLO fuori produzione.
 * Ogni endpoint è documentato con ApiWrappedResponse/ApiPaginatedResponse,
 * così lo schema mostra sempre l'envelope reale del contratto client.
 */
export function configuraSwagger(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Prome API')
    .setDescription(
      'Facciata REST versionata di Prome. Tutte le risposte usano l’envelope ' +
        '{ data, meta } (successo) o ApiErrorResponse (errore), con i messaggi ' +
        'tradotti in base a `?lang` > header `x-lang` > `Accept-Language`.',
    )
    .setVersion(API_VERSION)
    .build();

  const documento = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documento);
}
