import test from 'node:test';
import assert from 'node:assert/strict';
import { overlappedCells, moveAxis } from '../src/engine/collide.js';

const none = () => false;
const solid = (set) => (cx, cy) => set.has(`${cx},${cy}`);
const box = (x, y) => ({ x, y, w: 1, h: 1 });

test('a unit box aligned to the grid overlaps exactly one cell', () => {
  assert.deepEqual(overlappedCells(3, 4, 1, 1), [[3, 4]]);
});

test('a unit box straddling a boundary overlaps four cells', () => {
  const cells = overlappedCells(3.5, 4.5, 1, 1);
  assert.deepEqual(cells.sort(), [[3, 4], [3, 5], [4, 4], [4, 5]].sort());
});

test('unobstructed movement just applies the delta', () => {
  const r = moveAxis(box(3, 4), 0.4, 'x', none);
  assert.equal(r.pos, 3.4);
  assert.equal(r.blocked, false);
  assert.deepEqual(r.cells, []);
});

test('moving right into a block stops flush against its left face', () => {
  const r = moveAxis(box(5, 5), 0.4, 'x', solid(new Set(['6,5'])));
  assert.equal(r.pos, 5, 'flush at x=5, since the box is 1 wide and the block starts at 6');
  assert.equal(r.blocked, true);
  assert.deepEqual(r.cells, [[6, 5]]);
});

test('moving left into a block stops flush against its right face', () => {
  const r = moveAxis(box(5, 5), -0.4, 'x', solid(new Set(['4,5'])));
  assert.equal(r.pos, 5);
  assert.equal(r.blocked, true);
});

test('moving down into a block stops flush against its top face', () => {
  const r = moveAxis(box(5, 5), 0.4, 'y', solid(new Set(['5,6'])));
  assert.equal(r.pos, 5);
  assert.equal(r.blocked, true);
});

test('moving up into a block stops flush against its bottom face', () => {
  const r = moveAxis(box(5, 5), -0.4, 'y', solid(new Set(['5,4'])));
  assert.equal(r.pos, 5);
  assert.equal(r.blocked, true);
});

test('a box straddling two rows reports both blocking cells', () => {
  const r = moveAxis(box(5, 5.5), 0.4, 'x', solid(new Set(['6,5', '6,6'])));
  assert.equal(r.blocked, true);
  assert.equal(r.cells.length, 2);
});

test('the nearest blocker wins when several are in the path', () => {
  const r = moveAxis(box(5, 5), 0.9, 'x', solid(new Set(['6,5', '7,5'])));
  assert.equal(r.pos, 5, 'stops at 6, not 7');
});

test('a substep-sized move cannot pass through a one-cell wall', () => {
  let x = 5;
  for (let i = 0; i < 20; i++) {
    const r = moveAxis(box(x, 5), 0.5, 'x', solid(new Set(['9,5'])));
    x = r.pos;
    if (r.blocked) break;
  }
  assert.equal(x, 8, 'came to rest flush against the wall at x=9');
});

test('movement along an axis is unaffected by blocks on the other side', () => {
  const r = moveAxis(box(5, 5), 0.4, 'x', solid(new Set(['4,5'])));
  assert.equal(r.pos, 5.4);
  assert.equal(r.blocked, false);
});
