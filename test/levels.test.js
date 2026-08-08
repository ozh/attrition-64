import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLevels } from '../src/levels/index.js';
import { validateLevel, estimateHitsToClear } from '../src/levels/validate.js';
import lungs from '../src/levels/01-cigarette-lungs.js';

test('the shipped level passes validation', () => {
  assert.doesNotThrow(() => validateLevel(lungs));
});

test('the lungs clear in a playable number of hits', () => {
  const hits = estimateHitsToClear(lungs);
  assert.ok(hits > 80 && hits < 600, `estimate was ${Math.round(hits)}`);
});

test('every registered level validates and is playable', () => {
  const levels = loadLevels({ error: (m) => assert.fail(m) });
  assert.ok(levels.length >= 4, `expected at least 4 levels, got ${levels.length}`);

  for (const level of levels) {
    assert.doesNotThrow(() => validateLevel(level), level.id);
    const hits = estimateHitsToClear(level);
    assert.ok(hits > 80 && hits < 600, `${level.id} estimates ${Math.round(hits)} hits`);
    assert.equal(level.grid.length, 64, level.id);
    for (const row of level.grid) assert.equal(row.length, 64, level.id);
  }
});

test('every level id is unique', () => {
  const ids = loadLevels({ error: () => {} }).map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the paddle is a cigarette of legal size', () => {
  assert.equal(lungs.paddle.grid[0].length, 16);
  assert.equal(lungs.paddle.grid.length, 3);
});

test('the lung silhouette is exactly left-right symmetric', () => {
  // The shape must mirror; the block-type scatter within it deliberately does
  // not, so compare filled-versus-empty rather than the characters themselves.
  for (const [i, row] of lungs.grid.entries()) {
    const mirrored = [...row].reverse().join('');
    const matches = [...row].filter((ch, x) => (ch === '.') === (mirrored[x] === '.')).length;
    assert.equal(matches, 64, `row ${i} silhouette is not symmetric`);
  }
});
