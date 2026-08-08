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

test('every punctuation glyph is defined, not the unknown fallback', () => {
  // A mistyped key in FONT does not throw — glyph() quietly returns the tofu
  // box. That is the right behaviour at runtime and the wrong thing to ship,
  // so pin it here: only 0 and O may legitimately be that shape.
  const TOFU = [7, 5, 5, 5, 7];
  for (const ch of '-:.!?,"\'@') {
    const rows = glyph(ch);
    assert.equal(rows.length, 5, `${ch} must have five rows`);
    for (const row of rows) assert.ok(row >= 0 && row <= 7, `${ch} row ${row} is not 3 bits`);
    assert.notDeepEqual(rows, TOFU, `${ch} is missing from FONT — it fell back to the unknown box`);
  }
});

test('marks that differ only in their tail are actually different', () => {
  // The pairs most likely to be copy-paste mistakes.
  assert.notDeepEqual(glyph('.'), glyph(','));
  assert.notDeepEqual(glyph("'"), glyph('"'));
  assert.notDeepEqual(glyph('!'), glyph('?'));
});

test('quote marks sit at the top and the comma at the bottom', () => {
  assert.deepEqual(glyph('"').slice(2), [0, 0, 0], 'quotes occupy the top rows only');
  assert.deepEqual(glyph(',').slice(0, 3), [0, 0, 0], 'the comma occupies the bottom rows only');
});

test('text width counts three pixels per glyph plus one of spacing', () => {
  assert.equal(textWidth('A'), 3);
  assert.equal(textWidth('AB'), 7);
  assert.equal(textWidth(''), 0);
});
