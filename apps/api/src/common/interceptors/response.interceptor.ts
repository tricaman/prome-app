import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply } from 'fastify';
import { I18nContext } from 'nestjs-i18n';
import { Observable, map } from 'rxjs';
import type { ApiEnvelope, PaginationMeta, ResponseMeta } from '@prome/contracts';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SKIP_RESPONSE_WRAPPER_KEY } from '../decorators/skip-response-wrapper.decorator';

/**
 * Interceptor globale: OGNI risposta di successo esce come ApiEnvelope del
 * contratto client — { data, meta: { status, message, timestamp, pagination? } }.
 *
 * - I controller/service ritornano i dati NUDI: il wrapping è automatico.
 * - meta.message è tradotto nella lingua della richiesta: di default
 *   successes.DEFAULT, sovrascrivibile per endpoint con @ResponseMessage.
 * - Se il service ritorna { data: T[], meta: PaginationMeta } (PaginatedResult),
 *   la paginazione viene spostata in meta.pagination.
 * - @SkipResponseWrapper esclude l'endpoint (stream, redirect, webhook).
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const salta = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAPPER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (salta) {
      return next.handle();
    }

    const risposta = context.switchToHttp().getResponse<FastifyReply>();
    const i18n = I18nContext.current(context);
    const chiaveMessaggio = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((dati: unknown): ApiEnvelope<unknown> => {
        const meta: ResponseMeta = {
          status: risposta.statusCode,
          message: this.risolviMessaggio(i18n, chiaveMessaggio),
          timestamp: new Date().toISOString(),
        };

        if (this.ePaginata(dati)) {
          meta.pagination = dati.meta;
          return { data: dati.data, meta };
        }
        return { data: dati ?? null, meta };
      }),
    );
  }

  private risolviMessaggio(i18n: I18nContext | undefined, chiave: string | undefined): string {
    // Nessun @ResponseMessage → messaggio di default, comunque tradotto.
    const daTradurre = chiave ?? 'successes.DEFAULT';
    // Una chiave con il punto è una chiave i18n; una stringa semplice passa invariata.
    if (daTradurre.includes('.') && i18n) {
      return i18n.translate(daTradurre) as string;
    }
    return daTradurre;
  }

  private ePaginata(dati: unknown): dati is { data: unknown[]; meta: PaginationMeta } {
    if (dati === null || typeof dati !== 'object') return false;
    const oggetto = dati as Record<string, unknown>;
    return (
      Array.isArray(oggetto.data) &&
      typeof oggetto.meta === 'object' &&
      oggetto.meta !== null &&
      'total' in oggetto.meta &&
      'totalPages' in oggetto.meta
    );
  }
}
