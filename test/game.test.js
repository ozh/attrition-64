import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, NEUTRAL_INTENT } from '../src/game.js';
import { createStorage } from '../src/storage.js';
import { isCleared } from '../src/engine/grid.js';
import { paddleBox } from '../src/engine/paddle.js';
import {
  LIVES, DRAIN_ROW, LIFE_LOST_HOLD, STEP, ENDGAME_RELIEF, POWERUP_KINDS,
  RELIEF_FLASH_SECONDS, CEILING, FIELD_W, SHIELD_ROW, GRID_TOP,
} from '../src/config.js';

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

/** Grant a powerup the way catching one would: drop it onto the paddle. */
function applyEffectForTest(g, kind) {
  const box = { x: g.paddle.x, y: 98 - g.paddle.h };
  g.drops.push({ kind, x: box.x + 1, y: box.y - 0.1 });
  g.update(STEP, NEUTRAL_INTENT);
}
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


// --- endgame relief -------------------------------------------------------

/**
 * Start a run, drive it into PLAYING, and park the ball.
 *
 * Nothing moves the paddle in a test, so a live ball drains within seconds and
 * the simulation stops — which would make every timing assertion below pass or
 * fail for the wrong reason. A stuck ball neither moves nor drains.
 */
function playing(overrides = {}) {
  const g = createGame({ levels: [testLevel()], storage: memoryStorage(), audio: silentAudio, ...overrides });
  g.update(STEP, press);
  g.update(STEP, press);
  g.balls[0].stuck = true;
  return g;
}

/**
 * Keep the ball parked.
 *
 * Re-applied every step, not once: catching a `sticky` drop and letting it
 * expire calls releaseStuck(), which frees the ball, which then starts
 * destroying blocks and quietly changes the very cadence under test.
 */
const park = (g) => { for (const ball of g.balls) ball.stuck = true; };

const run = (g, seconds) => {
  for (let t = 0; t < seconds / STEP; t++) {
    g.update(STEP, NEUTRAL_INTENT);
    park(g);
  }
};

/**
 * Run for a while and count relief drops as they SPAWN.
 *
 * Counting `game.drops.length` instead would count drops still in the air, and
 * a drop falls in ~4.5s while the cadence is 8-25s — so at most one is ever
 * airborne and the count says nothing about the rate. Each spawn adds a flash,
 * which is the only per-spawn event observable from outside.
 */
function countSpawns(g, seconds) {
  let spawns = 0;
  let previous = g.flashes.length;
  for (let t = 0; t < seconds / STEP; t++) {
    g.update(STEP, NEUTRAL_INTENT);
    park(g);
    if (g.flashes.length > previous) spawns++;
    previous = g.flashes.length;
  }
  return spawns;
}

test('no relief drops while most of the grid is still standing', () => {
  const g = playing();
  run(g, ENDGAME_RELIEF[0].everySeconds * 2);
  assert.equal(g.drops.length, 0, 'a full grid must never hand out free powerups');
});

test('a powerup drops once the grid falls below the first threshold', () => {
  const g = playing({ random: () => 0.5 });
  g.grid.remaining = Math.floor(g.initialBlocks * ENDGAME_RELIEF[0].remaining);

  assert.equal(countSpawns(g, ENDGAME_RELIEF[0].everySeconds - 1), 0,
    'not before the cadence has elapsed');
  assert.equal(countSpawns(g, 1.5), 1);
  assert.ok(POWERUP_KINDS.includes(g.drops[0].kind));
});

test('the drop starts at the top of the playfield, inside it', () => {
  const g = playing({ random: () => 0.999 });
  g.grid.remaining = 1;
  run(g, ENDGAME_RELIEF.at(-1).everySeconds + 1);

  const drop = g.drops[0];
  assert.ok(drop, 'expected a drop');
  assert.ok(drop.y >= CEILING, 'must not spawn inside the HUD band');
  assert.ok(drop.x >= 0 && drop.x + 1 <= FIELD_W, `x ${drop.x} is off the playfield`);
});

