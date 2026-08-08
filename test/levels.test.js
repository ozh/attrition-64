import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { loadLevels, idFromFilename, LEVEL_FILES } from '../src/levels/index.js';
import { validateLevel, estimateHitsToClear } from '../src/levels/validate.js';
import lungs from '../src/levels/01-cigarette-lungs.js';

test('the shipped level passes validation', () => {
  assert.doesNotThrow(() => validateLevel(lungs));
});

test('the lungs clear in a playable number of hits', () => {
  const hits = estimateHitsToClear(lungs);
  assert.ok(hits > 80 && hits < 600, `estimate was ${Math.round(hits)}`);
});

test('every registered level validates and is playable', async () => {
  const levels = await loadLevels({ error: (m) => assert.fail(m) });
  assert.ok(levels.length >= 4, `expected at least 4 levels, got ${levels.length}`);

  for (const level of levels) {
    assert.doesNotThrow(() => validateLevel(level), level.id);
    const hits = estimateHitsToClear(level);
    assert.ok(hits > 80 && hits < 600, `${level.id} estimates ${Math.round(hits)} hits`);
    assert.equal(level.grid.length, 64, level.id);
    for (const row of level.grid) assert.equal(row.length, 64, level.id);
  }
});

test('ids come from filenames, so they cannot collide', async () => {
  const ids = (await loadLevels({ error: () => {} })).map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('cigarette-lungs'), `got ${ids.join(', ')}`);
});

test('the ordering prefix is stripped from the id', () => {
  assert.equal(idFromFilename('01-cigarette-lungs.js'), 'cigarette-lungs');
  assert.equal(idFromFilename('12_car-iceberg.js'), 'car-iceberg');
  assert.equal(idFromFilename('chainsaw-tree.js'), 'chainsaw-tree');
});

test('a level file declaring its own id cannot override the filename', async () => {
  const levels = await loadLevels({ error: () => {} });
  for (const level of levels) assert.ok(level.id && !level.id.endsWith('.js'), level.id);
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

test('the registry lists exactly the level files on disk', () => {
  // A browser cannot read a directory and GitHub Pages serves no index, so the
  // runtime has to be told which files exist. Node can see both, which makes
  // this the only place the two can be compared — and the only thing standing
  // between a contributor forgetting a line and their level silently vanishing.
  const onDisk = readdirSync(new URL('../src/levels/', import.meta.url))
    .filter((name) => /^\d+[-_].+\.js$/.test(name))
    .sort();

  assert.deepEqual([...LEVEL_FILES].sort(), onDisk,
    'src/levels/index.js is out of step with the directory: add the new file to LEVEL_FILES, '
    + 'or remove the entry for a file that no longer exists');
});
