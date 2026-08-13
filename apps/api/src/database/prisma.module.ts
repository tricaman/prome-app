import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Accesso al database, disponibile ovunque senza reimportarlo.
 *
 * È globale di proposito: la connessione è una sola per processo, e obbligare
 * ogni modulo a dichiararla non direbbe niente di più sul grafo delle
 * dipendenze — quello che conta è il grafo fra bounded context, non chi tocca
 * il driver. Il confine fra contesti resta imposto dagli schemi disgiunti: un
 * modulo può raggiungere il client, non le tabelle di un altro contesto.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
