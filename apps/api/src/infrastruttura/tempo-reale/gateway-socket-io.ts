import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { env } from '../../config/env';
import { PortaIdentitaUtente } from '../../modules/profilo/porta-identita-utente';
import {
  stanzaDiAula,
  type GuardianoDellaStanza,
  type TrasportoInTempoReale,
} from './trasporto';

/**
 * Il trasporto in tempo reale, con Socket.IO.
 *
 * Fa due cose e nessun'altra: **ammette in una stanza** e **consegna ciò che
 * gli viene dato**. Non accetta messaggi dal client — si scrive con una
 * richiesta ordinaria, che è dove vivono le regole — quindi qui non c'è nulla
 * da validare e nessun permesso da verificare.
 *
 * L'ammissione la decide comunque il modulo proprietario: il gateway chiede,
 * non stabilisce. Senza quella domanda chiunque conoscesse un identificativo
 * potrebbe ascoltare la conversazione di un'aula privata — che è un difetto
 * invisibile, perché chi ascolta non lo dice a nessuno.
 */
@Injectable()
@WebSocketGateway({
  namespace: 'tempo-reale',
  cors: { origin: env.ORIGINI_CONSENTITE, credentials: true },
})
export class GatewaySocketIo implements TrasportoInTempoReale, OnGatewayConnection {
  private readonly logger = new Logger('TempoReale');

  @WebSocketServer()
  private server?: Server;

  private guardiano?: GuardianoDellaStanza;

  constructor(private readonly identita: PortaIdentitaUtente) {}

  registraGuardiano(guardiano: GuardianoDellaStanza): void {
    this.guardiano = guardiano;
  }

  /**
   * Alla connessione si stabilisce **chi è**, con lo stesso token delle
   * richieste ordinarie. Chi non ha una sessione valida viene chiuso subito:
   * una connessione anonima non avrebbe alcuna stanza in cui entrare.
   */
  async handleConnection(client: Socket): Promise<void> {
    const token = tokenDi(client);
    if (!token) return void client.disconnect(true);

    const utente = await this.identita.utenteDellaRichiesta(
      new Headers({ authorization: `Bearer ${token}` }),
    );
    if (!utente) return void client.disconnect(true);

    client.data.utenteId = utente.id;
  }

  /**
   * L'iscrizione alla stanza di un'aula.
   *
   * Chi è in sola lettura è ammesso ad ascoltare: la sola lettura è uno stato
   * legittimo dell'incontro, non un'esclusione.
   */
  @SubscribeMessage('ascolta-aula')
  async ascoltaAula(client: Socket, aulaStudioId: unknown): Promise<{ ascolto: boolean }> {
    const utenteId = client.data.utenteId as string | undefined;
    if (!utenteId || typeof aulaStudioId !== 'string') return { ascolto: false };

    const ammesso = (await this.guardiano?.puoAscoltare(utenteId, aulaStudioId)) ?? false;
    if (!ammesso) return { ascolto: false };

    await client.join(stanzaDiAula(aulaStudioId));
    return { ascolto: true };
  }

  @SubscribeMessage('smetti-aula')
  async smettiAula(client: Socket, aulaStudioId: unknown): Promise<{ ascolto: boolean }> {
    if (typeof aulaStudioId === 'string') await client.leave(stanzaDiAula(aulaStudioId));
    return { ascolto: false };
  }

  pubblicaInStanza(stanza: string, evento: string, dato: unknown): Promise<void> {
    // Se il server non è ancora in piedi non è un errore da propagare: chi
    // scrive ha già il proprio messaggio salvato, e chi legge lo troverà.
    this.server?.to(stanza).emit(evento, dato);
    return Promise.resolve();
  }
}

/** Il token arriva dall'handshake: intestazione o parametro, come per le API. */
function tokenDi(client: Socket): string | null {
  const daAuth = (client.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof daAuth === 'string' && daAuth) return daAuth;

  const intestazione = client.handshake.headers.authorization;
  if (typeof intestazione === 'string' && intestazione.startsWith('Bearer ')) {
    return intestazione.slice('Bearer '.length);
  }
  return null;
}
