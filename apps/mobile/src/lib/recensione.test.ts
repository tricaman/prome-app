// TypeScript 6 no longer loads @types on its own; Node's types stay scoped to
// the tests, so app code cannot reach for Node globals by accident.
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { INTERVALLO_RICHIESTA_MS, indirizzoRecensione, richiestaDovuta } from './recensione.ts';

const GIORNO = 24 * 60 * 60 * 1000;

describe('indirizzoRecensione', () => {
  it("su iOS apre l'App Store direttamente sulla scrittura della recensione", () => {
    assert.equal(
      indirizzoRecensione({
        piattaforma: 'ios',
        idAppStore: '1234567890',
        pacchettoAndroid: 'app.mariustrica.prome',
      }),
      'https://apps.apple.com/app/id1234567890?action=write-review',
    );
  });

  it('su Android apre la scheda di Play, che non ha un collegamento alla recensione', () => {
    assert.equal(
      indirizzoRecensione({
        piattaforma: 'android',
        idAppStore: null,
        pacchettoAndroid: 'app.mariustrica.prome',
      }),
      'https://play.google.com/store/apps/details?id=app.mariustrica.prome',
    );
  });

  it("su iOS non c'è niente da aprire finché l'app non ha un identificativo dell'App Store", () => {
    assert.equal(
      indirizzoRecensione({
        piattaforma: 'ios',
        idAppStore: null,
        pacchettoAndroid: 'app.mariustrica.prome',
      }),
      null,
    );
  });

  it('un identificativo vuoto vale come nessun identificativo', () => {
    assert.equal(
      indirizzoRecensione({ piattaforma: 'ios', idAppStore: '  ', pacchettoAndroid: null }),
      null,
    );
    assert.equal(
      indirizzoRecensione({ piattaforma: 'android', idAppStore: null, pacchettoAndroid: '' }),
      null,
    );
  });

  it('fuori da iOS e Android non ci sono store', () => {
    assert.equal(
      indirizzoRecensione({
        piattaforma: 'web',
        idAppStore: '1234567890',
        pacchettoAndroid: 'app.mariustrica.prome',
      }),
      null,
    );
  });
});

describe('richiestaDovuta', () => {
  const adesso = Date.UTC(2026, 9, 2);

  it('fra due richieste passa una settimana', () => {
    assert.equal(INTERVALLO_RICHIESTA_MS, 7 * GIORNO);
  });

  it('non chiede mai la prima volta: il primo momento fa solo partire il conto', () => {
    assert.equal(richiestaDovuta({ ultimaRichiesta: null, adesso }), false);
  });

  it("tace prima che l'intervallo sia passato", () => {
    assert.equal(richiestaDovuta({ ultimaRichiesta: adesso - 6 * GIORNO, adesso }), false);
  });

  it("chiede esattamente allo scadere dell'intervallo", () => {
    assert.equal(
      richiestaDovuta({ ultimaRichiesta: adesso - INTERVALLO_RICHIESTA_MS, adesso }),
      true,
    );
  });

  it("chiede quando l'intervallo è passato", () => {
    assert.equal(richiestaDovuta({ ultimaRichiesta: adesso - 8 * GIORNO, adesso }), true);
  });

  it("un orologio tornato indietro non blocca la richiesta per sempre", () => {
    assert.equal(richiestaDovuta({ ultimaRichiesta: adesso + 30 * GIORNO, adesso }), true);
  });

  it('rispetta un intervallo diverso', () => {
    assert.equal(
      richiestaDovuta({ ultimaRichiesta: adesso - GIORNO, adesso, intervalloMs: GIORNO }),
      true,
    );
    assert.equal(
      richiestaDovuta({ ultimaRichiesta: adesso - GIORNO + 1, adesso, intervalloMs: GIORNO }),
      false,
    );
  });
});
