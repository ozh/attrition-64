import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, NEUTRAL_INTENT } from '../src/game.js';
import { createStorage } from '../src/storage.js';
import { isCleared } from '../src/engine/grid.js';
import { LIVES, DRAIN_ROW, LIFE_LOST_HOLD, STEP } from '../src/config.js';

const silentAudio = { play() {}, toggleMute() { return false; }, get muted() { return false; } };
const memoryStorage = () => {
  const data = {};
  return createStorage({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } });
};

const row = (ch) => ch.repeat(64);
const testLevel = (overrides = {}) => ({
  id: 'unit',
  title: 'UNIT',
  background: '#000000',
  ballColor: '#ffffff',
  types: { '#': { color: '#fff', hp: 1, points: 10 } },
  grid: [...Array(64)].map((_, i) => (i < 3 ? row('#') : row('.'))),
  paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWWWWWWWWW'] },
  ...overrides,
});

const press = { ...NEUTRAL_INTENT, action: true };
const game = (levels = [testLevel()]) => createGame({ levels, storage: memoryStorage(), audio: silentAudio });

/** Drop the ball straight through the drain and settle the lifeLost hold. */
function drainAndSettle(g) {
  g.balls[0].y = DRAIN_ROW - 0.01;
  g.balls[0].vy = Math.abs(g.balls[0].vy);
  g.balls[0].vx = 0;
  g.update(STEP, NEUTRAL_INTENT);
}

test('a new game starts on the title screen', () => {
  assert.equal(game().state, 'title');
});

test('acting on the title screen starts a run with full lives', () => {
  const g = game();
  g.update(STEP, press);
  assert.equal(g.state, 'serve');
  assert.equal(g.lives, LIVES);
  assert.equal(g.score, 0);
});

test('acting on the serve screen launches the ball', () => {
  const g = game();
  g.update(STEP, press);
  g.update(STEP, press);
  assert.equal(g.state, 'playing');
  assert.equal(g.balls.length, 1);
  assert.ok(g.balls[0].vy < 0, 'served upward');
});

test('a drained ball costs a life', () => {
  const g = game();
  g.update(STEP, press);
  g.update(STEP, press);
  drainAndSettle(g);
  assert.equal(g.state, 'lifeLost');
  assert.equal(g.lives, LIVES - 1);
});

test('the run ends when the last life is lost', () => {
  const g = game();
  g.update(STEP, press);
  for (let life = 0; life < LIVES; life++) {
    g.update(STEP, press);
    drainAndSettle(g);
    for (let t = 0; t < LIFE_LOST_HOLD / STEP + 2; t++) g.update(STEP, NEUTRAL_INTENT);
  }
  assert.equal(g.state, 'gameOver');
  assert.equal(g.lives, 0);
});

test('block damage survives losing a life', () => {
  const g = game();
  g.update(STEP, press);
  g.update(STEP, press);
  const before = g.grid.remaining;
  g.hitCell(10, 6);
  assert.ok(g.grid.remaining < before);
  const damaged = g.grid.remaining;

  drainAndSettle(g);
  for (let t = 0; t < LIFE_LOST_HOLD / STEP + 2; t++) g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.grid.remaining, damaged, 'dying must not undo progress');
});

test('destroying a block scores its points', () => {
  const g = game();
  g.update(STEP, press);
  g.update(STEP, press);
  g.hitCell(10, 6);
  assert.equal(g.score, 10);
});

test('clearing the grid ends the level', () => {
  const g = game();
  g.update(STEP, press);
  g.update(STEP, press);
  g.clearGridForTest();
  g.update(STEP, NEUTRAL_INTENT);
  assert.ok(isCleared(g.grid));
  assert.equal(g.state, 'levelClear');
});

test('clearing the last level wins the run', () => {
  const g = game();
  g.update(STEP, press);
  g.update(STEP, press);
  g.clearGridForTest();
  for (let t = 0; t < 400; t++) g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.state, 'win');
});

test('clearing a level advances to the next one', () => {
  const g = game([testLevel(), testLevel({ id: 'unit-2' })]);
  g.update(STEP, press);
  g.update(STEP, press);
  g.clearGridForTest();
  for (let t = 0; t < 400; t++) g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.levelIndex, 1);
  assert.equal(g.state, 'serve');
});

test('the high score persists across runs through storage', () => {
  const storage = memoryStorage();
  const first = createGame({ levels: [testLevel()], storage, audio: silentAudio });
  first.update(STEP, press);
  first.update(STEP, press);
  first.hitCell(10, 6);
  first.endRunForTest();
  assert.equal(storage.getNumber('highscore', 0), 10);

  const second = createGame({ levels: [testLevel()], storage, audio: silentAudio });
  assert.equal(second.high, 10);
});

test('a lower score does not overwrite the high score', () => {
  const storage = memoryStorage();
  storage.setNumber('highscore', 999);
  const g = createGame({ levels: [testLevel()], storage, audio: silentAudio });
  g.update(STEP, press);
  g.update(STEP, press);
  g.hitCell(10, 6);
  g.endRunForTest();
  assert.equal(storage.getNumber('highscore', 0), 999);
});

test('mute is toggled by the mute intent', () => {
  let toggled = 0;
  const audio = { play() {}, toggleMute() { toggled++; return true; }, get muted() { return false; } };
  const g = createGame({ levels: [testLevel()], storage: memoryStorage(), audio });
  g.update(STEP, { ...NEUTRAL_INTENT, mute: true });
  assert.equal(toggled, 1);
});

test('a game with no valid levels reports an error state rather than crashing', () => {
  const g = createGame({ levels: [], storage: memoryStorage(), audio: silentAudio });
  assert.equal(g.state, 'error');
  assert.doesNotThrow(() => g.update(STEP, press));
});
