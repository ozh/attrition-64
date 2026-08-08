import test from 'node:test';
import assert from 'node:assert/strict';
import { createShot, stepShots } from '../src/engine/lasers.js';
import { LASER_SPEED, CEILING } from '../src/config.js';

const solid = (...keys) => (cx, cy) => new Set(keys).has(`${cx},${cy}`);
const none = () => false;

test('a shot travels upward at the configured speed', () => {
  const { shots } = stepShots([createShot(10, 50)], 0.1, none);
  assert.ok(Math.abs(shots[0].y - (50 - LASER_SPEED * 0.1)) < 1e-9);
});

test('a shot hitting a block reports the cell and despawns', () => {
  const { shots, hits } = stepShots([createShot(10, 30.4)], 0.005, solid('10,30'));
  assert.deepEqual(hits, [[10, 30]]);
  assert.equal(shots.length, 0, 'one shot, one block');
});

test('a shot leaving the top of the playfield despawns without a hit', () => {
  const { shots, hits } = stepShots([createShot(10, CEILING + 0.1)], 0.5, none);
  assert.equal(shots.length, 0);
  assert.deepEqual(hits, []);
});

test('a fast shot cannot skip over a block', () => {
  const { hits } = stepShots([createShot(10, 40)], 1 / 60, solid('10,39'));
  assert.deepEqual(hits, [[10, 39]]);
});

test('several shots are stepped independently', () => {
  const { shots, hits } = stepShots([createShot(10, 30.4), createShot(20, 50)], 0.005, solid('10,30'));
  assert.deepEqual(hits, [[10, 30]]);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].x, 20);
});

test('stepping an empty list is a no-op', () => {
  const { shots, hits } = stepShots([], 0.1, none);
  assert.deepEqual(shots, []);
  assert.deepEqual(hits, []);
});
