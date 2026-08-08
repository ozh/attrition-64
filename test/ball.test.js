import test from 'node:test';
import assert from 'node:assert/strict';
import { createBall, stepBall, ballSpeed, setBallAngle } from '../src/engine/ball.js';
import { FIELD_W, CEILING, DRAIN_ROW, BALL_SIZE } from '../src/config.js';

const world = (blocked = new Set(), sink = {}) => ({
  isBlocked: (cx, cy) => blocked.has(`${cx},${cy}`),
  onHitCell: (cx, cy) => (sink.cells ??= []).push([cx, cy]),
  onWall: () => { sink.walls = (sink.walls ?? 0) + 1; },
});

test('a ball created straight up travels upward at its speed', () => {
  const b = createBall(30, 50, 40, 0);
  assert.ok(Math.abs(b.vx) < 1e-9);
  assert.equal(Math.round(b.vy), -40);
  assert.equal(Math.round(ballSpeed(b)), 40);
});

test('a positive angle sends the ball to the right', () => {
  const b = createBall(30, 50, 40, Math.PI / 4);
  assert.ok(b.vx > 0 && b.vy < 0);
});

test('free flight advances by speed times time', () => {
  const b = createBall(30, 50, 40, 0);
  stepBall(b, 0.1, world());
  assert.ok(Math.abs(b.y - 46) < 1e-6, `expected 46, got ${b.y}`);
});

test('the left wall reflects and reports a wall hit', () => {
  const sink = {};
  const b = createBall(0.2, 50, 40, -Math.PI / 2);
  stepBall(b, 0.05, world(new Set(), sink));
  assert.ok(b.x >= 0);
  assert.ok(b.vx > 0, 'reversed');
  assert.ok(sink.walls >= 1);
});

test('the right wall reflects', () => {
  const b = createBall(FIELD_W - BALL_SIZE - 0.2, 50, 40, Math.PI / 2);
  stepBall(b, 0.05, world());
  assert.ok(b.x + BALL_SIZE <= FIELD_W);
  assert.ok(b.vx < 0);
});

test('the ceiling sits below the HUD and reflects', () => {
  const b = createBall(30, CEILING + 0.2, 40, 0);
  stepBall(b, 0.05, world());
  assert.ok(b.y >= CEILING, 'never enters the HUD band');
  assert.ok(b.vy > 0);
});

test('hitting a block reverses the ball and reports the cell', () => {
  const sink = {};
  const b = createBall(30, 20.1, 40, 0);
  stepBall(b, 0.05, world(new Set(['30,19']), sink));
  assert.ok(b.vy > 0, 'reflected downward');
  assert.deepEqual(sink.cells[0], [30, 19]);
});

test('speed is preserved through a bounce', () => {
  const b = createBall(30, 20.1, 40, 0);
  stepBall(b, 0.05, world(new Set(['30,19'])));
  assert.ok(Math.abs(ballSpeed(b) - 40) < 1e-6);
});

test('a very fast ball cannot tunnel through a one-cell wall', () => {
  const sink = {};
  const b = createBall(30, 40, 900, 0);
  stepBall(b, 1 / 60, world(new Set(['30,30']), sink));
  assert.ok(b.y > 30, `stopped below the wall, got y=${b.y}`);
  assert.ok(sink.cells.length > 0, 'the wall was registered as hit');
});

test('a ball past the drain row is reported as drained', () => {
  const b = createBall(30, DRAIN_ROW - 0.1, 40, Math.PI);
  const r = stepBall(b, 0.1, world());
  assert.equal(r.drained, true);
});

test('a ball still in play is not reported as drained', () => {
  const b = createBall(30, 50, 40, 0);
  assert.equal(stepBall(b, 0.1, world()).drained, false);
});

test('setBallAngle rewrites direction while setting an explicit speed', () => {
  const b = createBall(30, 50, 40, 0);
  setBallAngle(b, Math.PI / 2, 60);
  assert.ok(Math.abs(ballSpeed(b) - 60) < 1e-9);
  assert.ok(b.vx > 0);
});

test('a stuck ball does not move', () => {
  const b = createBall(30, 50, 40, 0);
  b.stuck = true;
  stepBall(b, 0.1, world());
  assert.equal(b.y, 50);
});
