import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
// L'import di env esegue la validazione fail-fast PRIMA di qualunque bootstrap Nest.
import { env } from './config/env';
import { configuraSwagger } from './config/swagger';
import { AppModule } from './app.module';
import { WorkerModule } from './worker/worker.module';
import { creaValidationPipe } from './common/pipes/validation.pipe';

/**
 * Bootstrap del monolite modulare: UNA codebase (e una sola immagine Docker),
 * DUE unità di esecuzione scelte a runtime dalla variabile APP_ROLE:
 *
 * - APP_ROLE=app    → server HTTP Fastify con la facciata REST, in ascolto su PORT
 * - APP_ROLE=worker → NESSUN listener HTTP: application context con il WorkerModule
 *                     (meccanismi ricorrenti e recapito dei fatti di dominio)
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  if (env.APP_ROLE === 'worker') {
    // Unità "worker": niente server HTTP, solo il contesto applicativo.
    const contesto = await NestFactory.createApplicationContext(WorkerModule);
    contesto.enableShutdownHooks();
    logger.log('Unità di esecuzione "worker" avviata (nessun listener HTTP)');
    return;
  }

  // Unità "app": facciata REST su Fastify.
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableShutdownHooks();
  // Validazione dell'ingresso: stessa pipe usata dai test (common/pipes).
  // Filtro errori e envelope di risposta sono registrati in AppModule.
  app.useGlobalPipes(creaValidationPipe());
  if (env.NODE_ENV !== 'production') {
    configuraSwagger(app);
  }
  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`Unità di esecuzione "app" in ascolto su http://localhost:${env.PORT}`);
}

void bootstrap();
