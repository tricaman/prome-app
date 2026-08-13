import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Unico punto da cui si parla al database.
 *
 * La connessione si apre all'avvio del modulo e non alla prima query: se le
 * credenziali sono sbagliate vogliamo saperlo mentre il processo parte, non
 * dalla prima richiesta di un utente. È la stessa regola fail-fast della
 * validazione dell'ambiente.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connessione al database stabilita');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
