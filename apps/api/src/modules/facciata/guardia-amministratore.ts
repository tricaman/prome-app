import { type CanActivate, type ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import { PortaIdentitaUtente, type UtenteDiDominio } from '../profilo/porta-identita-utente';

/**
 * Whether this user is the account named by `EMAIL_AMMINISTRATORE`: the one
 * rule behind both this guard and the flag on the own profile.
 */
export async function eAmministratore(
  identita: PortaIdentitaUtente,
  utenteId: string,
): Promise<boolean> {
  const amministratore = env.EMAIL_AMMINISTRATORE?.toLowerCase();

  return Boolean(amministratore) && (await identita.indirizzoDi(utenteId)) === amministratore;
}

/**
 * Lets through only the account named by `EMAIL_AMMINISTRATORE`.
 *
 * Runs after the global `GuardiaAccesso`, so a missing session is already a
 * 401. Anyone else gets the same 404 as a route that does not exist: a 403
 * would confirm there is something here.
 */
@Injectable()
export class GuardiaAmministratore implements CanActivate {
  constructor(private readonly identita: PortaIdentitaUtente) {}

  async canActivate(contesto: ExecutionContext): Promise<boolean> {
    const richiesta = contesto
      .switchToHttp()
      .getRequest<FastifyRequest & { utenteDiDominio?: UtenteDiDominio }>();
    const utente = richiesta.utenteDiDominio;

    if (!utente || !(await eAmministratore(this.identita, utente.id))) {
      // The router's own wording for an unknown route: the filter translates it
      // the same way, while a bare NotFoundException() would leak "Not Found".
      throw new NotFoundException(`Cannot ${richiesta.method} ${richiesta.url}`);
    }

    return true;
  }
}