test('each drop is announced by a flash that then fades away', () => {
  const g = playing({ random: () => 0.5 });
  g.grid.remaining = 1;
  run(g, ENDGAME_RELIEF.at(-1).everySeconds + 0.1);

  assert.equal(g.flashes.length, 1);
  assert.equal(g.flashes[0].kind, g.drops[0].kind, 'the flash colour must match the powerup');

  run(g, RELIEF_FLASH_SECONDS + 0.1);
  assert.equal(g.flashes.length, 0, 'flashes must not accumulate');
});

test('the cadence tightens as the grid empties', () => {
  // Three intervals plus a margin: the third spawn lands exactly on a 3x
  // boundary, and accumulated float error can push it one step past.
  const window = ENDGAME_RELIEF[0].everySeconds * 3 + 1;

  const loose = playing({ random: () => 0.5 });
  loose.grid.remaining = Math.floor(loose.initialBlocks * ENDGAME_RELIEF[0].remaining);
  const looseSpawns = countSpawns(loose, window);

  const tight = playing({ random: () => 0.5 });
  tight.grid.remaining = 1;
  const tightSpawns = countSpawns(tight, window);

  assert.equal(looseSpawns, 3, 'three intervals at the loosest cadence');
  assert.ok(tightSpawns > looseSpawns,
    `expected more relief when nearly clear: ${tightSpawns} vs ${looseSpawns}`);
});

test('losing a life clears the relief clock rather than banking it', () => {
  const g = playing({ random: () => 0.5 });
  g.grid.remaining = 1;
  run(g, ENDGAME_RELIEF.at(-1).everySeconds - 1);
  assert.equal(g.drops.length, 0, 'precondition: a drop is pending but has not fired');

  g.balls[0].stuck = false;
  drainAndSettle(g);
  for (let t = 0; t < LIFE_LOST_HOLD / STEP + 2; t++) g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.drops.length, 0, 'pending drops are cleared with everything else');

  g.update(STEP, press);           // serve again
  run(g, 1.5);
  assert.equal(g.drops.length, 0, 'and the timer restarts rather than firing immediately');
});


// --- shield ---------------------------------------------------------------

/** Send the ball at the floor and let it get there — one step is 0.35 cells. */
function dropBall(g, steps = 5) {
  const ball = g.balls[0];
  ball.stuck = false;
  ball.x = FIELD_W / 2;
  ball.y = DRAIN_ROW - 0.5;
  ball.vx = 0;
  ball.vy = Math.abs(ball.vy);
  for (let t = 0; t < steps; t++) g.update(STEP, NEUTRAL_INTENT);
}

test('a shield saves a ball that would otherwise drain', () => {
  const g = playing();
  g.shield = true;
  dropBall(g);

  assert.equal(g.state, 'playing', 'the ball was saved, so no life is lost');
  assert.equal(g.lives, LIVES);
  assert.equal(g.balls.length, 1);
  assert.ok(g.balls[0].vy < 0, 'and it is heading back up');
  assert.ok(g.balls[0].y <= SHIELD_ROW, 'placed at the shield, not below it');
});

test('a shield is spent by the save, not held', () => {
  const g = playing();
  g.shield = true;
  dropBall(g);
  assert.equal(g.shield, false);

  dropBall(g);
  assert.equal(g.state, 'lifeLost', 'the second drain is not saved');
});

test('without a shield the ball is simply lost', () => {
  const g = playing();
  assert.equal(g.shield, false, 'no shield by default');
  dropBall(g);
  assert.equal(g.state, 'lifeLost');
});

test('a shield does not survive losing a life', () => {
  const g = playing();
  g.shield = true;
  dropBall(g);                    // spends the shield, still playing
  dropBall(g);                    // now a real life lost
  for (let t = 0; t < LIFE_LOST_HOLD / STEP + 2; t++) g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.shield, false, 'a fresh life starts unshielded');
});

// --- piercing -------------------------------------------------------------

/** Aim the ball up into the block rows from just below them. */
function aimIntoBlocks(g, steps = 4) {
  const ball = g.balls[0];
  ball.stuck = false;
  ball.x = 10;
  ball.y = GRID_TOP + 3.5;        // blocks fill playfield rows 5-7
  ball.vx = 0;
  ball.vy = -Math.abs(ball.vy);
  for (let t = 0; t < steps; t++) g.update(STEP, NEUTRAL_INTENT);
}

