import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGrid, blocksAt, specAt, colorAt, damageAt, destroyAt, isCleared,
} from '../src/engine/grid.js';
import { GRID_TOP } from '../src/config.js';

const P = (gx, gy) => [gx, gy + GRID_TOP];   // grid coords -> playfield coords

function level(rows, types) {
  const grid = [...Array(64)].map((_, y) => (rows[y] ?? '.'.repeat(64)).padEnd(64, '.'));
  return { id: 'g', types, grid };
}

const soft = { color: '#f0f0f0', hp: 1, points: 10 };
const tough = { color: '#c8a0a0', hp: 3, points: 30, damage: ['#c8a0a0', '#8a6060', '#503030'] };
const wall = { color: '#404040', solid: true };

test('grid coordinates are offset by GRID_TOP', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  assert.ok(blocksAt(g, ...P(0, 0)));
  assert.ok(!blocksAt(g, 0, 0), 'playfield row 0 is HUD, not blocks');
});

test('empty cells do not block', () => {
  const g = createGrid(level(['.#'], { '#': soft }));
  assert.ok(!blocksAt(g, ...P(0, 0)));
  assert.ok(blocksAt(g, ...P(1, 0)));
});

test('out-of-bounds never blocks', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  assert.ok(!blocksAt(g, -1, GRID_TOP));
  assert.ok(!blocksAt(g, 64, GRID_TOP));
  assert.ok(!blocksAt(g, 0, GRID_TOP - 1));
  assert.ok(!blocksAt(g, 0, GRID_TOP + 64));
});

test('a one-hit block dies in one hit and awards its points', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  const hit = damageAt(g, ...P(0, 0));
  assert.equal(hit.destroyed, true);
  assert.equal(hit.points, 10);
  assert.ok(!blocksAt(g, ...P(0, 0)));
});

test('a three-hit block survives two hits and scores only on death', () => {
  const g = createGrid(level(['T'], { T: tough }));
  const first = damageAt(g, ...P(0, 0));
  assert.equal(first.destroyed, false);
  assert.equal(first.points, 0);
  assert.ok(blocksAt(g, ...P(0, 0)));

  damageAt(g, ...P(0, 0));
  const third = damageAt(g, ...P(0, 0));
  assert.equal(third.destroyed, true);
  assert.equal(third.points, 30);
  assert.ok(!blocksAt(g, ...P(0, 0)));
});

test('damage colours run from full health downward', () => {
  const g = createGrid(level(['T'], { T: tough }));
  assert.equal(colorAt(g, ...P(0, 0)), '#c8a0a0');
  damageAt(g, ...P(0, 0));
  assert.equal(colorAt(g, ...P(0, 0)), '#8a6060');
  damageAt(g, ...P(0, 0));
  assert.equal(colorAt(g, ...P(0, 0)), '#503030');
});

test('a block without a damage array keeps its base colour', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  assert.equal(colorAt(g, ...P(0, 0)), '#f0f0f0');
});

test('solid blocks block forever and take no damage', () => {
  const g = createGrid(level(['='], { '=': wall }));
  assert.ok(blocksAt(g, ...P(0, 0)));
  const hit = damageAt(g, ...P(0, 0));
  assert.equal(hit.destroyed, false);
  assert.equal(hit.points, 0);
  assert.ok(blocksAt(g, ...P(0, 0)), 'still there');
  assert.equal(destroyAt(g, ...P(0, 0)), null, 'explosions cannot remove solid blocks');
});

test('damaging empty space returns null', () => {
  const g = createGrid(level(['.'], { '#': soft }));
  assert.equal(damageAt(g, ...P(0, 0)), null);
  assert.equal(destroyAt(g, ...P(5, 5)), null);
});

test('destroyAt kills a tough block outright', () => {
  const g = createGrid(level(['T'], { T: tough }));
  const hit = destroyAt(g, ...P(0, 0));
  assert.equal(hit.destroyed, true);
  assert.equal(hit.points, 30);
  assert.ok(!blocksAt(g, ...P(0, 0)));
});

test('the level is cleared when the last destructible block dies', () => {
  const g = createGrid(level(['#='], { '#': soft, '=': wall }));
  assert.ok(!isCleared(g));
  damageAt(g, ...P(0, 0));
  assert.ok(isCleared(g), 'solid blocks must not prevent a clear');
});

test('points default to 10 per hit point when unspecified', () => {
  const g = createGrid(level(['A'], { A: { color: '#fff', hp: 2 } }));
  damageAt(g, ...P(0, 0));
  assert.equal(damageAt(g, ...P(0, 0)).points, 20);
});

test('specAt exposes the block type for a live cell only', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  assert.equal(specAt(g, ...P(0, 0)), soft);
  damageAt(g, ...P(0, 0));
  assert.equal(specAt(g, ...P(0, 0)), null);
});

test('destroying a block marks the grid dirty for the renderer', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  g.dirty = false;
  damageAt(g, ...P(0, 0));
  assert.equal(g.dirty, true);
});
