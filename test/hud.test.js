import test from 'node:test';
import assert from 'node:assert/strict';
import { glyph, textWidth } from '../src/render/hud.js';

test('every digit has a five-row glyph', () => {
  for (const d of '0123456789') {
    const rows = glyph(d);
    assert.equal(rows.length, 5, `digit ${d}`);
    for (const row of rows) assert.ok(row >= 0 && row <= 7, `digit ${d} row out of 3-bit range`);
  }
});

test('every letter used by the game has a glyph', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    assert.equal(glyph(ch).length, 5, `letter ${ch}`);
  }
});

test('lowercase is folded to uppercase', () => {
  assert.deepEqual(glyph('a'), glyph('A'));
});

test('a space is blank and an unknown character does not throw', () => {
  assert.deepEqual(glyph(' '), [0, 0, 0, 0, 0]);
  assert.equal(glyph('~').length, 5);
});

test('text width counts three pixels per glyph plus one of spacing', () => {
  assert.equal(textWidth('A'), 3);
  assert.equal(textWidth('AB'), 7);
  assert.equal(textWidth(''), 0);
});
