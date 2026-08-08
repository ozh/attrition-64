import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEffects, applyEffect, tickEffects, hasEffect, effectRemaining, clearEffects,
} from '../src/engine/effects.js';
import { EFFECT_DURATION } from '../src/config.js';

test('applying an effect starts its timer', () => {
  const e = createEffects();
  assert.equal(applyEffect(e, 'laser'), true);
  assert.equal(hasEffect(e, 'laser'), true);
  assert.equal(effectRemaining(e, 'laser'), EFFECT_DURATION.laser);
});

test('an effect expires exactly once, and is reported when it does', () => {
  const e = createEffects();
  applyEffect(e, 'laser');
  assert.deepEqual(tickEffects(e, EFFECT_DURATION.laser - 0.1), []);
  assert.deepEqual(tickEffects(e, 0.2), ['laser']);
  assert.equal(hasEffect(e, 'laser'), false);
  assert.deepEqual(tickEffects(e, 1), [], 'not reported a second time');
});

test('re-catching refreshes the timer instead of stacking it', () => {
  const e = createEffects();
  applyEffect(e, 'widePaddle');
  tickEffects(e, 10);
  applyEffect(e, 'widePaddle');
  assert.equal(effectRemaining(e, 'widePaddle'), EFFECT_DURATION.widePaddle,
    'a second pickup must not grant 2x the duration');
});

test('slowBall and fastBall cancel each other', () => {
  const e = createEffects();
  applyEffect(e, 'slowBall');
  applyEffect(e, 'fastBall');
  assert.equal(hasEffect(e, 'slowBall'), false);
  assert.equal(hasEffect(e, 'fastBall'), true);

  applyEffect(e, 'slowBall');
  assert.equal(hasEffect(e, 'fastBall'), false);
  assert.equal(hasEffect(e, 'slowBall'), true);
});

test('multiball is instant and holds no timer', () => {
  const e = createEffects();
  assert.equal(applyEffect(e, 'multiball'), false);
  assert.equal(hasEffect(e, 'multiball'), false);
});

test('clearEffects empties everything, as on losing a life', () => {
  const e = createEffects();
  applyEffect(e, 'laser');
  applyEffect(e, 'sticky');
  clearEffects(e);
  assert.equal(hasEffect(e, 'laser'), false);
  assert.equal(hasEffect(e, 'sticky'), false);
});

test('several effects expiring on the same tick are all reported', () => {
  const e = createEffects();
  applyEffect(e, 'laser');
  applyEffect(e, 'sticky');
  const expired = tickEffects(e, 999).sort();
  assert.deepEqual(expired, ['laser', 'sticky']);
});
