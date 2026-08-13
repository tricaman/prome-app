import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { LINGUA_DI_RIPIEGO } from '@prome/i18n';
import { PrismaModule } from './database/prisma.module';
import { ArchivioFileModule } from './infrastruttura/archivio-file/archivio-file.module';
import { AvvisiInUscitaModule } from './infrastruttura/avvisi-in-uscita/avvisi-in-uscita.module';
import { MisurazioniModule } from './infrastruttura/misurazioni/misurazioni.module';
import { ProfiloModule } from './modules/profilo/profilo.module';
import { BachecaModule } from './modules/bacheca/bacheca.module';
import { GruppoModule } from './modules/gruppo/gruppo.module';
import { AulaStudioModule } from './modules/aula-studio/aula-studio.module';
import { FacciataModule } from './modules/facciata/facciata.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/**
 * Modulo radice dell'unità di esecuzione "app" (APP_ROLE=app).
 *
 * Registra i quattro bounded context della Context Map (Profilo, Bacheca,
 * Gruppo, AulaStudio) e la Facciata REST versionata. Il grafo di import
 * in-process DEVE combaciare con la Context Map:
 * - Profilo può essere importato da Bacheca, Gruppo e AulaStudio;
 * - Bacheca, Gruppo e AulaStudio NON si importano tra loro;
 * - nessun contesto importa la Facciata; la Facciata orchestra i contesti.
 * Per ora nessun import incrociato: solo la registrazione qui.
 *
 * Infrastruttura trasversale della facciata:
 * - I18nModule: la lingua viaggia in OGNI richiesta (`?lang` > header `x-lang`
 *   > `Accept-Language`); il ripiego è la stessa lingua decisa per i client,
 *   così l'intero prodotto risponde con una regola sola. I cataloghi dei
 *   messaggi dell'API stanno in src/i18n.
 * - GlobalExceptionFilter: ogni errore esce come ApiErrorResponse tradotta.
 * - ResponseInterceptor: ogni successo esce come ApiEnvelope tradotto.
 */
@Module({
  imports: [
    // Il file .env sta alla ROOT del monorepo (cwd in dev = apps/api).
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    I18nModule.forRoot({
      fallbackLanguage: LINGUA_DI_RIPIEGO,
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: process.env.NODE_ENV === 'development',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
    PrismaModule,
    AvvisiInUscitaModule,
    ArchivioFileModule,
    MisurazioniModule,
    ProfiloModule,
    BachecaModule,
    GruppoModule,
    AulaStudioModule,
    FacciataModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