test('a piercing ball ploughs through blocks instead of bouncing', () => {
  const g = playing();
  applyEffectForTest(g, 'piercing');
  const before = g.grid.remaining;

  aimIntoBlocks(g);

  assert.ok(g.balls[0].vy < 0, 'it did not reflect off the blocks it crossed');
  assert.ok(g.grid.remaining < before,
    `it destroyed what it passed through (${before} -> ${g.grid.remaining})`);
});

test('without piercing the same ball bounces', () => {
  const g = playing();
  aimIntoBlocks(g);
  assert.ok(g.balls[0].vy > 0, 'reflected downward');
});

/** Send the ball down onto the paddle from just above it. */
function bounceOffPaddle(g, steps = 5) {
  const ball = g.balls[0];
  const box = paddleBox(g.paddle);
  ball.stuck = false;
  ball.x = box.x + 2;
  ball.y = box.y - 1.2;
  ball.vx = 0;
  ball.vy = Math.abs(ball.vy);
  for (let t = 0; t < steps; t++) g.update(STEP, NEUTRAL_INTENT);
}

/** One substep of upward travel, which is what arms the effect. */
function rise(g) {
  const ball = g.balls[0];
  ball.stuck = false;
  ball.x = 30;
  ball.y = 70;
  ball.vx = 0;
  ball.vy = -Math.abs(ball.vy);
  g.update(STEP, NEUTRAL_INTENT);
}

test('piercing ends when the ball comes back to the paddle', () => {
  const g = playing();
  applyEffectForTest(g, 'piercing');
  assert.equal(g.piercing, true);

  rise(g);
  assert.equal(g.piercing, true, 'still piercing on the way up');

  bounceOffPaddle(g);
  assert.equal(g.piercing, false, 'one round trip, then done');
});

test('catching it on the way down still buys a full round trip', () => {
  const g = playing();
  applyEffectForTest(g, 'piercing');

  // Straight onto the paddle without ever climbing: this contact must not
  // count, or the pickup would be worth nothing at all.
  bounceOffPaddle(g);
  assert.equal(g.piercing, true, 'the arming rule protects a descending catch');

  rise(g);
  bounceOffPaddle(g);
  assert.equal(g.piercing, false, 'the trip after that one does end it');
});

test('a shield save also ends the trip', () => {
  const g = playing();
  applyEffectForTest(g, 'piercing');
  g.shield = true;
  rise(g);

  dropBall(g);
  assert.equal(g.state, 'playing', 'the shield saved it');
  assert.equal(g.piercing, false, 'a turn-around at the bottom is a turn-around');
});

test('being caught by a sticky paddle ends the trip too', () => {
  const g = playing();
  applyEffectForTest(g, 'sticky');
  applyEffectForTest(g, 'piercing');
  rise(g);

  bounceOffPaddle(g);
  assert.ok(g.balls[0].stuck, 'the sticky paddle caught it');
  assert.equal(g.piercing, false);
});

test('piercing is not a timed effect', () => {
  const g = playing();
  applyEffectForTest(g, 'piercing');
  rise(g);
  run(g, 20);            // far longer than any effect duration
  assert.equal(g.piercing, true, 'only the paddle ends it, never the clock');
});

test('losing a life clears piercing', () => {
  const g = playing();
  applyEffectForTest(g, 'piercing');
  rise(g);
  dropBall(g);
  for (let t = 0; t < LIFE_LOST_HOLD / STEP + 2; t++) g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.piercing, false);
});

test('a piercing ball still bounces off indestructible blocks', () => {
  const wall = { color: '#444', solid: true };
  const level = testLevel({
    types: { '#': { color: '#fff', hp: 1, points: 10 }, '=': wall },
    grid: [...Array(64)].map((_, i) => (i === 0 ? row('=') : i < 3 ? row('#') : row('.'))),
  });
  const g = createGame({ levels: [level], storage: memoryStorage(), audio: silentAudio });
  g.update(STEP, press);
  g.update(STEP, press);
  applyEffectForTest(g, 'piercing');

  aimIntoBlocks(g, 12);           // far enough up to reach the solid row
  assert.ok(g.balls[0].vy > 0, 'a solid row must still turn a piercing ball back');
});
