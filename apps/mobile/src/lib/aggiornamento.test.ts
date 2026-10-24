// TypeScript 6 no longer loads @types on its own; Node's types stay scoped to
// the tests, so app code cannot reach for Node globals by accident.
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NEGOZIO_DI_RIPIEGO,
  aggiornamentoInstallabile,
  confrontaVersioni,
  leggiSchedaAppStore,
  negoziDaInterrogare,
} from './aggiornamento.ts';

describe('confrontaVersioni', () => {
  it('orders versions number by number, never as text', () => {
    assert.ok(confrontaVersioni('1.10.0', '1.9.9') > 0);
    assert.ok(confrontaVersioni('2.0.0', '10.0.0') < 0);
    assert.ok(confrontaVersioni('1.0.1', '1.0.0') > 0);
    assert.equal(confrontaVersioni('1.4.2', '1.4.2'), 0);
  });

  it('counts a missing part as zero', () => {
    assert.equal(confrontaVersioni('1.2', '1.2.0'), 0);
    assert.ok(confrontaVersioni('1.2.1', '1.2') > 0);
  });

  it('compares bare build numbers, as Play versionCodes are', () => {
    assert.ok(confrontaVersioni('3', '2') > 0);
    assert.ok(confrontaVersioni('12', '9') > 0);
  });

  it('reads a part that is not a number as zero instead of failing', () => {
    assert.equal(confrontaVersioni('1.0.x', '1.0.0'), 0);
    assert.equal(confrontaVersioni('', '0'), 0);
  });
});

describe('negoziDaInterrogare', () => {
  it("asks the device's own storefront first, then the fallback one", () => {
    assert.deepEqual(negoziDaInterrogare('DE'), ['de', NEGOZIO_DI_RIPIEGO]);
  });

  it('asks the fallback storefront once when it is already the device one', () => {
    assert.deepEqual(negoziDaInterrogare('IT'), [NEGOZIO_DI_RIPIEGO]);
  });

  it('falls back alone when the region is missing or is not a country', () => {
    assert.deepEqual(negoziDaInterrogare(null), [NEGOZIO_DI_RIPIEGO]);
    assert.deepEqual(negoziDaInterrogare(undefined), [NEGOZIO_DI_RIPIEGO]);
    assert.deepEqual(negoziDaInterrogare(''), [NEGOZIO_DI_RIPIEGO]);
    // UN M49 area codes, which iOS reports for regions like Latin America.
    assert.deepEqual(negoziDaInterrogare('419'), [NEGOZIO_DI_RIPIEGO]);
  });
});

describe('leggiSchedaAppStore', () => {
  const risposta = {
    resultCount: 1,
    results: [
      {
        version: '1.1.0',
        minimumOsVersion: '16.4',
        trackViewUrl: 'https://apps.apple.com/it/app/prome/id6819014965?uo=4',
      },
    ],
  };

  it('reads version, minimum iOS and page from the first result', () => {
    assert.deepEqual(leggiSchedaAppStore(risposta), {
      versione: '1.1.0',
      versioneMinimaSistema: '16.4',
      indirizzo: 'https://apps.apple.com/it/app/prome/id6819014965?uo=4',
    });
  });

  it('finds nothing in a storefront where the app is not on sale', () => {
    assert.equal(leggiSchedaAppStore({ resultCount: 0, results: [] }), null);
  });

  it('finds nothing in a response it cannot read', () => {
    assert.equal(leggiSchedaAppStore(null), null);
    assert.equal(leggiSchedaAppStore('<html>'), null);
    assert.equal(leggiSchedaAppStore({ results: 'nope' }), null);
    assert.equal(leggiSchedaAppStore({ results: [{ version: 110 }] }), null);
  });

  it('keeps the version when page or minimum iOS are missing or unusable', () => {
    assert.deepEqual(
      leggiSchedaAppStore({ results: [{ version: '1.1.0', trackViewUrl: 'itms://x' }] }),
      { versione: '1.1.0', versioneMinimaSistema: null, indirizzo: null },
    );
  });
});

describe('aggiornamentoInstallabile', () => {
  it('offers a newer version this device can run', () => {
    assert.equal(
      aggiornamentoInstallabile({
        versioneStore: '1.1.0',
        versioneInstallata: '1.0.0',
        versioneMinimaSistema: '16.4',
        versioneSistema: '18.2',
      }),
      true,
    );
  });

  it('stays quiet when the store is not ahead', () => {
    const base = { versioneMinimaSistema: null, versioneSistema: '18.2' };

    assert.equal(
      aggiornamentoInstallabile({ ...base, versioneStore: '1.0.0', versioneInstallata: '1.0.0' }),
      false,
    );
    // A build newer than the store: TestFlight, or a release still in review.
    assert.equal(
      aggiornamentoInstallabile({ ...base, versioneStore: '1.0.0', versioneInstallata: '1.1.0' }),
      false,
    );
  });

  it('stays quiet when the new version needs a newer iOS than this device has', () => {
    assert.equal(
      aggiornamentoInstallabile({
        versioneStore: '1.1.0',
        versioneInstallata: '1.0.0',
        versioneMinimaSistema: '17.0',
        versioneSistema: '16.7.10',
      }),
      false,
    );
  });

  it('offers it when Apple publishes no minimum iOS', () => {
    assert.equal(
      aggiornamentoInstallabile({
        versioneStore: '1.1.0',
        versioneInstallata: '1.0.0',
        versioneMinimaSistema: null,
        versioneSistema: '16.4',
      }),
      true,
    );
  });
});
