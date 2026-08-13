import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AppException } from '../../common/exceptions';
import { ProfiloErrorCode } from '../profilo/constants/error-codes';
import { PortaIdentitaUtente, type UtenteDiDominio } from '../profilo/porta-identita-utente';

export const SENZA_ACCESSO_KEY = 'senzaAccesso';

/**
 * Marca un endpoint come raggiungibile senza sessione.
 *
 * La guardia è globale e nega per difetto: un endpoint nuovo nasce protetto, e
 * aprirlo è un gesto esplicito che si vede nella diff. Il contrario — aprire
 * per difetto e ricordarsi di proteggere — lascia scoperto ciò che si dimentica.
 */
export const SenzaAccesso = () => SetMetadata(SENZA_ACCESSO_KEY, true);

/** La richiesta, una volta che la guardia ci ha attaccato l'utente. */
type RichiestaConUtente = FastifyRequest & { utenteDiDominio?: UtenteDiDominio };

/**
 * Stabilisce **chi è** l'utente della richiesta, e nient'altro.
 *
 * Non decide se possa fare ciò che sta chiedendo: quella decisione appartiene
 * al modulo che possiede la regola, sul proprio dato, nel momento del gesto.
 * La facciata attraversa quattro contesti, e una decisione presa qui sarebbe
 * presa fuori dal contesto che la possiede.
 */
@Injectable()
export class GuardiaAccesso implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly portaIdentita: PortaIdentitaUtente,
  ) {}

  async canActivate(contesto: ExecutionContext): Promise<boolean> {
    const aperto = this.reflector.getAllAndOverride<boolean>(SENZA_ACCESSO_KEY, [
      contesto.getHandler(),
      contesto.getClass(),
    ]);

    const richiesta = contesto.switchToHttp().getRequest<RichiestaConUtente>();
    const utente = await this.portaIdentita.utenteDellaRichiesta(
      intestazioniStandard(richiesta),
    );

    // Anche su un endpoint aperto l'utente, se c'è, viene risolto: un endpoint
    // può comportarsi diversamente per chi è entrato senza per questo esigerlo.
    if (utente) richiesta.utenteDiDominio = utente;
    if (aperto) return true;

    if (!utente) {
      throw new AppException(
        ProfiloErrorCode.ACCESSO_RICHIESTO,
        'ACCESSO_RICHIESTO',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return true;
  }
}

/**
 * Le intestazioni di Fastify nella forma che il fornitore si aspetta.
 *
 * Fastify le espone come oggetto semplice, il fornitore vuole `Headers` dello
 * standard web: la conversione sta qui, in un punto solo, invece che sparsa
 * dove serve.
 */
export function intestazioniStandard(richiesta: FastifyRequest): Headers {
  const intestazioni = new Headers();
  for (const [nome, valore] of Object.entries(richiesta.headers)) {
    if (typeof valore === 'string') intestazioni.set(nome, valore);
    else if (Array.isArray(valore)) intestazioni.set(nome, valore.join(', '));
  }
  return intestazioni;
}

/**
 * L'Utente di dominio della richiesta corrente.
 *
 * Su un endpoint protetto c'è sempre: se non ci fosse, la guardia avrebbe già
 * risposto 401 e il controller non sarebbe stato chiamato.
 */
export const Utente = createParamDecorator(
  (_dato: unknown, contesto: ExecutionContext): UtenteDiDominio => {
    const richiesta = contesto.switchToHttp().getRequest<RichiestaConUtente>();
    if (!richiesta.utenteDiDominio) {
      // Non è un caso da gestire: è un errore di programmazione — @Utente su un
      // endpoint marcato @SenzaAccesso — e va visto subito.
      throw new AppException(
        ProfiloErrorCode.ACCESSO_RICHIESTO,
        'ACCESSO_RICHIESTO',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return richiesta.utenteDiDominio;
  },
);
