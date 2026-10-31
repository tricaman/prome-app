import { SchemaEnv } from '../src/config/env';

/**
 * The production compose passes optional variables as `${NAME:-}`, so an unset
 * one arrives as an empty string: it must read as unset, never stop the API.
 */
describe('Ambiente', () => {
  const minimo = {
    DATABASE_URL: 'postgresql://prome:prome@localhost:6400/prome',
    BETTER_AUTH_SECRET: 'segreto-di-prova-lungo-abbastanza-per-i-test',
  };

  it('an empty EMAIL_AMMINISTRATORE means no admin, not a failed start', () => {
    expect(SchemaEnv.safeParse({ ...minimo, EMAIL_AMMINISTRATORE: '' }).success).toBe(true);
  });

  it('a malformed EMAIL_AMMINISTRATORE still stops the start', () => {
    expect(SchemaEnv.safeParse({ ...minimo, EMAIL_AMMINISTRATORE: 'non-una-email' }).success).toBe(false);
  });
});
