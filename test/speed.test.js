import test from 'node:test';
import assert from 'node:assert/strict';
import { timeSpeedFactor } from '../src/engine/speed.js';
import { TIME_ACCEL_STEP, TIME_ACCEL_SECONDS, TIME_ACCEL_MAX } from '../src/config.js';

test('a fresh life runs at the base speed', () => {
  assert.equal(timeSpeedFactor(0), 1);
});

test('one interval is exactly one step of acceleration', () => {
  assert.ok(Math.abs(timeSpeedFactor(TIME_ACCEL_SECONDS) - (1 + TIME_ACCEL_STEP)) < 1e-12);
});

test('it compounds rather than adding', () => {
  const two = timeSpeedFactor(TIME_ACCEL_SECONDS * 2);
  assert.ok(Math.abs(two - (1 + TIME_ACCEL_STEP) ** 2) < 1e-12);
  assert.ok(two > 1 + TIME_ACCEL_STEP * 2, 'compounding outruns linear');
});

test('it is continuous, not stepped', () => {
  // Half an interval must land between the two steps, or the ball lurches.
  const half = timeSpeedFactor(TIME_ACCEL_SECONDS / 2);
  assert.ok(half > 1 && half < 1 + TIME_ACCEL_STEP, `got ${half}`);
});

test('it rises monotonically', () => {
  let previous = 0;
  for (let t = 0; t <= 600; t += 7) {
    const factor = timeSpeedFactor(t);
    assert.ok(factor >= previous, `dropped at ${t}s`);
    previous = factor;
  }
});

test('it is capped, so a long stall stays playable', () => {
  for (const seconds of [600, 3600, 1e6]) {
    assert.equal(timeSpeedFactor(seconds), TIME_ACCEL_MAX, `at ${seconds}s`);
  }
});

test('rubbish input falls back to the base speed rather than NaN', () => {
  for (const bad of [undefined, null, NaN, Infinity, -5, 'x']) {
    assert.equal(timeSpeedFactor(bad), 1, `for ${String(bad)}`);
  }
});

test('the published numbers hold', () => {
  // What was agreed: about +27% after three minutes.
  const threeMinutes = timeSpeedFactor(180);
  assert.ok(threeMinutes > 1.25 && threeMinutes < 1.30, `got ${threeMinutes.toFixed(3)}`);
});
