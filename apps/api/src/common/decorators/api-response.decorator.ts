import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { PaginationMetaDto, ResponseMetaDto } from '../dto/response.dto';

const ApiErroreComune = () =>
  applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiInternalServerErrorResponse({ type: ErrorResponseDto, description: 'Errore' }),
  );

/**
 * Documenta un endpoint che risponde con l'envelope standard:
 * { data: <Model>, meta: ResponseMetaDto }.
 *
 * Usare SEMPRE questo (o ApiPaginatedResponse) al posto di @ApiOkResponse /
 * @ApiCreatedResponse diretti, che non documentano il wrapping.
 *
 * `type` si omette per gli endpoint che non hanno dati da restituire (uscita,
 * cancellazione): l'envelope resta la stessa, con `data: null`. È diverso da
 * dichiarare un DTO vuoto, che prometterebbe un oggetto che non arriva mai.
 */
export const ApiWrappedResponse = <T extends Type>(options: {
  type?: T;
  status?: 200 | 201;
  description?: string;
  isArray?: boolean;
}) => {
  const { type, status = 200, description = 'Successo', isArray = false } = options;

  // OpenAPI 3.0 non ha il tipo "null": l'assenza di dati si dichiara con uno
  // schema senza tipo e nullable, altrimenti la spec non passa la validazione
  // e il generatore del client si ferma.
  const schemaDati = !type
    ? { nullable: true, description: 'Nessun dato' }
    : isArray
      ? { type: 'array', items: { $ref: getSchemaPath(type) } }
      : { $ref: getSchemaPath(type) };

  const DecoratoreRisposta = status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(...(type ? [ResponseMetaDto, type] : [ResponseMetaDto])),
    DecoratoreRisposta({
      description,
      schema: {
        properties: {
          data: schemaDati,
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
        required: ['data', 'meta'],
      },
    }),
    ApiErroreComune(),
  );
};

/**
 * Documenta un endpoint che risponde con una lista paginata nell'envelope:
 * { data: <Model>[], meta: ResponseMetaDto & { pagination: PaginationMetaDto } }.
 */
export const ApiPaginatedResponse = <T extends Type>(options: {
  type: T;
  description?: string;
}) => {
  const { type, description = 'Lista paginata' } = options;

  return applyDecorators(
    ApiExtraModels(ResponseMetaDto, PaginationMetaDto, type),
    ApiOkResponse({
      description,
      schema: {
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(type) } },
          meta: {
            allOf: [
              { $ref: getSchemaPath(ResponseMetaDto) },
              {
                properties: { pagination: { $ref: getSchemaPath(PaginationMetaDto) } },
                required: ['pagination'],
              },
            ],
          },
        },
        required: ['data', 'meta'],
      },
    }),
    ApiErroreComune(),
  );
};
