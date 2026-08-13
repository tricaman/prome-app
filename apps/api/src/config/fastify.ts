import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DIMENSIONE_MASSIMA_ALLEGATO } from '@prome/contracts';

/**
 * Fa accettare a Fastify i corpi binari.
 *
 * Di suo interpreta solo JSON e moduli: un PDF o un'immagine ricevono 415
 * prima ancora di arrivare al controller. Qui si dichiara che qualunque altro
 * tipo arriva **grezzo**, come Buffer, che è ciò che serve all'archivio.
 *
 * Il limite è dichiarato anche qui, e non solo nel controller: così i byte di
 * troppo vengono rifiutati mentre arrivano, senza essere prima accumulati
 * tutti in memoria.
 *
 * Sta in una funzione condivisa perché la usano sia `main.ts` sia i test: due
 * copie della stessa configurazione vorrebbero dire provare qualcosa di
 * diverso da ciò che va in esercizio.
 */
export function registraCorpiBinari(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addContentTypeParser(
    '*',
    { parseAs: 'buffer', bodyLimit: DIMENSIONE_MASSIMA_ALLEGATO + 1024 },
    (_richiesta, corpo, fatto) => {
      fatto(null, corpo);
    },
  );
}
