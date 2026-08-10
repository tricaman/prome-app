import { defineConfig } from 'orval';

/**
 * Genera tipi + hook React Query dalla spec OpenAPI dell'API.
 * Flusso: `pnpm api:client` alla root = emette la spec e rigenera qui.
 * I file in src/generated NON si modificano a mano.
 */
export default defineConfig({
  prome: {
    input: '../contracts/openapi.json',
    output: {
      target: './src/generated/endpoints.ts',
      schemas: './src/generated/modelli',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/client/istanza.ts',
          name: 'istanzaApi',
        },
      },
    },
  },
});
