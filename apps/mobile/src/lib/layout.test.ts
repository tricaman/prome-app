// TypeScript 6 no longer loads @types on its own; Node's types stay scoped to
// the tests, so app code cannot reach for Node globals by accident.
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LARGHEZZA_DUE_PANNELLI,
  LARGHEZZA_LAYOUT_LARGO,
  duePannelli,
  layoutLargo,
} from './layout.ts';

describe('layoutLargo', () => {
  it('keeps the phone layout on every phone, even the largest one', () => {
    assert.equal(layoutLargo(430), false); // iPhone Pro Max, portrait
    assert.equal(layoutLargo(412), false); // large Android phone
  });

  it('keeps the phone layout on an iPad mini in portrait and in narrow iPad windows', () => {
    assert.equal(layoutLargo(744), false); // iPad mini, portrait
    assert.equal(layoutLargo(507), false); // iPad window at half width
  });

  it('switches to the wide layout on full-size tablets in both orientations', () => {
    assert.equal(layoutLargo(834), true); // iPad 11", portrait
    assert.equal(layoutLargo(1032), true); // iPad 13", portrait
    assert.equal(layoutLargo(1376), true); // iPad 13", landscape
    assert.equal(layoutLargo(800), true); // Pixel Tablet / Android 10", portrait
  });

  it('switches exactly at the threshold', () => {
    assert.equal(layoutLargo(LARGHEZZA_LAYOUT_LARGO - 1), false);
    assert.equal(layoutLargo(LARGHEZZA_LAYOUT_LARGO), true);
  });
});

describe('duePannelli', () => {
  it('never splits list and detail on a phone or an iPad mini', () => {
    assert.equal(duePannelli(430), false);
    assert.equal(duePannelli(744), false);
  });

  it('keeps one column next to the sidebar on an 11" iPad in portrait', () => {
    // 834 - sidebar 240 - list 360 would leave the detail about 230pt wide.
    assert.equal(duePannelli(834), false);
  });

  it('splits on a 13" iPad in portrait and on every iPad in landscape', () => {
    assert.equal(duePannelli(1032), true); // 13", portrait
    assert.equal(duePannelli(1210), true); // 11", landscape
    assert.equal(duePannelli(1376), true); // 13", landscape
  });

  it('switches exactly at the threshold', () => {
    assert.equal(duePannelli(LARGHEZZA_DUE_PANNELLI - 1), false);
    assert.equal(duePannelli(LARGHEZZA_DUE_PANNELLI), true);
  });
});
