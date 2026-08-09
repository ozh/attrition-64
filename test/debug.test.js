import test from 'node:test';
import assert from 'node:assert/strict';
import { debugSnapshot, countPowerupCells } from '../src/render/debug.js';
import { createGrid, damageAt } from '../src/engine/grid.js';
import { createGame, NEUTRAL_INTENT } from '../src/game.js';
import { createStorage } from '../src/storage.js';
import { STEP } from '../src/config.js';

const row = (ch) => ch.repeat(64);
const level = (types, rows) => ({
  id: 'dbg',
  title: 'DEBUG',
  background: '#000000',
  ballColor: '#ffffff',
  types,
  grid: [...Array(64)].map((_, i) => rows[i] ?? row('.')),
  paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWWWWWWWWW'] },
});

const silentAudio = { play() {}, toggleMute() {}, get muted() { return false; } };
const memoryStorage = () => {
  const data = {};
  return createStorage({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } });
};

test('powerup cells are counted, plain blocks are not', () => {
  const grid = createGrid(level(
    { '#': { color: '#fff', hp: 1 }, p: { color: '#fff', hp: 1, powerup: 0.3 } },
    [row('#'), row('p'), `${'p'.repeat(10)}${'#'.repeat(54)}`],
  ));
  assert.equal(countPowerupCells(grid), 64 + 10);
});

test('a powerup chance of zero still counts as a powerup block', () => {
  // `powerup: 0` is a declared field, so it should show; the field being
  // present is what a level author is checking for here.
  const grid = createGrid(level({ p: { color: '#fff', hp: 1, powerup: 0 } }, [row('p')]));
  assert.equal(countPowerupCells(grid), 64);
});

test('the count drops as those cells are destroyed', () => {
  const types = { p: { color: '#fff', hp: 1, powerup: 0.3 } };
  const grid = createGrid(level(types, [row('p')]));
  const before = countPowerupCells(grid);

  damageAt(grid, 0, 5);
  assert.equal(countPowerupCells(grid), before - 1);
});

test('a missing grid counts as nothing rather than throwing', () => {
  assert.equal(countPowerupCells(null), 0);
  assert.equal(countPowerupCells(undefined), 0);
});

test('the snapshot reports the fields worth watching', () => {
  const g = createGame({
    levels: [level({ '#': { color: '#fff', hp: 1 } }, [row('#'), row('#')])],
    storage: memoryStorage(),
    audio: silentAudio,
  });
  const labels = debugSnapshot(g, { fps: 60, levelCount: 1 })
    .filter(([label]) => label !== undefined)
    .map(([label]) => label);

  for (const expected of ['fps', 'state', 'blocks', 'ball speed', 'life time', 'powerup cells']) {
    assert.ok(labels.includes(expected), `missing "${expected}"`);
  }
});

test('ball speed tracks the game rather than being reported as a constant', () => {
  const g = createGame({
    levels: [level({ '#': { color: '#fff', hp: 1 } }, [row('#'), row('#')])],
    storage: memoryStorage(),
    audio: silentAudio,
  });
  const read = () => Number(String(debugSnapshot(g).find(([l]) => l === 'ball speed')[1]).split(' ')[0]);

  const press = { ...NEUTRAL_INTENT, action: true };
  g.update(STEP, press);
  g.update(STEP, press);
  const start = read();

  g.playTime = 300;
  assert.ok(read() > start, `expected the read-out to follow the clock, ${start} -> ${read()}`);
});

test('it survives the error state, where there is no level at all', () => {
  const g = createGame({ levels: [], storage: memoryStorage(), audio: silentAudio });
  assert.doesNotThrow(() => debugSnapshot(g, { fps: 0, levelCount: 0 }));
});
