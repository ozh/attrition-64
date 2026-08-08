import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/config.js';

test('backing canvas dimensions derive from the cell grid', () => {
  assert.equal(C.BASE_W, C.FIELD_W * C.CELL);
  assert.equal(C.BASE_H, C.FIELD_H * C.CELL);
  assert.equal(C.BASE_W, 256);
  assert.equal(C.BASE_H, 400);
});

test('the block grid fits between the HUD and the paddle band', () => {
  assert.equal(C.GRID_TOP, C.HUD_ROWS);
  assert.ok(C.GRID_TOP + C.GRID_ROWS < C.PADDLE_BAND_TOP);
  assert.ok(C.PADDLE_BAND_TOP + C.PADDLE_MAX_H <= C.DRAIN_ROW);
});

test('the paddle bottom leaves room for the tallest legal paddle', () => {
  assert.ok(C.PADDLE_BOTTOM - C.PADDLE_MAX_H >= C.PADDLE_BAND_TOP);
  assert.ok(C.PADDLE_BOTTOM < C.DRAIN_ROW);
});

test('every powerup kind either runs on a timer or fires instantly', () => {
  for (const kind of C.POWERUP_KINDS) {
    const instant = C.INSTANT_POWERUPS.includes(kind);
    const timed = typeof C.EFFECT_DURATION[kind] === 'number';
    assert.ok(instant !== timed,
      `${kind} must be exactly one of instant or timed (instant=${instant}, timed=${timed})`);
  }
});

test('the instant list names only real powerups', () => {
  for (const kind of C.INSTANT_POWERUPS) {
    assert.ok(C.POWERUP_KINDS.includes(kind), `${kind} is not a powerup`);
  }
});

test('the shield bar sits above the drain but below the paddle', () => {
  assert.ok(C.SHIELD_ROW < C.DRAIN_ROW, 'a shield below the drain would never catch anything');
  assert.ok(C.SHIELD_ROW > C.PADDLE_BOTTOM, 'a shield above the paddle would catch balls it should not');
});
