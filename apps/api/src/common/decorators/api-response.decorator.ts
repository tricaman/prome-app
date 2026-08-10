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
 */
export const ApiWrappedResponse = <T extends Type>(options: {
  type: T;
  status?: 200 | 201;
  description?: string;
  isArray?: boolean;
}) => {
  const { type, status = 200, description = 'Successo', isArray = false } = options;

  const schemaDati = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(type) } }
    : { $ref: getSchemaPath(type) };

  const DecoratoreRisposta = status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(ResponseMetaDto, type),
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
