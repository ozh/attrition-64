import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSprite, charAt, isEmptySprite } from '../src/engine/sprite.js';

test('untrimmed parse keeps the authored dimensions', () => {
  const s = parseSprite(['.#.', '###', '.#.'], { trim: false });
  assert.equal(s.w, 3);
  assert.equal(s.h, 3);
  assert.equal(s.offsetX, 0);
  assert.equal(s.offsetY, 0);
  assert.equal(charAt(s, 1, 0), '#');
  assert.equal(charAt(s, 0, 0), '');
});

test('ragged rows are padded to the longest row', () => {
  const s = parseSprite(['#', '####', '##'], { trim: false });
  assert.equal(s.w, 4);
  assert.equal(charAt(s, 3, 0), '');
  assert.equal(charAt(s, 3, 1), '#');
});

test('spaces count as empty alongside dots', () => {
  const s = parseSprite(['. #'], { trim: false });
  assert.equal(charAt(s, 0, 0), '');
  assert.equal(charAt(s, 1, 0), '');
  assert.equal(charAt(s, 2, 0), '#');
});

test('trimming crops to the filled bounding box and reports the offset', () => {
  const s = parseSprite([
    '.....',
    '..##.',
    '..##.',
    '.....',
  ], { trim: true });
  assert.equal(s.w, 2);
  assert.equal(s.h, 2);
  assert.equal(s.offsetX, 2);
  assert.equal(s.offsetY, 1);
  assert.equal(charAt(s, 0, 0), '#');
});

test('a trimmed single cell is 1x1 at its own offset', () => {
  const s = parseSprite(['...', '.X.', '...'], { trim: true });
  assert.deepEqual([s.w, s.h, s.offsetX, s.offsetY], [1, 1, 1, 1]);
  assert.equal(charAt(s, 0, 0), 'X');
});

test('an entirely empty grid yields an empty sprite rather than throwing', () => {
  const s = parseSprite(['...', '...'], { trim: true });
  assert.equal(s.w, 0);
  assert.equal(s.h, 0);
  assert.ok(isEmptySprite(s));
});

test('charAt is out-of-bounds safe in every direction', () => {
  const s = parseSprite(['##'], { trim: false });
  for (const [x, y] of [[-1, 0], [0, -1], [2, 0], [0, 1]]) {
    assert.equal(charAt(s, x, y), '', `expected '' at ${x},${y}`);
  }
});

test('distinct characters are preserved, not collapsed to a boolean', () => {
  const s = parseSprite(['aBc'], { trim: false });
  assert.deepEqual([charAt(s, 0, 0), charAt(s, 1, 0), charAt(s, 2, 0)], ['a', 'B', 'c']);
});
