import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLevel, LevelValidationError, isValidColor, estimateHitsToClear, MAX_TITLE_LENGTH,
} from '../src/levels/validate.js';

const row = (ch) => ch.repeat(64);

function makeLevel(overrides = {}) {
  return {
    id: 'test-level',
    title: 'TEST LEVEL',
    background: '#000000',
    ballColor: '#ffffff',
    types: { '#': { color: '#f0f0f0', hp: 1, points: 10 } },
    grid: [...Array(64)].map((_, i) => (i < 2 ? row('#') : row('.'))),
    paddle: {
      colors: { W: '#ffffff' },
      grid: ['W'.repeat(16)],
    },
    ...overrides,
  };
}

function rejects(overrides, field) {
  assert.throws(
    () => validateLevel(makeLevel(overrides)),
    (err) => {
      assert.ok(err instanceof LevelValidationError, `expected LevelValidationError, got ${err.name}`);
      assert.equal(err.field, field);
      assert.match(err.message, /test-level/, 'message must name the level');
      return true;
    },
  );
}

test('a well-formed level passes', () => {
  assert.doesNotThrow(() => validateLevel(makeLevel()));
});

test('the title is required', () => {
  rejects({ title: '' }, 'title');
  rejects({ title: '   ' }, 'title');
});

test('the title must fit the HUD', () => {
  assert.doesNotThrow(() => validateLevel(makeLevel({ title: 'X'.repeat(MAX_TITLE_LENGTH) })));
  rejects({ title: 'X'.repeat(MAX_TITLE_LENGTH + 1) }, 'title');
});

test('a level with no id is reported against a placeholder name', () => {
  // There is no id to quote here, so the message cannot name the level.
  assert.throws(() => validateLevel(makeLevel({ id: '' })), (err) => {
    assert.equal(err.field, 'id');
    assert.match(err.message, /<unnamed>/);
    return true;
  });
});

test('the grid must be exactly 64 rows of 64 columns', () => {
  rejects({ grid: [...Array(63)].map(() => row('.')) }, 'grid');
  const short = [...Array(64)].map(() => row('.'));
  short[10] = '#'.repeat(63);
  rejects({ grid: short }, 'grid');
});

test('every grid character must have a type', () => {
  const g = [...Array(64)].map(() => row('.'));
  g[0] = 'Z'.repeat(64);
  rejects({ grid: g }, 'grid');
});

test('colors must be valid hex', () => {
  rejects({ background: 'black' }, 'background');
  rejects({ ballColor: '#12345' }, 'ballColor');
  rejects({ types: { '#': { color: 'rgb(1,2,3)' } } }, "types['#'].color");
  assert.ok(isValidColor('#abc'));
  assert.ok(isValidColor('#AABBCC'));
  assert.ok(!isValidColor('#abcd'));
  assert.ok(!isValidColor('abc'));
});

test('hp must be a positive integer unless the block is solid', () => {
  rejects({ types: { '#': { color: '#fff', hp: 0 } } }, "types['#'].hp");
  rejects({ types: { '#': { color: '#fff', hp: 1.5 } } }, "types['#'].hp");
  assert.doesNotThrow(() => validateLevel(makeLevel({
    types: { '#': { color: '#fff', hp: 1 }, '=': { color: '#444', solid: true } },
  })));
});

test('a damage array must have one color per hit point', () => {
  rejects({ types: { '#': { color: '#fff', hp: 3, damage: ['#fff', '#888'] } } }, "types['#'].damage");
  rejects({ types: { '#': { color: '#fff', hp: 2, damage: ['#fff', 'nope'] } } }, "types['#'].damage");
  assert.doesNotThrow(() => validateLevel(makeLevel({
    types: { '#': { color: '#fff', hp: 2, damage: ['#fff', '#888'] } },
  })));
});

test('explode radius must be a positive integer', () => {
  rejects({ types: { '#': { color: '#fff', explode: 0 } } }, "types['#'].explode");
  rejects({ types: { '#': { color: '#fff', explode: 2.5 } } }, "types['#'].explode");
});

