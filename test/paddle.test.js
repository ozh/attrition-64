import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaddle, paddleBox, movePaddle, setPaddleCenter, setPaddleScale,
  ballHitsPaddle, deflect,
} from '../src/engine/paddle.js';
import { createBall, ballSpeed } from '../src/engine/ball.js';
import { FIELD_W, PADDLE_BOTTOM, PADDLE_SPEED, BALL_MAX_ANGLE, WIDE_PADDLE_SCALE } from '../src/config.js';

const level = (rows = ['WWWWWWWWWWWWWWWW']) => ({ paddle: { colors: { W: '#fff' }, grid: rows } });

test('a new paddle is centred and sized from its trimmed sprite', () => {
  const p = createPaddle(level());
  assert.equal(p.baseW, 16);
  assert.equal(p.h, 1);
  const box = paddleBox(p);
  assert.equal(box.w, 16);
  assert.equal(box.x + box.w / 2, FIELD_W / 2);
});

test('surrounding whitespace is trimmed away before sizing', () => {
  const p = createPaddle(level(['....WWWWWWWWWWWWWWWW....', '........................']));
  assert.equal(p.baseW, 16);
  assert.equal(p.h, 1);
});

test('the paddle sits on the configured bottom row', () => {
  const p = createPaddle(level(['WWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWW']));
  const box = paddleBox(p);
  assert.equal(box.h, 2);
  assert.equal(box.y + box.h, PADDLE_BOTTOM);
});

test('movement is proportional to time', () => {
  const p = createPaddle(level());
  const before = p.x;
  // Short enough not to reach the wall: centred at 24, the right limit is 48.
  movePaddle(p, 1, 0.1);
  assert.ok(Math.abs(p.x - (before + PADDLE_SPEED * 0.1)) < 1e-9);
});

test('the paddle cannot leave the playfield', () => {
  const p = createPaddle(level());
  movePaddle(p, -1, 10);
  assert.equal(p.x, 0);
  movePaddle(p, 1, 10);
  assert.equal(p.x + paddleBox(p).w, FIELD_W);
});

test('setPaddleCenter clamps at both edges', () => {
  const p = createPaddle(level());
  setPaddleCenter(p, -100);
  assert.equal(p.x, 0);
  setPaddleCenter(p, 1000);
  assert.equal(p.x + paddleBox(p).w, FIELD_W);
});

test('scaling grows the paddle about its centre', () => {
  const p = createPaddle(level());
  const before = paddleBox(p);
  setPaddleScale(p, WIDE_PADDLE_SCALE);
  const after = paddleBox(p);
  assert.equal(after.w, 16 * WIDE_PADDLE_SCALE);
  assert.ok(Math.abs((after.x + after.w / 2) - (before.x + before.w / 2)) < 1e-9);
});

test('scaling at the wall clamps back inside the playfield', () => {
  const p = createPaddle(level());
  setPaddleCenter(p, FIELD_W);
  setPaddleScale(p, WIDE_PADDLE_SCALE);
  assert.ok(p.x + paddleBox(p).w <= FIELD_W + 1e-9);
});

test('a centred hit sends the ball straight up', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const b = createBall(box.x + box.w / 2 - 0.5, box.y - 1, 40, Math.PI);
  const angle = deflect(b, p);
  assert.ok(Math.abs(angle) < 1e-9);
  assert.ok(b.vy < 0);
});

test('the edges deflect at the maximum angle, and the sign follows the side', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);

  const right = createBall(box.x + box.w - 0.5, box.y - 1, 40, Math.PI);
  assert.ok(Math.abs(deflect(right, p) - BALL_MAX_ANGLE) < 1e-6);
  assert.ok(right.vx > 0);

  const left = createBall(box.x - 0.5, box.y - 1, 40, Math.PI);
  assert.ok(Math.abs(deflect(left, p) + BALL_MAX_ANGLE) < 1e-6);
  assert.ok(left.vx < 0);
});

test('a hit beyond the edge is clamped rather than over-rotated', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const b = createBall(box.x + box.w + 5, box.y - 1, 40, Math.PI);
  assert.ok(Math.abs(deflect(b, p)) <= BALL_MAX_ANGLE + 1e-9);
});

test('deflection preserves speed', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const b = createBall(box.x + 2, box.y - 1, 37, Math.PI);
  deflect(b, p);
  assert.ok(Math.abs(ballSpeed(b) - 37) < 1e-6);
});

test('only a descending ball overlapping the paddle counts as a hit', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const falling = createBall(box.x + 2, box.y - 0.5, 40, Math.PI);
  assert.equal(ballHitsPaddle(falling, p), true);

  const rising = createBall(box.x + 2, box.y - 0.5, 40, 0);
  assert.equal(ballHitsPaddle(rising, p), false, 'a ball on its way up must pass through');

  const away = createBall(box.x - 10, box.y - 0.5, 40, Math.PI);
  assert.equal(ballHitsPaddle(away, p), false);
});
