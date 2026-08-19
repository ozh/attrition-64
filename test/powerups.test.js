import test from 'node:test';
import assert from 'node:assert/strict';
import { rollPowerup, createDrop, stepDrops } from '../src/engine/powerups.js';
import { createPaddle, paddleBox } from '../src/engine/paddle.js';
import { DROP_SPEED, DROP_SPEED_JITTER, DRAIN_ROW, POWERUP_KINDS } from '../src/config.js';

const paddle = () => createPaddle({ paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWWWWWWWWW'] } });
/** Deterministic rng: returns the queued values in order. */
const rng = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('a block with no powerup never drops', () => {
  assert.equal(rollPowerup({ color: '#fff' }, rng(0)), null);
});

test('the chance is respected at both ends', () => {
  assert.equal(rollPowerup({ powerup: 0.2 }, rng(0.9, 0)), null, 'roll above the chance fails');
  assert.ok(rollPowerup({ powerup: 0.2 }, rng(0.1, 0)) !== null, 'roll below the chance succeeds');
  assert.equal(rollPowerup({ powerup: 0 }, rng(0, 0)), null, 'chance 0 never drops');
  assert.ok(rollPowerup({ powerup: 1 }, rng(0.999, 0)) !== null, 'chance 1 always drops');
});

test('a named kind is always the one dropped', () => {
  assert.equal(rollPowerup({ powerup: { chance: 1, kind: 'laser' } }, rng(0, 0)), 'laser');
});

test('a kinds list is chosen from', () => {
  const spec = { powerup: { chance: 1, kinds: ['sticky', 'laser'] } };
  assert.equal(rollPowerup(spec, rng(0, 0)), 'sticky');
  assert.equal(rollPowerup(spec, rng(0, 0.99)), 'laser');
});

test('a bare chance picks from the full pool', () => {
  const kind = rollPowerup({ powerup: 1 }, rng(0, 0));
  assert.ok(POWERUP_KINDS.includes(kind));
});

test('drops fall at the configured speed', () => {
  const d = createDrop('laser', 10, 20, rng(0.5));   // 0.5 is the middle of the jitter range
  const { drops } = stepDrops([d], 0.5, paddle());
  assert.ok(Math.abs(drops[0].y - (20 + DROP_SPEED * 0.5)) < 1e-9);
});

test('each drop rolls its own fall speed', () => {
  const slow = createDrop('laser', 10, 20, rng(0));
  const fast = createDrop('laser', 10, 20, rng(1));
  assert.ok(slow.vy < DROP_SPEED, 'the bottom of the range is slower than the mean');
  assert.ok(fast.vy > DROP_SPEED, 'the top of the range is faster than the mean');
  assert.ok(Math.abs(slow.vy - DROP_SPEED * (1 - DROP_SPEED_JITTER)) < 1e-9);
  assert.ok(Math.abs(fast.vy - DROP_SPEED * (1 + DROP_SPEED_JITTER)) < 1e-9);
});

test('drops sharing a spawn separate as they fall', () => {
  const both = [createDrop('laser', 10, 20, rng(0)), createDrop('sticky', 30, 20, rng(1))];
  const { drops } = stepDrops(both, 1, paddle());
  assert.ok(drops[1].y > drops[0].y, 'the faster drop is lower after a second');
});

test('a drop reaching the paddle is caught and removed', () => {
  const p = paddle();
  const box = paddleBox(p);
  const d = createDrop('sticky', box.x + 2, box.y - 0.1);
  const { drops, caught } = stepDrops([d], 0.02, p);
  assert.deepEqual(caught, ['sticky']);
  assert.equal(drops.length, 0);
});

test('a drop missing the paddle horizontally is not caught', () => {
  const p = paddle();
  const box = paddleBox(p);
  const d = createDrop('sticky', box.x - 5, box.y - 0.1);
  const { caught } = stepDrops([d], 0.02, p);
  assert.deepEqual(caught, []);
});

test('a drop past the drain row is discarded', () => {
  const p = paddle();
  const d = createDrop('laser', 2, DRAIN_ROW - 0.1);
  const { drops, caught } = stepDrops([d], 0.5, p);
  assert.equal(drops.length, 0);
  assert.deepEqual(caught, []);
});

test('a drop carries its own age, which is the blink clock', () => {
  const d = createDrop('wrap', 10, 20, rng(0.5));
  assert.equal(d.age, 0, 'a fresh drop starts at zero');
  const { drops } = stepDrops([d], 0.25, paddle());
  assert.ok(Math.abs(drops[0].age - 0.25) < 1e-9, `expected 0.25, got ${drops[0].age}`);
});

test('several drops are handled independently in one step', () => {
  const p = paddle();
  const box = paddleBox(p);
  const result = stepDrops([
    createDrop('laser', box.x + 1, box.y - 0.1),
    createDrop('sticky', 1, 10),
  ], 0.02, p);
  assert.deepEqual(result.caught, ['laser']);
  assert.equal(result.drops.length, 1);
  assert.equal(result.drops[0].kind, 'sticky');
});
