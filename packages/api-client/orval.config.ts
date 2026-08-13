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
      // Nessun `httpClient`: con "fetch" Orval avvolgerebbe la risposta in
      // { data, status, headers }, mentre il nostro mutator restituisce
      // direttamente il corpo — cioè l'envelope { data, meta }. Dichiararlo
      // produrrebbe tipi che non descrivono ciò che arriva davvero.
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
