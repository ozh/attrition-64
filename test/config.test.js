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

test('every powerup kind has a duration except the instant one', () => {
  for (const kind of C.POWERUP_KINDS) {
    if (kind === 'multiball') continue;
    assert.equal(typeof C.EFFECT_DURATION[kind], 'number', `${kind} needs a duration`);
  }
});
