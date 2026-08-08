import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFit } from '../src/render/scale.js';
import { BASE_W, BASE_H } from '../src/config.js';

test('a desktop window picks the largest integer factor that fits', () => {
  const fit = computeFit({ viewportW: 1400, viewportH: 900, dpr: 1 });
  assert.equal(fit.scale, Math.floor(900 / BASE_H));
  assert.equal(fit.cssW, BASE_W * fit.scale);
  assert.equal(fit.cssH, BASE_H * fit.scale);
});

test('the factor is always an integer, so pixels stay square', () => {
  for (const h of [401, 555, 799, 801]) {
    const fit = computeFit({ viewportW: 4000, viewportH: h, dpr: 1 });
    assert.equal(fit.scale, Math.floor(fit.scale));
  }
});

test('a phone is scaled in device pixels, not CSS pixels', () => {
  // The whole point: 390 CSS px admits only 1x, but at DPR 3 there are 1170
  // device pixels, which admits 4x and nearly fills the screen.
  const fit = computeFit({ viewportW: 390, viewportH: 844, dpr: 3 });
  assert.ok(fit.scale >= 4, `expected at least 4x, got ${fit.scale}`);
  assert.ok(fit.cssW > 300, `expected the canvas to fill the width, got ${fit.cssW}`);
});

test('the backing store is sized in device pixels', () => {
  const fit = computeFit({ viewportW: 390, viewportH: 844, dpr: 3 });
  assert.equal(fit.deviceW, BASE_W * fit.scale);
  assert.equal(fit.deviceH, BASE_H * fit.scale);
  assert.ok(Math.abs(fit.cssW - fit.deviceW / 3) < 1e-9);
});

test('the canvas never overflows a viewport that can hold it', () => {
  for (const [w, h, dpr] of [[1400, 900, 1], [390, 844, 3], [768, 1024, 2], [1920, 1080, 1]]) {
    const fit = computeFit({ viewportW: w, viewportH: h, dpr });
    assert.ok(fit.cssW <= w + 1e-9, `width ${fit.cssW} > ${w}`);
    assert.ok(fit.cssH <= h + 1e-9, `height ${fit.cssH} > ${h}`);
  }
});

test('a viewport too small for even 1x still returns a usable scale', () => {
  const fit = computeFit({ viewportW: 100, viewportH: 100, dpr: 1 });
  assert.equal(fit.scale, 1, 'never 0, which would produce a zero-sized canvas');
});

test('a missing or absurd dpr falls back to 1', () => {
  const withDefault = computeFit({ viewportW: 800, viewportH: 800 });
  const withOne = computeFit({ viewportW: 800, viewportH: 800, dpr: 1 });
  assert.equal(withDefault.scale, withOne.scale);
  assert.ok(computeFit({ viewportW: 800, viewportH: 800, dpr: 0 }).scale >= 1);
});