test('chain must be a boolean when present', () => {
  rejects({ types: { '#': { color: '#fff', explode: 1, chain: 'no' } } }, "types['#'].chain");
});

test('powerup chance and kinds are checked', () => {
  rejects({ types: { '#': { color: '#fff', powerup: 1.5 } } }, "types['#'].powerup.chance");
  rejects({ types: { '#': { color: '#fff', powerup: -0.1 } } }, "types['#'].powerup.chance");
  rejects({ types: { '#': { color: '#fff', powerup: { chance: 1, kind: 'wings' } } } }, "types['#'].powerup.kind");
  assert.doesNotThrow(() => validateLevel(makeLevel({
    types: { '#': { color: '#fff', powerup: { chance: 0.5, kinds: ['laser', 'sticky'] } } },
  })));
});

test('a level with no destructible blocks is rejected', () => {
  const g = [...Array(64)].map(() => row('.'));
  g[0] = '='.repeat(64);
  rejects({ types: { '=': { color: '#444', solid: true } }, grid: g }, 'grid');
});

test('the paddle must be within the authoring canvas', () => {
  rejects({ paddle: { colors: { W: '#fff' }, grid: [] } }, 'paddle.grid');
  rejects({ paddle: { colors: { W: '#fff' }, grid: [...Array(49)].map(() => 'W'.repeat(16)) } }, 'paddle.grid');
  rejects({ paddle: { colors: { W: '#fff' }, grid: ['W'.repeat(65)] } }, 'paddle.grid');
});

test('paddle characters must have colors', () => {
  rejects({ paddle: { colors: { W: '#fff' }, grid: ['QQQQQQQQQQQQQQQQ'] } }, 'paddle.grid');
});

test('the trimmed paddle must be 10-24 wide and at most 8 tall', () => {
  rejects({ paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWW'] } }, 'paddle.grid');
  rejects({ paddle: { colors: { W: '#fff' }, grid: ['W'.repeat(25)] } }, 'paddle.grid');
  rejects({ paddle: { colors: { W: '#fff' }, grid: [...Array(9)].map(() => 'W'.repeat(16)) } }, 'paddle.grid');
});

test('surrounding whitespace does not count against the paddle size', () => {
  const grid = [...Array(20)].map(() => '.'.repeat(64));
  grid[10] = `${'.'.repeat(20)}${'W'.repeat(16)}${'.'.repeat(28)}`;
  assert.doesNotThrow(() => validateLevel(makeLevel({ paddle: { colors: { W: '#fff' }, grid } })));
});

test('a plain one-hit grid needs one hit per cell', () => {
  assert.equal(estimateHitsToClear(makeLevel()), 128);
});

test('hit points multiply the estimate', () => {
  const level = makeLevel({ types: { '#': { color: '#fff', hp: 3 } } });
  assert.equal(estimateHitsToClear(level), 384);
});

test('a blast radius divides the estimate by its area', () => {
  const level = makeLevel({
    types: { '#': { color: '#fff', hp: 1, explode: 1 } },
    grid: [...Array(64)].map((_, i) => (i < 9 ? row('#') : row('.'))),
  });
  assert.equal(estimateHitsToClear(level), 64);
});

test('solid blocks are excluded from the estimate', () => {
  const level = makeLevel({
    types: { '#': { color: '#fff', hp: 1 }, '=': { color: '#444', solid: true } },
    grid: [...Array(64)].map((_, i) => (i === 0 ? row('#') : i === 1 ? row('=') : row('.'))),
  });
  assert.equal(estimateHitsToClear(level), 64);
});

test('a solid wall of one-hit blocks is rejected as too long', () => {
  rejects({ grid: [...Array(64)].map(() => row('#')) }, 'grid');
});

test('a near-empty grid is rejected as too short', () => {
  const g = [...Array(64)].map(() => row('.'));
  g[0] = `#${'.'.repeat(63)}`;
  rejects({ grid: g }, 'grid');
});
