import test from 'node:test';
import assert from 'node:assert/strict';
import { detonate } from '../src/engine/explode.js';
import { createGrid, blocksAt } from '../src/engine/grid.js';
import { GRID_TOP } from '../src/config.js';

const P = (gx, gy) => [gx, gy + GRID_TOP];

function level(rows, types) {
  return { id: 'x', types, grid: [...Array(64)].map((_, y) => (rows[y] ?? '.'.repeat(64)).padEnd(64, '.')) };
}

const soft = { color: '#fff', hp: 1, points: 10 };
const bomb = { color: '#f00', hp: 1, points: 50, explode: 1 };
const dud = { color: '#f80', hp: 1, points: 50, explode: 1, chain: false };
const wall = { color: '#444', solid: true };

test('radius 1 destroys the eight surrounding cells', () => {
  const g = createGrid(level(['###', '###', '###'], { '#': soft }));
  const { cells, points } = detonate(g, ...P(1, 1), 1);
  assert.equal(cells.length, 8, 'the origin is excluded');
  assert.equal(points, 80);
  for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]) {
    assert.ok(!blocksAt(g, ...P(x, y)), `${x},${y} should be gone`);
  }
});

test('the blast is square, not circular', () => {
  const g = createGrid(level(['#####', '#####', '#####', '#####', '#####'], { '#': soft }));
  const { cells } = detonate(g, ...P(2, 2), 2);
  assert.equal(cells.length, 24, '5x5 minus the origin');
});

test('the blast is clipped at the grid edge without error', () => {
  const g = createGrid(level(['##', '##'], { '#': soft }));
  const { cells } = detonate(g, ...P(0, 0), 3);
  assert.equal(cells.length, 3);
});

test('solid blocks survive a blast', () => {
  const g = createGrid(level(['===', '=#=', '==='], { '#': soft, '=': wall }));
  const { cells } = detonate(g, ...P(1, 1), 1);
  assert.equal(cells.length, 0);
  assert.ok(blocksAt(g, ...P(0, 0)));
});

test('a chaining blast sets off neighbouring bombs', () => {
  const g = createGrid(level(['B.B..#'], { B: bomb, '#': soft }));
  const { cells } = detonate(g, ...P(1, 0), 1);
  const destroyed = cells.map((c) => c.px).sort((a, b) => a - b);
  assert.deepEqual(destroyed, [0, 2], 'both bombs die');
  assert.ok(!blocksAt(g, ...P(0, 0)));
  assert.ok(!blocksAt(g, ...P(2, 0)));
});

test('a non-chaining blast destroys bombs without setting them off', () => {
  const g = createGrid(level(['.B...#'], { B: bomb, '#': soft }));
  const { cells } = detonate(g, ...P(0, 0), 1, false);
  assert.equal(cells.length, 1, 'only the adjacent bomb, which does not propagate');
  assert.ok(blocksAt(g, ...P(5, 0)), 'the distant block survives');
});

test('a chain: false block destroyed by someone else does not propagate', () => {
  const g = createGrid(level(['.D...#'], { D: dud, '#': soft }));
  detonate(g, ...P(0, 0), 1, true);
  assert.ok(blocksAt(g, ...P(5, 0)), 'the dud absorbed the chain');
});

test('mutually overlapping bombs terminate instead of looping', () => {
  const rows = [...Array(9)].map(() => 'BBBBBBBBB');
  const g = createGrid(level(rows, { B: bomb }));
  // Must return rather than hang; the visited set is the only thing preventing that.
  const { cells } = detonate(g, ...P(4, 4), 1);
  assert.equal(cells.length, 80, 'the chain swept the whole 9x9 field');
  assert.equal(g.remaining, 1, 'every bomb but the origin is gone');
  assert.ok(blocksAt(g, ...P(4, 4)), 'detonate never destroys its own origin — the caller already did');
});

test('points from every destroyed block are summed', () => {
  const g = createGrid(level(['B.B'], { B: bomb }));
  const { points } = detonate(g, ...P(1, 0), 1);
  assert.equal(points, 100);
});

test('detonating into empty space is a no-op', () => {
  const g = createGrid(level(['.'], { '#': soft }));
  const { cells, points } = detonate(g, ...P(30, 30), 2);
  assert.equal(cells.length, 0);
  assert.equal(points, 0);
});
