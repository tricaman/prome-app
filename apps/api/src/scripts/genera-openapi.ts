import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_VERSION } from '@prome/contracts';
import { AppModule } from '../app.module';

/**
 * Emette la spec OpenAPI in packages/contracts/openapi.json SENZA avviare il
 * server: è la fonte da cui Orval genera tipi e hook React Query per i client.
 * Eseguire con `pnpm --filter @prome/api openapi:emit` (cwd = apps/api).
 */
async function emetti(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Prome API')
    .setDescription('Facciata REST versionata di Prome.')
    .setVersion(API_VERSION)
    .build();

  const documento = SwaggerModule.createDocument(app, config);
  const destinazione = path.resolve(process.cwd(), '../../packages/contracts/openapi.json');
  fs.writeFileSync(destinazione, `${JSON.stringify(documento, null, 2)}\n`);
  await app.close();

  console.log(`Spec OpenAPI scritta in ${destinazione}`);
}

void emetti();
