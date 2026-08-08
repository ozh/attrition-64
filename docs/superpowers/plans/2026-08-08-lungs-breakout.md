# Lungs Breakout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pixel-art breakout game where the paddle is an everyday item and the blocks form the silhouette of something that item threatens, with levels contributable by PR.

**Architecture:** A DOM-free engine (`src/engine/`) of small pure modules, driven by a state machine in `src/game.js`, drawn by `src/render/` onto an integer-upscaled 256×400 canvas. Levels are ES modules holding a 64×64 character grid plus a block-type table, validated at load. No build step; the repo is served directly as static files.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML5 canvas, `node --test` for unit tests. No dependencies, no bundler.

**Spec:** `docs/superpowers/specs/2026-08-08-lungs-breakout-design.md`

## Global Constraints

- **Do not commit.** The user's global instruction forbids commits unless explicitly asked. Every task ends with `git add`, leaving work staged. Never run `git commit`.
- **Relative paths only.** Never a leading `/` in any `import`, `src`, `href`, or fetch path. GitHub Pages serves from `/<repo>/`.
- **No dependencies.** No npm installs, no bundler, no test framework. `package.json` exists solely to set `"type": "module"` so Node treats `.js` as ESM.
- **File size budget:** no file over ~200 lines, no function over ~40.
- **`src/engine/`, `src/levels/validate.js`, `src/render/scale.js`, and `src/storage.js` must not reference `window`, `document`, `localStorage`, or `Audio`.** They are unit-tested under Node, which has none of these. Browser objects are injected as parameters.
- **The game must run with `assets/sfx/` empty.** A missing sound is a no-op, logged once, never thrown.
- **`localStorage` keys are prefixed `lungs:`.** GitHub Pages puts every project of an account on one origin.
- **No commentary text in game.** Only the HUD (score, lives, level number), `GAME OVER`, and prompts to press/tap. Level `item`/`target` names are never displayed.
- **Test command:** `node --test 'test/*.test.js'` from the project root.
- **Manual verification:** http://localhost/lungs/ (already served by the `dev-web` container; no server needs starting).

## Coordinate conventions

Two coordinate spaces, used consistently throughout:

- **Playfield cells** — the 64×100 space everything moves in. Origin top-left. The ball, paddle, drops and lasers live here.
- **Grid cells** — the authored 64×64 block space. Grid row `r` occupies playfield row `GRID_TOP + r` where `GRID_TOP = 5`.

`grid.js` takes **playfield** coordinates in its public API and converts internally. Nothing outside `grid.js` performs the `GRID_TOP` offset.

Positions are floats; a cell index is `Math.floor(pos)`. The ball is a 1×1 AABB whose `(x, y)` is its **top-left** corner.

## File structure

| File | Responsibility |
| --- | --- |
| `package.json` | `{"type":"module"}` only |
| `index.html` | Canvas, viewport meta, styles, module entry |
| `src/config.js` | Every tunable constant |
| `src/main.js` | Bootstrap + rAF loop |
| `src/game.js` | State machine, wiring |
| `src/input.js` | Keyboard/mouse/touch → intent object |
| `src/storage.js` | Namespaced localStorage wrapper |
| `src/audio.js` | Sfx pools, mute |
| `src/engine/sprite.js` | Char grid → padded/trimmed sprite |
| `src/engine/grid.js` | Block state, damage, clear detection |
| `src/engine/explode.js` | Chain explosion flood |
| `src/engine/collide.js` | Per-axis AABB resolution |
| `src/engine/ball.js` | Ball entity + substepped motion |
| `src/engine/paddle.js` | Movement, deflection |
| `src/engine/powerups.js` | Drop rolls and falling drops |
| `src/engine/effects.js` | Active-effect timers |
| `src/engine/lasers.js` | Laser shots |
| `src/render/scale.js` | Pure device-pixel fit calculation |
| `src/render/canvas.js` | Canvas setup, letterbox, field cache |
| `src/render/field.js` | Block drawing |
| `src/render/entities.js` | Paddle, balls, drops, lasers |
| `src/render/hud.js` | 3×5 bitmap font, HUD, screens |
| `src/levels/index.js` | Registry |
| `src/levels/validate.js` | Schema + balance checks |
| `src/levels/01-cigarette-lungs.js` | First level |
| `test/*.test.js` | Node unit tests |

---

### Task 1: Scaffold, config, and a working test runner

**Files:**
- Create: `package.json`, `src/config.js`, `.gitignore`
- Test: `test/config.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: every constant below, imported by name from `../src/config.js` throughout the plan.

- [ ] **Step 1: Write the failing test**

`test/config.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/config.js';

test('backing canvas dimensions derive from the cell grid', () => {
  assert.equal(C.BASE_W, C.FIELD_W * C.CELL);
  assert.equal(C.BASE_H, C.FIELD_H * C.CELL);
  assert.equal(C.BASE_W, 256);
  assert.equal(C.BASE_H, 400);
});

test('the block grid fits between the HUD and the paddle band', () => {
  assert.equal(C.GRID_TOP, C.HUD_ROWS);
  assert.ok(C.GRID_TOP + C.GRID_ROWS < C.PADDLE_BAND_TOP);
  assert.ok(C.PADDLE_BAND_TOP + C.PADDLE_MAX_H <= C.DRAIN_ROW);
});

test('the paddle bottom leaves room for the tallest legal paddle', () => {
  assert.ok(C.PADDLE_BOTTOM - C.PADDLE_MAX_H >= C.PADDLE_BAND_TOP);
  assert.ok(C.PADDLE_BOTTOM < C.DRAIN_ROW);
});

test('every powerup kind has a duration except the instant one', () => {
  for (const kind of C.POWERUP_KINDS) {
    if (kind === 'multiball') continue;
    assert.equal(typeof C.EFFECT_DURATION[kind], 'number', `${kind} needs a duration`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'`
Expected: FAIL — `Cannot find module .../src/config.js`

- [ ] **Step 3: Create `package.json` and `.gitignore`**

`package.json`. The `type` field is the whole point: without it Node treats `.js` as CommonJS and every `import` in the test suite fails.

```json
{
  "name": "lungs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test 'test/*.test.js'"
  }
}
```

`.gitignore`:

```
node_modules/
.DS_Store
```

- [ ] **Step 4: Write `src/config.js`**

```js
// Geometry — all distances are in playfield cells unless named *_PX.
export const CELL = 4;                 // backing-store pixels per cell
export const FIELD_W = 64;             // playfield width in cells
export const FIELD_H = 100;            // playfield height in cells
export const BASE_W = FIELD_W * CELL;  // 256
export const BASE_H = FIELD_H * CELL;  // 400
export const BLOCK_PX = 3;             // drawn size inside a 4px cell; the 1px remainder is the grid gap

export const HUD_ROWS = 5;             // rows 0-4
export const GRID_TOP = 5;             // playfield row of authored grid row 0
export const GRID_ROWS = 64;
export const GRID_COLS = 64;
export const CEILING = HUD_ROWS;       // ball bounces here, never enters the HUD
export const PADDLE_BAND_TOP = 90;
export const PADDLE_BOTTOM = 98;       // playfield row just past the paddle's bottom edge
export const DRAIN_ROW = 100;          // a ball whose top passes this is lost

// Ball
export const BALL_SIZE = 1;            // AABB side, in cells
export const BALL_SPEED = 42;          // cells per second
export const BALL_SPEED_RAMP = 0.25;   // +25% by the time the grid is cleared
export const BALL_MAX_ANGLE = Math.PI / 3;   // 60 degrees off vertical
export const SERVE_ANGLE = Math.PI / 8;
export const STEP = 1 / 120;           // fixed physics timestep, seconds
export const MAX_STEPS_PER_FRAME = 8;  // spiral-of-death guard
export const MAX_SUBSTEP_DIST = 0.5;   // cells; below 1 so the ball cannot tunnel

// Paddle
export const PADDLE_SPEED = 60;        // cells per second, keyboard
export const PADDLE_MIN_W = 10;
export const PADDLE_MAX_W = 24;
export const PADDLE_MAX_H = 8;
export const PADDLE_GRID_MAX_ROWS = 48;
export const PADDLE_GRID_MAX_COLS = 64;

// Run
export const LIVES = 3;
export const MAX_BALLS = 9;
export const LIFE_LOST_HOLD = 1.0;     // seconds
export const LEVEL_CLEAR_HOLD = 1.5;

// Powerups
export const POWERUP_KINDS = ['multiball', 'widePaddle', 'slowBall', 'fastBall', 'sticky', 'laser'];
export const DROP_SPEED = 20;          // cells per second
export const DROP_SIZE = 1;
export const EFFECT_DURATION = { widePaddle: 15, slowBall: 12, fastBall: 12, sticky: 12, laser: 12 };
export const WIDE_PADDLE_SCALE = 1.5;
export const SLOW_BALL_MUL = 0.7;
export const FAST_BALL_MUL = 1.4;
export const FAST_BALL_SCORE_MUL = 2;
export const MULTIBALL_SPREAD = 25 * Math.PI / 180;
export const LASER_SPEED = 80;
export const LASER_COOLDOWN = 0.3;

// Level authoring
export const EMPTY_CHARS = '. ';
export const DEFAULT_POINTS_PER_HP = 10;

// Persistence
export const STORAGE_PREFIX = 'lungs:';
export const KEY_HIGHSCORE = 'highscore';
export const KEY_MUTED = 'muted';

// Audio
export const SFX_PATH = 'assets/sfx/';
export const SFX_NAMES = [
  'bounce-wall', 'bounce-paddle', 'block-hit', 'block-break', 'explode',
  'powerup-catch', 'laser', 'life-lost', 'level-clear', 'game-over',
];
export const SFX_POOL_SIZE = 4;
export const SFX_RETRIGGER_MS = 12;    // collapses a mass break into one sound
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'`
Expected: PASS, 4 tests.

- [ ] **Step 6: Stage**

```bash
git add package.json .gitignore src/config.js test/config.test.js
```

---

### Task 2: Sprite parsing — the shared char-grid reader

Both the 64×64 block canvas and the 64×48 paddle canvas are character grids. This module is the single code path for both: pad ragged rows, optionally trim to the filled bounding box, and expose per-cell characters. Blocks are parsed untrimmed (grid alignment is meaningful); the paddle is trimmed (its bounding box becomes its collision box).

**Files:**
- Create: `src/engine/sprite.js`
- Test: `test/sprite.test.js`

**Interfaces:**
- Consumes: `EMPTY_CHARS` from `src/config.js`
- Produces:
  - `parseSprite(rows, { emptyChars, trim }) -> { w, h, offsetX, offsetY, chars }` where `chars` is a `string[]` of length `w*h` in row-major order and `''` marks empty.
  - `charAt(sprite, x, y) -> string` — `''` when out of bounds.
  - `isEmptySprite(sprite) -> boolean`

- [ ] **Step 1: Write the failing test**

`test/sprite.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'sprite.test.js`
Expected: FAIL — `Cannot find module .../src/engine/sprite.js`

- [ ] **Step 3: Write `src/engine/sprite.js`**

```js
import { EMPTY_CHARS } from '../config.js';

const EMPTY = '';

/**
 * Parse a character grid into a flat sprite.
 * Rows may be ragged; they are padded with empty cells to the longest row.
 * @param {string[]} rows
 * @param {{emptyChars?: string, trim?: boolean}} options
 * @returns {{w:number,h:number,offsetX:number,offsetY:number,chars:string[]}}
 */
export function parseSprite(rows, { emptyChars = EMPTY_CHARS, trim = true } = {}) {
  const src = Array.isArray(rows) ? rows : [];
  const w = src.reduce((max, row) => Math.max(max, String(row).length), 0);
  const h = src.length;
  const isEmpty = (ch) => ch === undefined || emptyChars.includes(ch);

  if (!trim) return { w, h, offsetX: 0, offsetY: 0, chars: readRect(src, isEmpty, 0, 0, w, h) };

  const box = filledBounds(src, isEmpty, w, h);
  if (!box) return { w: 0, h: 0, offsetX: 0, offsetY: 0, chars: [] };

  const tw = box.x1 - box.x0 + 1;
  const th = box.y1 - box.y0 + 1;
  return {
    w: tw,
    h: th,
    offsetX: box.x0,
    offsetY: box.y0,
    chars: readRect(src, isEmpty, box.x0, box.y0, tw, th),
  };
}

function readRect(rows, isEmpty, x0, y0, w, h) {
  const chars = new Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = String(rows[y0 + y] ?? '');
    for (let x = 0; x < w; x++) {
      const ch = row[x0 + x];
      chars[y * w + x] = isEmpty(ch) ? EMPTY : ch;
    }
  }
  return chars;
}

function filledBounds(rows, isEmpty, w, h) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = 0; y < h; y++) {
    const row = String(rows[y] ?? '');
    for (let x = 0; x < w; x++) {
      if (isEmpty(row[x])) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < x0 ? null : { x0, y0, x1, y1 };
}

/** Character at sprite-local coordinates, or '' when empty or out of bounds. */
export function charAt(sprite, x, y) {
  if (x < 0 || y < 0 || x >= sprite.w || y >= sprite.h) return EMPTY;
  return sprite.chars[y * sprite.w + x];
}

export function isEmptySprite(sprite) {
  return sprite.w === 0 || sprite.h === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'sprite.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Stage**

```bash
git add src/engine/sprite.js test/sprite.test.js
```

---

### Task 3: Level validation — the gate that makes PRs cheap to review

This is the module that lets a stranger's level be merged after looking only at the art. Every message must name the level and the offending field, because the person reading it is a contributor who has never seen this codebase.

**Files:**
- Create: `src/levels/validate.js`
- Test: `test/validate.test.js`

**Interfaces:**
- Consumes: `parseSprite`, `isEmptySprite` from `src/engine/sprite.js`; constants from `src/config.js`
- Produces:
  - `class LevelValidationError extends Error` with `.levelId` and `.field`
  - `validateLevel(level) -> void` (throws on the first problem)
  - `isValidColor(value) -> boolean`

- [ ] **Step 1: Write the failing test**

`test/validate.test.js`. Note the `makeLevel` helper — each test mutates one field of a known-good level, so a failure points at exactly one rule.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLevel, LevelValidationError, isValidColor } from '../src/levels/validate.js';

const row = (ch) => ch.repeat(64);

function makeLevel(overrides = {}) {
  return {
    id: 'test-level',
    item: 'Item',
    target: 'Target',
    background: '#000000',
    ballColor: '#ffffff',
    types: { '#': { color: '#f0f0f0', hp: 1, points: 10 } },
    grid: [...Array(64)].map((_, i) => (i === 0 ? row('#') : row('.'))),
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

test('identity fields are required', () => {
  rejects({ id: '' }, 'id');
  rejects({ item: '' }, 'item');
  rejects({ target: '   ' }, 'target');
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
  rejects({ paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWW'] } }, 'paddle.grid');          // 9 wide
  rejects({ paddle: { colors: { W: '#fff' }, grid: ['W'.repeat(25)] } }, 'paddle.grid');       // 25 wide
  rejects({ paddle: { colors: { W: '#fff' }, grid: [...Array(9)].map(() => 'W'.repeat(16)) } }, 'paddle.grid'); // 9 tall
});

test('surrounding whitespace does not count against the paddle size', () => {
  const grid = [...Array(20)].map(() => '.'.repeat(64));
  grid[10] = `${'.'.repeat(20)}${'W'.repeat(16)}${'.'.repeat(28)}`;
  assert.doesNotThrow(() => validateLevel(makeLevel({ paddle: { colors: { W: '#fff' }, grid } })));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'validate.test.js`
Expected: FAIL — `Cannot find module .../src/levels/validate.js`

- [ ] **Step 3: Write `src/levels/validate.js`**

```js
import { parseSprite, isEmptySprite } from '../engine/sprite.js';
import {
  EMPTY_CHARS, GRID_ROWS, GRID_COLS, POWERUP_KINDS,
  PADDLE_MIN_W, PADDLE_MAX_W, PADDLE_MAX_H,
  PADDLE_GRID_MAX_ROWS, PADDLE_GRID_MAX_COLS,
} from '../config.js';

export class LevelValidationError extends Error {
  constructor(levelId, field, message) {
    super(`Level "${levelId}" — ${field}: ${message}`);
    this.name = 'LevelValidationError';
    this.levelId = levelId;
    this.field = field;
  }
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isValidColor = (v) => typeof v === 'string' && HEX.test(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

export function validateLevel(level) {
  const id = isText(level?.id) ? level.id : '<unnamed>';
  const fail = (field, message) => { throw new LevelValidationError(id, field, message); };

  if (!isText(level?.id)) fail('id', 'must be a non-empty string');
  if (!isText(level.item)) fail('item', 'must be a non-empty string');
  if (!isText(level.target)) fail('target', 'must be a non-empty string');
  if (!isValidColor(level.background)) fail('background', `expected a hex color, got ${JSON.stringify(level.background)}`);
  if (!isValidColor(level.ballColor)) fail('ballColor', `expected a hex color, got ${JSON.stringify(level.ballColor)}`);

  validateTypes(level, fail);
  validateGrid(level, fail);
  validatePaddle(level, fail);
}

function validateTypes(level, fail) {
  if (!level.types || typeof level.types !== 'object') fail('types', 'must be an object mapping characters to block types');
  for (const [ch, spec] of Object.entries(level.types)) {
    const at = (prop) => `types['${ch}']${prop}`;
    if (!spec || typeof spec !== 'object') fail(at(''), 'must be an object');
    if (!isValidColor(spec.color)) fail(at('.color'), `expected a hex color, got ${JSON.stringify(spec.color)}`);
    if (spec.solid) continue;

    const hp = spec.hp ?? 1;
    if (!isPositiveInt(hp)) fail(at('.hp'), `expected a positive integer, got ${JSON.stringify(spec.hp)}`);
    if (spec.damage !== undefined) validateDamage(spec.damage, hp, at('.damage'), fail);
    if (spec.explode !== undefined && !isPositiveInt(spec.explode)) {
      fail(at('.explode'), `expected a positive integer radius, got ${JSON.stringify(spec.explode)}`);
    }
    if (spec.points !== undefined && (typeof spec.points !== 'number' || spec.points < 0)) {
      fail(at('.points'), `expected a non-negative number, got ${JSON.stringify(spec.points)}`);
    }
    if (spec.powerup !== undefined) validatePowerup(spec.powerup, at, fail);
  }
}

function validateDamage(damage, hp, field, fail) {
  if (!Array.isArray(damage) || damage.length !== hp) {
    fail(field, `expected ${hp} colors (one per hit point), got ${Array.isArray(damage) ? damage.length : typeof damage}`);
  }
  damage.forEach((color, i) => {
    if (!isValidColor(color)) fail(field, `entry ${i} is not a hex color: ${JSON.stringify(color)}`);
  });
}

function validatePowerup(powerup, at, fail) {
  const spec = typeof powerup === 'number' ? { chance: powerup } : powerup;
  if (!spec || typeof spec !== 'object') fail(at('.powerup'), 'expected a number or an object');
  const { chance } = spec;
  if (typeof chance !== 'number' || !(chance >= 0 && chance <= 1)) {
    fail(at('.powerup.chance'), `expected a number between 0 and 1, got ${JSON.stringify(chance)}`);
  }
  const kinds = spec.kinds ?? (spec.kind === undefined ? [] : [spec.kind]);
  if (!Array.isArray(kinds)) fail(at('.powerup.kinds'), 'expected an array of powerup names');
  for (const kind of kinds) {
    if (!POWERUP_KINDS.includes(kind)) {
      fail(at('.powerup.kind'), `unknown powerup ${JSON.stringify(kind)}; expected one of ${POWERUP_KINDS.join(', ')}`);
    }
  }
}

function validateGrid(level, fail) {
  const { grid, types } = level;
  if (!Array.isArray(grid) || grid.length !== GRID_ROWS) {
    fail('grid', `expected exactly ${GRID_ROWS} rows, got ${Array.isArray(grid) ? grid.length : typeof grid}`);
  }
  let destructible = 0;
  grid.forEach((row, y) => {
    if (typeof row !== 'string' || row.length !== GRID_COLS) {
      fail('grid', `row ${y} must be exactly ${GRID_COLS} characters, got ${typeof row === 'string' ? row.length : typeof row}`);
    }
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (EMPTY_CHARS.includes(ch)) continue;
      if (!types[ch]) fail('grid', `row ${y} column ${x} uses character '${ch}', which has no entry in types`);
      if (!types[ch].solid) destructible++;
    }
  });
  if (destructible === 0) fail('grid', 'contains no destructible blocks, so the level could never be cleared');
}

function validatePaddle(level, fail) {
  const paddle = level.paddle;
  if (!paddle || typeof paddle !== 'object') fail('paddle', 'must be an object with colors and grid');
  if (!paddle.colors || typeof paddle.colors !== 'object') fail('paddle.colors', 'must map characters to hex colors');
  for (const [ch, color] of Object.entries(paddle.colors)) {
    if (!isValidColor(color)) fail('paddle.colors', `'${ch}' is not a hex color: ${JSON.stringify(color)}`);
  }

  const grid = paddle.grid;
  if (!Array.isArray(grid) || grid.length < 1 || grid.length > PADDLE_GRID_MAX_ROWS) {
    fail('paddle.grid', `expected 1 to ${PADDLE_GRID_MAX_ROWS} rows, got ${Array.isArray(grid) ? grid.length : typeof grid}`);
  }
  grid.forEach((row, y) => {
    if (typeof row !== 'string' || row.length > PADDLE_GRID_MAX_COLS) {
      fail('paddle.grid', `row ${y} must be a string of at most ${PADDLE_GRID_MAX_COLS} characters`);
    }
    for (const ch of row) {
      if (EMPTY_CHARS.includes(ch)) continue;
      if (!paddle.colors[ch]) fail('paddle.grid', `row ${y} uses character '${ch}', which has no entry in paddle.colors`);
    }
  });

  const sprite = parseSprite(grid, { trim: true });
  if (isEmptySprite(sprite)) fail('paddle.grid', 'is empty; draw a paddle');
  if (sprite.w < PADDLE_MIN_W || sprite.w > PADDLE_MAX_W) {
    fail('paddle.grid', `the drawn paddle is ${sprite.w} cells wide; it must be ${PADDLE_MIN_W} to ${PADDLE_MAX_W} for balance`);
  }
  if (sprite.h > PADDLE_MAX_H) {
    fail('paddle.grid', `the drawn paddle is ${sprite.h} cells tall; the maximum is ${PADDLE_MAX_H}`);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'validate.test.js`
Expected: PASS, 14 tests.

- [ ] **Step 5: Stage**

```bash
git add src/levels/validate.js test/validate.test.js
```

---

### Task 4: Clear-time estimation — the rule that catches unplayable levels

A 64×64 silhouette holds well over a thousand cells. The most likely bad contribution is not malformed data but a beautiful shape that takes twenty minutes to clear. This estimate catches that at load, before a reviewer has to play it.

The model, stated plainly because it is an approximation and the error message must not overclaim: a hit destroys roughly one blast-area worth of cells, so **hits ≈ total hit points ÷ mean blast area**, where a block with `explode: r` has blast area `(2r+1)²` and a plain block has area 1. It ignores where the ball actually goes; it is a sanity check, not a simulation.

**Files:**
- Modify: `src/levels/validate.js` (add the estimator, call it from `validateLevel`)
- Modify: `test/validate.test.js` (add the cases below)

**Interfaces:**
- Consumes: `validateLevel` internals from Task 3
- Produces: `estimateHitsToClear(level) -> number`, and a `grid` field rejection when the estimate falls outside `MIN_HITS`–`MAX_HITS`.

- [ ] **Step 1: Write the failing test**

Append to `test/validate.test.js`:

```js
import { estimateHitsToClear } from '../src/levels/validate.js';

test('a plain one-hit grid needs one hit per cell', () => {
  const level = makeLevel({
    types: { '#': { color: '#fff', hp: 1 } },
    grid: [...Array(64)].map((_, i) => (i < 2 ? row('#') : row('.'))),
  });
  assert.equal(estimateHitsToClear(level), 128);
});

test('hit points multiply the estimate', () => {
  const level = makeLevel({
    types: { '#': { color: '#fff', hp: 3 } },
    grid: [...Array(64)].map((_, i) => (i < 2 ? row('#') : row('.'))),
  });
  assert.equal(estimateHitsToClear(level), 384);
});

test('a blast radius divides the estimate by its area', () => {
  const level = makeLevel({
    types: { '#': { color: '#fff', hp: 1, explode: 1 } },
    grid: [...Array(64)].map((_, i) => (i < 9 ? row('#') : row('.'))),
  });
  // 576 cells, 1 hp each, blast area 9
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

test('the shipped lungs shape lands inside the playable range', () => {
  // 1758 destructible cells: 1596 soft (1hp, explode 1), 135 bronchial (3hp),
  // 12 cores (1hp, explode 4), 15 powerup blocks (1hp, explode 1).
  const hits = (1596 * 1 + 135 * 3 + 12 * 1 + 15 * 1) /
    ((1596 * 9 + 135 * 1 + 12 * 81 + 15 * 9) / 1758);
  assert.ok(hits > 80 && hits < 600, `expected a playable estimate, got ${hits}`);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'validate.test.js`
Expected: FAIL — `estimateHitsToClear is not a function`

- [ ] **Step 3: Add the estimator to `src/levels/validate.js`**

Add these exports and constants near the top, after the `HEX` helpers:

```js
export const MIN_HITS = 80;
export const MAX_HITS = 600;

/**
 * Rough number of ball impacts needed to clear the level.
 * hits = total hit points / mean blast area, where a block with `explode: r`
 * clears (2r+1)^2 cells. Deliberately ignores ball trajectory — this is a
 * sanity check on level length, not a simulation.
 */
export function estimateHitsToClear(level) {
  let cells = 0;
  let totalHp = 0;
  let totalArea = 0;

  for (const row of level.grid) {
    for (const ch of row) {
      if (EMPTY_CHARS.includes(ch)) continue;
      const spec = level.types[ch];
      if (!spec || spec.solid) continue;
      const radius = spec.explode ?? 0;
      cells++;
      totalHp += spec.hp ?? 1;
      totalArea += (2 * radius + 1) ** 2;
    }
  }
  if (cells === 0) return 0;
  return totalHp / (totalArea / cells);
}
```

Then call it at the end of `validateGrid`, replacing the existing final line:

```js
  if (destructible === 0) fail('grid', 'contains no destructible blocks, so the level could never be cleared');

  const hits = estimateHitsToClear(level);
  if (hits < MIN_HITS) {
    fail('grid', `clears in about ${Math.round(hits)} hits, which is too short (minimum ${MIN_HITS}). Add more blocks, more hit points, or a smaller explode radius.`);
  }
  if (hits > MAX_HITS) {
    fail('grid', `takes about ${Math.round(hits)} hits to clear, which is too long (maximum ${MAX_HITS}). Give the bulk blocks an explode radius — hits fall by roughly (2r+1)^2.`);
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'`
Expected: PASS. Note that `makeLevel`'s default grid (one row of 64 one-hit blocks) now estimates 64 hits and would be rejected — **update `makeLevel` to use two rows** (`i < 2`) so the baseline level stays valid, and re-run.

- [ ] **Step 5: Stage**

```bash
git add src/levels/validate.js test/validate.test.js
```

---

### Task 5: The block grid

Holds mutable block state and is the only module that knows about the `GRID_TOP` offset. Its public API speaks **playfield** coordinates; callers never convert.

**Files:**
- Create: `src/engine/grid.js`
- Test: `test/grid.test.js`

**Interfaces:**
- Consumes: `parseSprite`, `charAt` from `src/engine/sprite.js`; `GRID_TOP`, `GRID_ROWS`, `GRID_COLS`, `DEFAULT_POINTS_PER_HP` from `src/config.js`
- Produces:
  - `createGrid(level) -> grid` with fields `{ cols, rows, top, chars, hp, types, remaining, dirty }`. `hp` is an `Int32Array`: `0` empty/destroyed, `-1` solid, `>0` remaining hit points.
  - `blocksAt(grid, px, py) -> boolean` — true if the cell stops a ball (solid or alive)
  - `specAt(grid, px, py) -> spec | null`
  - `colorAt(grid, px, py) -> string | null` — honours `damage[]`
  - `damageAt(grid, px, py, amount = 1) -> Hit | null`
  - `destroyAt(grid, px, py) -> Hit | null` — outright kill, used by explosions
  - `isCleared(grid) -> boolean`
  - `Hit` is `{ px, py, spec, destroyed, points }`

- [ ] **Step 1: Write the failing test**

`test/grid.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, blocksAt, specAt, colorAt, damageAt, destroyAt, isCleared } from '../src/engine/grid.js';
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
  const g = createGrid(level(['#=' ], { '#': soft, '=': wall }));
  assert.ok(!isCleared(g));
  damageAt(g, ...P(0, 0));
  assert.ok(isCleared(g), 'solid blocks must not prevent a clear');
});

test('points default to 10 per hit point when unspecified', () => {
  const g = createGrid(level(['A'], { A: { color: '#fff', hp: 2 } }));
  damageAt(g, ...P(0, 0));
  assert.equal(damageAt(g, ...P(0, 0)).points, 20);
});

test('destroying a block marks the grid dirty for the renderer', () => {
  const g = createGrid(level(['#'], { '#': soft }));
  g.dirty = false;
  damageAt(g, ...P(0, 0));
  assert.equal(g.dirty, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'grid.test.js`
Expected: FAIL — `Cannot find module .../src/engine/grid.js`

- [ ] **Step 3: Write `src/engine/grid.js`**

```js
import { parseSprite, charAt } from './sprite.js';
import { GRID_TOP, GRID_ROWS, GRID_COLS, DEFAULT_POINTS_PER_HP } from '../config.js';

const SOLID = -1;
const EMPTY = 0;

export function createGrid(level) {
  const sprite = parseSprite(level.grid, { trim: false });
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  const chars = new Array(cols * rows).fill('');
  const hp = new Int32Array(cols * rows);
  let remaining = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = charAt(sprite, x, y);
      if (!ch) continue;
      const spec = level.types[ch];
      const i = y * cols + x;
      chars[i] = ch;
      if (spec.solid) {
        hp[i] = SOLID;
      } else {
        hp[i] = spec.hp ?? 1;
        remaining++;
      }
    }
  }
  return { cols, rows, top: GRID_TOP, chars, hp, types: level.types, remaining, dirty: true };
}

/** Playfield coords -> flat index, or -1 when outside the block grid. */
function indexAt(grid, px, py) {
  const gx = Math.floor(px);
  const gy = Math.floor(py) - grid.top;
  if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return -1;
  return gy * grid.cols + gx;
}

export function blocksAt(grid, px, py) {
  const i = indexAt(grid, px, py);
  return i >= 0 && grid.hp[i] !== EMPTY;
}

export function specAt(grid, px, py) {
  const i = indexAt(grid, px, py);
  if (i < 0 || grid.hp[i] === EMPTY) return null;
  return grid.types[grid.chars[i]] ?? null;
}

export function colorAt(grid, px, py) {
  const i = indexAt(grid, px, py);
  if (i < 0 || grid.hp[i] === EMPTY) return null;
  const spec = grid.types[grid.chars[i]];
  if (!spec) return null;
  if (grid.hp[i] === SOLID || !Array.isArray(spec.damage)) return spec.color;
  const max = spec.hp ?? 1;
  return spec.damage[max - grid.hp[i]] ?? spec.color;
}

function pointsFor(spec) {
  return spec.points ?? DEFAULT_POINTS_PER_HP * (spec.hp ?? 1);
}

function kill(grid, i, spec, px, py) {
  grid.hp[i] = EMPTY;
  grid.chars[i] = '';
  grid.remaining--;
  grid.dirty = true;
  return { px: Math.floor(px), py: Math.floor(py), spec, destroyed: true, points: pointsFor(spec) };
}

export function damageAt(grid, px, py, amount = 1) {
  const i = indexAt(grid, px, py);
  if (i < 0 || grid.hp[i] === EMPTY) return null;
  const spec = grid.types[grid.chars[i]];
  if (grid.hp[i] === SOLID) {
    return { px: Math.floor(px), py: Math.floor(py), spec, destroyed: false, points: 0 };
  }
  grid.hp[i] -= amount;
  grid.dirty = true;
  if (grid.hp[i] > 0) {
    return { px: Math.floor(px), py: Math.floor(py), spec, destroyed: false, points: 0 };
  }
  return kill(grid, i, spec, px, py);
}

/** Outright destruction, ignoring remaining hit points. Solid blocks are immune. */
export function destroyAt(grid, px, py) {
  const i = indexAt(grid, px, py);
  if (i < 0 || grid.hp[i] === EMPTY || grid.hp[i] === SOLID) return null;
  return kill(grid, i, grid.types[grid.chars[i]], px, py);
}

export function isCleared(grid) {
  return grid.remaining <= 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'grid.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Stage**

```bash
git add src/engine/grid.js test/grid.test.js
```

---

### Task 6: Chain explosions

**Files:**
- Create: `src/engine/explode.js`
- Test: `test/explode.test.js`

**Interfaces:**
- Consumes: `destroyAt` from `src/engine/grid.js`
- Produces: `detonate(grid, px, py, radius, chain = true) -> { cells: Hit[], points: number }`. The origin cell is **not** destroyed here — the caller has already killed it. `cells` is every additional block destroyed, in blast order, so the caller can roll powerups for each.

- [ ] **Step 1: Write the failing test**

`test/explode.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { detonate } from '../src/engine/explode.js';
import { createGrid, blocksAt, isCleared, damageAt } from '../src/engine/grid.js';
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
  // Bombs at 0 and 2 on a row; detonating at 1 with radius 1 reaches both,
  // and each of those clears its own radius-1 neighbourhood.
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
  // Must return rather than hang; a visited set is the only thing preventing this.
  const { cells } = detonate(g, ...P(4, 4), 1);
  assert.ok(cells.length > 0);
  assert.ok(isCleared(g), 'a fully explosive block cleared itself');
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'explode.test.js`
Expected: FAIL — `Cannot find module .../src/engine/explode.js`

- [ ] **Step 3: Write `src/engine/explode.js`**

```js
import { destroyAt } from './grid.js';

/**
 * Destroy everything within a Chebyshev radius of (px, py), excluding the origin.
 * Blocks destroyed that are themselves explosive enqueue their own blast, unless
 * the blast that killed them has chain=false, or they declare chain: false.
 *
 * The visited set is what makes this terminate: without it, two bombs inside
 * each other's radius would re-trigger one another forever.
 */
export function detonate(grid, px, py, radius, chain = true) {
  const originX = Math.floor(px);
  const originY = Math.floor(py);
  const cells = [];
  let points = 0;

  const visited = new Set([key(originX, originY)]);
  const queue = [{ x: originX, y: originY, radius, chain }];

  while (queue.length > 0) {
    const blast = queue.shift();
    for (let dy = -blast.radius; dy <= blast.radius; dy++) {
      for (let dx = -blast.radius; dx <= blast.radius; dx++) {
        const x = blast.x + dx;
        const y = blast.y + dy;
        const k = key(x, y);
        if (visited.has(k)) continue;
        visited.add(k);

        const hit = destroyAt(grid, x, y);
        if (!hit) continue;
        cells.push(hit);
        points += hit.points;

        if (blast.chain && hit.spec?.explode) {
          queue.push({ x, y, radius: hit.spec.explode, chain: hit.spec.chain !== false });
        }
      }
    }
  }
  return { cells, points };
}

const key = (x, y) => `${x},${y}`;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'explode.test.js`
Expected: PASS, 10 tests. If the overlapping-bombs test hangs, the visited set is being consulted after `destroyAt` instead of before.

- [ ] **Step 5: Stage**

```bash
git add src/engine/explode.js test/explode.test.js
```

---

### Task 7: Axis-separated collision

The ball is a 1×1 AABB. Each axis is applied and resolved **separately** — X first, then Y. A single combined test would have to guess which axis to reflect on when the ball clips a corner; resolving separately makes the answer fall out.

**Files:**
- Create: `src/engine/collide.js`
- Test: `test/collide.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `overlappedCells(x, y, w, h) -> Array<[cx, cy]>`
  - `moveAxis(box, delta, axis, isBlocked) -> { pos, blocked, cells }` where `axis` is `'x'` or `'y'`, `isBlocked(cx, cy)` is a predicate, `pos` is the resolved coordinate on that axis, and `cells` lists the blocking cells (empty when `blocked` is false).

- [ ] **Step 1: Write the failing test**

`test/collide.test.js`:

```js
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
  // The engine caps substeps at 0.5 cells; verify the largest legal step is caught.
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'collide.test.js`
Expected: FAIL — `Cannot find module .../src/engine/collide.js`

- [ ] **Step 3: Write `src/engine/collide.js`**

```js
// Nudges the sampling inward so a box whose edge lands exactly on a cell
// boundary is not treated as overlapping the next cell along.
const EPS = 1e-9;

/** Every cell an axis-aligned box touches. */
export function overlappedCells(x, y, w, h) {
  const x0 = Math.floor(x + EPS);
  const x1 = Math.floor(x + w - EPS);
  const y0 = Math.floor(y + EPS);
  const y1 = Math.floor(y + h - EPS);
  const cells = [];
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) cells.push([cx, cy]);
  }
  return cells;
}

/**
 * Apply `delta` to one axis of `box` and resolve any collision on that axis alone.
 * Callers apply X, then Y, so a corner clip reflects on the axis that actually
 * made contact rather than on an arbitrary choice.
 */
export function moveAxis(box, delta, axis, isBlocked) {
  const horizontal = axis === 'x';
  const start = horizontal ? box.x : box.y;
  const size = horizontal ? box.w : box.h;
  const target = start + delta;

  const x = horizontal ? target : box.x;
  const y = horizontal ? box.y : target;
  const blocking = overlappedCells(x, y, box.w, box.h).filter(([cx, cy]) => isBlocked(cx, cy));

  if (blocking.length === 0) return { pos: target, blocked: false, cells: [] };

  const coords = blocking.map(([cx, cy]) => (horizontal ? cx : cy));
  const pos = delta > 0 ? Math.min(...coords) - size : Math.max(...coords) + 1;
  return { pos, blocked: true, cells: blocking };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'collide.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Stage**

```bash
git add src/engine/collide.js test/collide.test.js
```

---

### Task 8: The ball

**Files:**
- Create: `src/engine/ball.js`
- Test: `test/ball.test.js`

**Interfaces:**
- Consumes: `moveAxis` from `src/engine/collide.js`; `BALL_SIZE`, `MAX_SUBSTEP_DIST`, `FIELD_W`, `CEILING`, `DRAIN_ROW` from `src/config.js`
- Produces:
  - `createBall(x, y, speed, angle) -> { x, y, vx, vy, stuck }` — `angle` is radians off straight up, positive to the right
  - `ballSpeed(ball) -> number`
  - `setBallAngle(ball, angle, speed)` — mutates in place
  - `stepBall(ball, dt, world) -> { drained: boolean }` where `world` is `{ isBlocked(cx, cy), onHitCell(cx, cy), onWall() }`

- [ ] **Step 1: Write the failing test**

`test/ball.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBall, stepBall, ballSpeed, setBallAngle } from '../src/engine/ball.js';
import { FIELD_W, CEILING, DRAIN_ROW, BALL_SIZE } from '../src/config.js';

const world = (blocked = new Set(), sink = {}) => ({
  isBlocked: (cx, cy) => blocked.has(`${cx},${cy}`),
  onHitCell: (cx, cy) => (sink.cells ??= []).push([cx, cy]),
  onWall: () => (sink.walls = (sink.walls ?? 0) + 1),
});

test('a ball created straight up travels upward at its speed', () => {
  const b = createBall(30, 50, 40, 0);
  assert.ok(Math.abs(b.vx) < 1e-9);
  assert.equal(Math.round(b.vy), -40);
  assert.equal(Math.round(ballSpeed(b)), 40);
});

test('a positive angle sends the ball to the right', () => {
  const b = createBall(30, 50, 40, Math.PI / 4);
  assert.ok(b.vx > 0 && b.vy < 0);
});

test('free flight advances by speed times time', () => {
  const b = createBall(30, 50, 40, 0);
  stepBall(b, 0.1, world());
  assert.ok(Math.abs(b.y - 46) < 1e-6, `expected 46, got ${b.y}`);
});

test('the left wall reflects and reports a wall hit', () => {
  const sink = {};
  const b = createBall(0.2, 50, 40, -Math.PI / 2);
  stepBall(b, 0.05, world(new Set(), sink));
  assert.ok(b.x >= 0);
  assert.ok(b.vx > 0, 'reversed');
  assert.ok(sink.walls >= 1);
});

test('the right wall reflects', () => {
  const b = createBall(FIELD_W - BALL_SIZE - 0.2, 50, 40, Math.PI / 2);
  stepBall(b, 0.05, world());
  assert.ok(b.x + BALL_SIZE <= FIELD_W);
  assert.ok(b.vx < 0);
});

test('the ceiling sits below the HUD and reflects', () => {
  const b = createBall(30, CEILING + 0.2, 40, 0);
  stepBall(b, 0.05, world());
  assert.ok(b.y >= CEILING, 'never enters the HUD band');
  assert.ok(b.vy > 0);
});

test('hitting a block reverses the ball and reports the cell', () => {
  const sink = {};
  const b = createBall(30, 20.1, 40, 0);          // heading up into cell (30, 19)
  stepBall(b, 0.05, world(new Set(['30,19']), sink));
  assert.ok(b.vy > 0, 'reflected downward');
  assert.deepEqual(sink.cells[0], [30, 19]);
});

test('speed is preserved through a bounce', () => {
  const b = createBall(30, 20.1, 40, 0);
  stepBall(b, 0.05, world(new Set(['30,19'])));
  assert.ok(Math.abs(ballSpeed(b) - 40) < 1e-6);
});

test('a very fast ball cannot tunnel through a one-cell wall', () => {
  // 900 cells/sec over a 1/60 frame is 15 cells of travel; without substepping
  // the ball would jump clean over the wall.
  const sink = {};
  const b = createBall(30, 40, 900, 0);
  stepBall(b, 1 / 60, world(new Set(['30,30']), sink));
  assert.ok(b.y > 30, `stopped below the wall, got y=${b.y}`);
  assert.ok(sink.cells.length > 0, 'the wall was registered as hit');
});

test('a ball past the drain row is reported as drained', () => {
  const b = createBall(30, DRAIN_ROW - 0.1, 40, Math.PI);   // straight down
  const r = stepBall(b, 0.1, world());
  assert.equal(r.drained, true);
});

test('a ball still in play is not reported as drained', () => {
  const b = createBall(30, 50, 40, 0);
  assert.equal(stepBall(b, 0.1, world()).drained, false);
});

test('setBallAngle rewrites direction while setting an explicit speed', () => {
  const b = createBall(30, 50, 40, 0);
  setBallAngle(b, Math.PI / 2, 60);
  assert.ok(Math.abs(ballSpeed(b) - 60) < 1e-9);
  assert.ok(b.vx > 0);
});

test('a stuck ball does not move', () => {
  const b = createBall(30, 50, 40, 0);
  b.stuck = true;
  stepBall(b, 0.1, world());
  assert.equal(b.y, 50);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'ball.test.js`
Expected: FAIL — `Cannot find module .../src/engine/ball.js`

- [ ] **Step 3: Write `src/engine/ball.js`**

```js
import { moveAxis } from './collide.js';
import { BALL_SIZE, MAX_SUBSTEP_DIST, FIELD_W, CEILING, DRAIN_ROW } from '../config.js';

/** @param angle radians off straight up, positive to the right */
export function createBall(x, y, speed, angle) {
  return { x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, stuck: false };
}

export const ballSpeed = (ball) => Math.hypot(ball.vx, ball.vy);

export function setBallAngle(ball, angle, speed = ballSpeed(ball)) {
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
}

/**
 * Advance the ball, subdividing so no substep travels more than half a cell.
 * That cap is the whole reason a fast ball cannot pass through a thin wall.
 */
export function stepBall(ball, dt, world) {
  if (ball.stuck) return { drained: false };

  const distance = ballSpeed(ball) * dt;
  const steps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP_DIST));
  const sub = dt / steps;

  for (let i = 0; i < steps; i++) {
    substep(ball, sub, world);
    if (ball.y >= DRAIN_ROW) return { drained: true };
  }
  return { drained: false };
}

function substep(ball, dt, world) {
  const box = { x: ball.x, y: ball.y, w: BALL_SIZE, h: BALL_SIZE };

  const rx = moveAxis(box, ball.vx * dt, 'x', world.isBlocked);
  ball.x = box.x = rx.pos;
  if (rx.blocked) {
    ball.vx = -ball.vx;
    for (const [cx, cy] of rx.cells) world.onHitCell(cx, cy);
  }

  const ry = moveAxis(box, ball.vy * dt, 'y', world.isBlocked);
  ball.y = box.y = ry.pos;
  if (ry.blocked) {
    ball.vy = -ball.vy;
    for (const [cx, cy] of ry.cells) world.onHitCell(cx, cy);
  }

  bounceWalls(ball, world);
}

function bounceWalls(ball, world) {
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    world.onWall();
  } else if (ball.x + BALL_SIZE > FIELD_W) {
    ball.x = FIELD_W - BALL_SIZE;
    ball.vx = -Math.abs(ball.vx);
    world.onWall();
  }
  if (ball.y < CEILING) {
    ball.y = CEILING;
    ball.vy = Math.abs(ball.vy);
    world.onWall();
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'ball.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Stage**

```bash
git add src/engine/ball.js test/ball.test.js
```

---

### Task 9: The paddle

Deflection uses the hit offset rather than mirror reflection. That single choice is what makes breakout a game of aim instead of a game of waiting.

**Files:**
- Create: `src/engine/paddle.js`
- Test: `test/paddle.test.js`

**Interfaces:**
- Consumes: `parseSprite` from `src/engine/sprite.js`; `ballSpeed`, `setBallAngle` from `src/engine/ball.js`; config constants
- Produces:
  - `createPaddle(level) -> { sprite, colors, baseW, h, scale, x }` — `x` is the left edge in playfield cells, centred on creation
  - `paddleBox(paddle) -> { x, y, w, h }`
  - `movePaddle(paddle, dir, dt)` — `dir` is `-1`, `0` or `1`
  - `setPaddleCenter(paddle, cx)`
  - `setPaddleScale(paddle, scale)` — grows about the centre
  - `ballHitsPaddle(ball, paddle) -> boolean`
  - `deflect(ball, paddle) -> number` — the new angle, in radians

- [ ] **Step 1: Write the failing test**

`test/paddle.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaddle, paddleBox, movePaddle, setPaddleCenter, setPaddleScale,
  ballHitsPaddle, deflect,
} from '../src/engine/paddle.js';
import { createBall, ballSpeed } from '../src/engine/ball.js';
import { FIELD_W, PADDLE_BOTTOM, PADDLE_SPEED, BALL_MAX_ANGLE, WIDE_PADDLE_SCALE } from '../src/config.js';

const level = (rows = ['WWWWWWWWWWWWWWWW']) => ({ paddle: { colors: { W: '#fff' }, grid: rows } });

test('a new paddle is centred and sized from its trimmed sprite', () => {
  const p = createPaddle(level());
  assert.equal(p.baseW, 16);
  assert.equal(p.h, 1);
  const box = paddleBox(p);
  assert.equal(box.w, 16);
  assert.equal(box.x + box.w / 2, FIELD_W / 2);
});

test('surrounding whitespace is trimmed away before sizing', () => {
  const p = createPaddle(level(['....WWWWWWWWWWWWWWWW....', '........................']));
  assert.equal(p.baseW, 16);
  assert.equal(p.h, 1);
});

test('the paddle sits on the configured bottom row', () => {
  const p = createPaddle(level(['WWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWW']));
  const box = paddleBox(p);
  assert.equal(box.h, 2);
  assert.equal(box.y + box.h, PADDLE_BOTTOM);
});

test('movement is proportional to time', () => {
  const p = createPaddle(level());
  const before = p.x;
  movePaddle(p, 1, 0.5);
  assert.ok(Math.abs(p.x - (before + PADDLE_SPEED * 0.5)) < 1e-9);
});

test('the paddle cannot leave the playfield', () => {
  const p = createPaddle(level());
  movePaddle(p, -1, 10);
  assert.equal(p.x, 0);
  movePaddle(p, 1, 10);
  assert.equal(p.x + paddleBox(p).w, FIELD_W);
});

test('setPaddleCenter clamps at both edges', () => {
  const p = createPaddle(level());
  setPaddleCenter(p, -100);
  assert.equal(p.x, 0);
  setPaddleCenter(p, 1000);
  assert.equal(p.x + paddleBox(p).w, FIELD_W);
});

test('scaling grows the paddle about its centre', () => {
  const p = createPaddle(level());
  const before = paddleBox(p);
  setPaddleScale(p, WIDE_PADDLE_SCALE);
  const after = paddleBox(p);
  assert.equal(after.w, 16 * WIDE_PADDLE_SCALE);
  assert.ok(Math.abs((after.x + after.w / 2) - (before.x + before.w / 2)) < 1e-9);
});

test('scaling at the wall clamps back inside the playfield', () => {
  const p = createPaddle(level());
  setPaddleCenter(p, FIELD_W);
  setPaddleScale(p, WIDE_PADDLE_SCALE);
  assert.ok(p.x + paddleBox(p).w <= FIELD_W + 1e-9);
});

test('a centred hit sends the ball straight up', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const b = createBall(box.x + box.w / 2 - 0.5, box.y - 1, 40, Math.PI);
  const angle = deflect(b, p);
  assert.ok(Math.abs(angle) < 1e-9);
  assert.ok(b.vy < 0);
});

test('the edges deflect at the maximum angle, and the sign follows the side', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);

  const right = createBall(box.x + box.w - 0.5, box.y - 1, 40, Math.PI);
  assert.ok(Math.abs(deflect(right, p) - BALL_MAX_ANGLE) < 1e-6);
  assert.ok(right.vx > 0);

  const left = createBall(box.x - 0.5, box.y - 1, 40, Math.PI);
  assert.ok(Math.abs(deflect(left, p) + BALL_MAX_ANGLE) < 1e-6);
  assert.ok(left.vx < 0);
});

test('a hit beyond the edge is clamped rather than over-rotated', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const b = createBall(box.x + box.w + 5, box.y - 1, 40, Math.PI);
  assert.ok(Math.abs(deflect(b, p)) <= BALL_MAX_ANGLE + 1e-9);
});

test('deflection preserves speed', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const b = createBall(box.x + 2, box.y - 1, 37, Math.PI);
  deflect(b, p);
  assert.ok(Math.abs(ballSpeed(b) - 37) < 1e-6);
});

test('only a descending ball overlapping the paddle counts as a hit', () => {
  const p = createPaddle(level());
  const box = paddleBox(p);
  const falling = createBall(box.x + 2, box.y - 0.5, 40, Math.PI);
  assert.equal(ballHitsPaddle(falling, p), true);

  const rising = createBall(box.x + 2, box.y - 0.5, 40, 0);
  assert.equal(ballHitsPaddle(rising, p), false, 'a ball on its way up must pass through');

  const away = createBall(box.x - 10, box.y - 0.5, 40, Math.PI);
  assert.equal(ballHitsPaddle(away, p), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'paddle.test.js`
Expected: FAIL — `Cannot find module .../src/engine/paddle.js`

- [ ] **Step 3: Write `src/engine/paddle.js`**

```js
import { parseSprite } from './sprite.js';
import { ballSpeed, setBallAngle } from './ball.js';
import { FIELD_W, PADDLE_BOTTOM, PADDLE_SPEED, BALL_MAX_ANGLE, BALL_SIZE } from '../config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createPaddle(level) {
  const sprite = parseSprite(level.paddle.grid, { trim: true });
  const paddle = {
    sprite,
    colors: level.paddle.colors,
    baseW: sprite.w,
    h: sprite.h,
    scale: 1,
    x: 0,
  };
  setPaddleCenter(paddle, FIELD_W / 2);
  return paddle;
}

export const paddleWidth = (paddle) => paddle.baseW * paddle.scale;

export function paddleBox(paddle) {
  return { x: paddle.x, y: PADDLE_BOTTOM - paddle.h, w: paddleWidth(paddle), h: paddle.h };
}

function clampX(paddle) {
  paddle.x = clamp(paddle.x, 0, FIELD_W - paddleWidth(paddle));
}

export function movePaddle(paddle, dir, dt) {
  paddle.x += dir * PADDLE_SPEED * dt;
  clampX(paddle);
}

export function setPaddleCenter(paddle, cx) {
  paddle.x = cx - paddleWidth(paddle) / 2;
  clampX(paddle);
}

/** Grows about the centre, then clamps, so a wide paddle at the wall stays legal. */
export function setPaddleScale(paddle, scale) {
  const centre = paddle.x + paddleWidth(paddle) / 2;
  paddle.scale = scale;
  setPaddleCenter(paddle, centre);
}

export function ballHitsPaddle(ball, paddle) {
  if (ball.vy <= 0) return false;
  const box = paddleBox(paddle);
  return ball.x + BALL_SIZE > box.x
    && ball.x < box.x + box.w
    && ball.y + BALL_SIZE > box.y
    && ball.y < box.y + box.h;
}

/**
 * Deflect off the paddle by where it was struck: dead centre goes straight up,
 * the outer edges go out at BALL_MAX_ANGLE. Speed is preserved.
 */
export function deflect(ball, paddle) {
  const box = paddleBox(paddle);
  const half = box.w / 2;
  const ballCentre = ball.x + BALL_SIZE / 2;
  const offset = clamp((ballCentre - (box.x + half)) / half, -1, 1);
  const angle = offset * BALL_MAX_ANGLE;
  setBallAngle(ball, angle, ballSpeed(ball));
  return angle;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'paddle.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Stage**

```bash
git add src/engine/paddle.js test/paddle.test.js
```

---

### Task 10: Powerup drops and active effects

Two modules, one task: the drop is meaningless without the effect it grants, and they are tested against each other.

**Files:**
- Create: `src/engine/effects.js`, `src/engine/powerups.js`
- Test: `test/effects.test.js`, `test/powerups.test.js`

**Interfaces:**
- Consumes: `paddleBox` from `src/engine/paddle.js`; `POWERUP_KINDS`, `EFFECT_DURATION`, `DROP_SPEED`, `DROP_SIZE`, `DRAIN_ROW` from `src/config.js`
- Produces:
  - `createEffects() -> { active: Map<string, number> }`
  - `applyEffect(effects, kind) -> boolean` — false for instant kinds with no duration
  - `tickEffects(effects, dt) -> string[]` — kinds that expired on this tick
  - `hasEffect(effects, kind) -> boolean`, `effectRemaining(effects, kind) -> number`, `clearEffects(effects)`
  - `rollPowerup(spec, rng = Math.random) -> string | null`
  - `createDrop(kind, px, py) -> { kind, x, y }`
  - `stepDrops(drops, dt, paddle) -> { drops, caught: string[] }`

- [ ] **Step 1: Write the failing tests**

`test/effects.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEffects, applyEffect, tickEffects, hasEffect, effectRemaining, clearEffects,
} from '../src/engine/effects.js';
import { EFFECT_DURATION } from '../src/config.js';

test('applying an effect starts its timer', () => {
  const e = createEffects();
  assert.equal(applyEffect(e, 'laser'), true);
  assert.equal(hasEffect(e, 'laser'), true);
  assert.equal(effectRemaining(e, 'laser'), EFFECT_DURATION.laser);
});

test('an effect expires exactly once, and is reported when it does', () => {
  const e = createEffects();
  applyEffect(e, 'laser');
  assert.deepEqual(tickEffects(e, EFFECT_DURATION.laser - 0.1), []);
  assert.deepEqual(tickEffects(e, 0.2), ['laser']);
  assert.equal(hasEffect(e, 'laser'), false);
  assert.deepEqual(tickEffects(e, 1), [], 'not reported a second time');
});

test('re-catching refreshes the timer instead of stacking it', () => {
  const e = createEffects();
  applyEffect(e, 'widePaddle');
  tickEffects(e, 10);
  applyEffect(e, 'widePaddle');
  assert.equal(effectRemaining(e, 'widePaddle'), EFFECT_DURATION.widePaddle,
    'a second pickup must not grant 2x the duration');
});

test('slowBall and fastBall cancel each other', () => {
  const e = createEffects();
  applyEffect(e, 'slowBall');
  applyEffect(e, 'fastBall');
  assert.equal(hasEffect(e, 'slowBall'), false);
  assert.equal(hasEffect(e, 'fastBall'), true);

  applyEffect(e, 'slowBall');
  assert.equal(hasEffect(e, 'fastBall'), false);
  assert.equal(hasEffect(e, 'slowBall'), true);
});

test('multiball is instant and holds no timer', () => {
  const e = createEffects();
  assert.equal(applyEffect(e, 'multiball'), false);
  assert.equal(hasEffect(e, 'multiball'), false);
});

test('clearEffects empties everything, as on losing a life', () => {
  const e = createEffects();
  applyEffect(e, 'laser');
  applyEffect(e, 'sticky');
  clearEffects(e);
  assert.equal(hasEffect(e, 'laser'), false);
  assert.equal(hasEffect(e, 'sticky'), false);
});

test('several effects expiring on the same tick are all reported', () => {
  const e = createEffects();
  applyEffect(e, 'laser');
  applyEffect(e, 'sticky');
  const expired = tickEffects(e, 999).sort();
  assert.deepEqual(expired, ['laser', 'sticky']);
});
```

`test/powerups.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { rollPowerup, createDrop, stepDrops } from '../src/engine/powerups.js';
import { createPaddle, paddleBox } from '../src/engine/paddle.js';
import { DROP_SPEED, DRAIN_ROW, POWERUP_KINDS } from '../src/config.js';

const paddle = () => createPaddle({ paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWWWWWWWWW'] } });
/** Deterministic rng: returns the queued values in order. */
const rng = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('a block with no powerup never drops', () => {
  assert.equal(rollPowerup({ color: '#fff' }, rng(0)), null);
});

test('the chance is respected at both ends', () => {
  assert.equal(rollPowerup({ powerup: 0.2 }, rng(0.9, 0)), null, 'roll above the chance fails');
  assert.ok(rollPowerup({ powerup: 0.2 }, rng(0.1, 0)) !== null, 'roll below the chance succeeds');
  assert.equal(rollPowerup({ powerup: 0 }, rng(0, 0)), null, 'chance 0 never drops');
  assert.ok(rollPowerup({ powerup: 1 }, rng(0.999, 0)) !== null, 'chance 1 always drops');
});

test('a named kind is always the one dropped', () => {
  assert.equal(rollPowerup({ powerup: { chance: 1, kind: 'laser' } }, rng(0, 0)), 'laser');
});

test('a kinds list is chosen from', () => {
  const spec = { powerup: { chance: 1, kinds: ['sticky', 'laser'] } };
  assert.equal(rollPowerup(spec, rng(0, 0)), 'sticky');
  assert.equal(rollPowerup(spec, rng(0, 0.99)), 'laser');
});

test('a bare chance picks from the full pool', () => {
  const kind = rollPowerup({ powerup: 1 }, rng(0, 0));
  assert.ok(POWERUP_KINDS.includes(kind));
});

test('drops fall at the configured speed', () => {
  const d = createDrop('laser', 10, 20);
  const { drops } = stepDrops([d], 0.5, paddle());
  assert.ok(Math.abs(drops[0].y - (20 + DROP_SPEED * 0.5)) < 1e-9);
});

test('a drop reaching the paddle is caught and removed', () => {
  const p = paddle();
  const box = paddleBox(p);
  const d = createDrop('sticky', box.x + 2, box.y - 0.1);
  const { drops, caught } = stepDrops([d], 0.02, p);
  assert.deepEqual(caught, ['sticky']);
  assert.equal(drops.length, 0);
});

test('a drop missing the paddle horizontally is not caught', () => {
  const p = paddle();
  const box = paddleBox(p);
  const d = createDrop('sticky', box.x - 5, box.y - 0.1);
  const { caught } = stepDrops([d], 0.02, p);
  assert.deepEqual(caught, []);
});

test('a drop past the drain row is discarded', () => {
  const p = paddle();
  const d = createDrop('laser', 2, DRAIN_ROW - 0.1);
  const { drops, caught } = stepDrops([d], 0.5, p);
  assert.equal(drops.length, 0);
  assert.deepEqual(caught, []);
});

test('several drops are handled independently in one step', () => {
  const p = paddle();
  const box = paddleBox(p);
  const result = stepDrops([
    createDrop('laser', box.x + 1, box.y - 0.1),
    createDrop('sticky', 1, 10),
  ], 0.02, p);
  assert.deepEqual(result.caught, ['laser']);
  assert.equal(result.drops.length, 1);
  assert.equal(result.drops[0].kind, 'sticky');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test 'test/*.test.js'effects.test.js test/powerups.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/engine/effects.js`**

```js
import { EFFECT_DURATION } from '../config.js';

/** Effects that cancel one another; catching either clears the other. */
const EXCLUSIVE = [['slowBall', 'fastBall']];

export function createEffects() {
  return { active: new Map() };
}

/**
 * Start or refresh an effect. Refreshing rather than accumulating is deliberate:
 * a second pickup restarts the clock, it does not double the duration.
 * @returns false for instant effects (multiball), which hold no timer.
 */
export function applyEffect(effects, kind) {
  const duration = EFFECT_DURATION[kind];
  if (typeof duration !== 'number') return false;

  for (const pair of EXCLUSIVE) {
    if (!pair.includes(kind)) continue;
    for (const other of pair) if (other !== kind) effects.active.delete(other);
  }
  effects.active.set(kind, duration);
  return true;
}

/** @returns the kinds that ran out on this tick. */
export function tickEffects(effects, dt) {
  const expired = [];
  for (const [kind, remaining] of effects.active) {
    const left = remaining - dt;
    if (left <= 0) {
      effects.active.delete(kind);
      expired.push(kind);
    } else {
      effects.active.set(kind, left);
    }
  }
  return expired;
}

export const hasEffect = (effects, kind) => effects.active.has(kind);
export const effectRemaining = (effects, kind) => effects.active.get(kind) ?? 0;
export const clearEffects = (effects) => effects.active.clear();
```

- [ ] **Step 4: Write `src/engine/powerups.js`**

```js
import { paddleBox } from './paddle.js';
import { POWERUP_KINDS, DROP_SPEED, DROP_SIZE, DRAIN_ROW } from '../config.js';

/**
 * Decide whether a destroyed block drops something.
 * Consumes two random values: one for the chance, one for the kind.
 */
export function rollPowerup(spec, rng = Math.random) {
  if (!spec || spec.powerup === undefined) return null;
  const config = typeof spec.powerup === 'number' ? { chance: spec.powerup } : spec.powerup;
  if (!(rng() < config.chance)) return null;

  const kinds = config.kinds ?? (config.kind ? [config.kind] : POWERUP_KINDS);
  return kinds[Math.min(kinds.length - 1, Math.floor(rng() * kinds.length))];
}

export function createDrop(kind, px, py) {
  return { kind, x: px, y: py };
}

/** Advance every drop, collecting those the paddle caught and discarding those that fell past it. */
export function stepDrops(drops, dt, paddle) {
  const box = paddleBox(paddle);
  const remaining = [];
  const caught = [];

  for (const drop of drops) {
    drop.y += DROP_SPEED * dt;
    if (overlaps(drop, box)) {
      caught.push(drop.kind);
      continue;
    }
    if (drop.y >= DRAIN_ROW) continue;
    remaining.push(drop);
  }
  return { drops: remaining, caught };
}

function overlaps(drop, box) {
  return drop.x + DROP_SIZE > box.x
    && drop.x < box.x + box.w
    && drop.y + DROP_SIZE > box.y
    && drop.y < box.y + box.h;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test 'test/*.test.js'effects.test.js test/powerups.test.js`
Expected: PASS, 7 + 10 tests.

- [ ] **Step 6: Stage**

```bash
git add src/engine/effects.js src/engine/powerups.js test/effects.test.js test/powerups.test.js
```

---

### Task 11: Laser shots

**Files:**
- Create: `src/engine/lasers.js`
- Test: `test/lasers.test.js`

**Interfaces:**
- Consumes: `LASER_SPEED`, `CEILING` from `src/config.js`
- Produces:
  - `createShot(px, py) -> { x, y }`
  - `stepShots(shots, dt, isBlocked) -> { shots, hits: Array<[cx, cy]> }` — a shot that reaches a blocked cell reports it and despawns; one shot deals one point of damage.

- [ ] **Step 1: Write the failing test**

`test/lasers.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createShot, stepShots } from '../src/engine/lasers.js';
import { LASER_SPEED, CEILING } from '../src/config.js';

const solid = (...keys) => (cx, cy) => new Set(keys).has(`${cx},${cy}`);
const none = () => false;

test('a shot travels upward at the configured speed', () => {
  const { shots } = stepShots([createShot(10, 50)], 0.1, none);
  assert.ok(Math.abs(shots[0].y - (50 - LASER_SPEED * 0.1)) < 1e-9);
});

test('a shot hitting a block reports the cell and despawns', () => {
  const { shots, hits } = stepShots([createShot(10, 30.4)], 0.005, solid('10,30'));
  assert.deepEqual(hits, [[10, 30]]);
  assert.equal(shots.length, 0, 'one shot, one block');
});

test('a shot leaving the top of the playfield despawns without a hit', () => {
  const { shots, hits } = stepShots([createShot(10, CEILING + 0.1)], 0.5, none);
  assert.equal(shots.length, 0);
  assert.deepEqual(hits, []);
});

test('a fast shot cannot skip over a block', () => {
  // At 80 cells/sec over a 1/60 frame a shot covers 1.3 cells, enough to jump a thin block.
  const { hits } = stepShots([createShot(10, 40)], 1 / 60, solid('10,39'));
  assert.deepEqual(hits, [[10, 39]]);
});

test('several shots are stepped independently', () => {
  const { shots, hits } = stepShots([createShot(10, 30.4), createShot(20, 50)], 0.005, solid('10,30'));
  assert.deepEqual(hits, [[10, 30]]);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].x, 20);
});

test('stepping an empty list is a no-op', () => {
  const { shots, hits } = stepShots([], 0.1, none);
  assert.deepEqual(shots, []);
  assert.deepEqual(hits, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'lasers.test.js`
Expected: FAIL — `Cannot find module .../src/engine/lasers.js`

- [ ] **Step 3: Write `src/engine/lasers.js`**

```js
import { LASER_SPEED, CEILING, MAX_SUBSTEP_DIST } from '../config.js';

export function createShot(px, py) {
  return { x: px, y: py };
}

/**
 * Advance shots upward. Like the ball, movement is subdivided so a shot cannot
 * cross a whole block in one frame without registering the hit.
 */
export function stepShots(shots, dt, isBlocked) {
  const remaining = [];
  const hits = [];

  for (const shot of shots) {
    const distance = LASER_SPEED * dt;
    const steps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP_DIST));
    let hit = null;

    for (let i = 0; i < steps && !hit; i++) {
      shot.y -= distance / steps;
      const cx = Math.floor(shot.x);
      const cy = Math.floor(shot.y);
      if (isBlocked(cx, cy)) hit = [cx, cy];
    }

    if (hit) hits.push(hit);
    else if (shot.y > CEILING) remaining.push(shot);
  }
  return { shots: remaining, hits };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'lasers.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Stage**

```bash
git add src/engine/lasers.js test/lasers.test.js
```

---

### Task 12: Screen fit and persistence

Two small browser-adjacent modules kept pure so they can be tested under Node. Neither touches a global: the viewport and the storage object are both parameters.

**Files:**
- Create: `src/render/scale.js`, `src/storage.js`
- Test: `test/scale.test.js`, `test/storage.test.js`

**Interfaces:**
- Produces:
  - `computeFit({ viewportW, viewportH, dpr }) -> { scale, deviceW, deviceH, cssW, cssH }`
  - `createStorage(backing) -> { getNumber(key, fallback), setNumber(key, value), getBool(key, fallback), setBool(key, value) }` — keys are prefixed with `lungs:` internally

- [ ] **Step 1: Write the failing tests**

`test/scale.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFit } from '../src/render/scale.js';
import { BASE_W, BASE_H } from '../src/config.js';

test('a desktop window picks the largest integer factor that fits', () => {
  const fit = computeFit({ viewportW: 1400, viewportH: 900, dpr: 1 });
  assert.equal(fit.scale, Math.floor(900 / BASE_H));   // height-limited: 2
  assert.equal(fit.cssW, BASE_W * fit.scale);
  assert.equal(fit.cssH, BASE_H * fit.scale);
});

test('the factor is always an integer, so pixels stay square', () => {
  for (const h of [401, 555, 799, 801]) {
    const fit = computeFit({ viewportW: 4000, viewportH: h, dpr: 1 });
    assert.equal(fit.scale, Math.floor(fit.scale));
  }
});

test('a phone is scaled in device pixels, not CSS pixels', () => {
  // The whole point: 390 CSS px admits only 1x, but at DPR 3 there are 1170
  // device pixels, which admits 4x and nearly fills the screen.
  const fit = computeFit({ viewportW: 390, viewportH: 844, dpr: 3 });
  assert.ok(fit.scale >= 4, `expected at least 4x, got ${fit.scale}`);
  assert.ok(fit.cssW > 300, `expected the canvas to fill the width, got ${fit.cssW}`);
});

test('the backing store is sized in device pixels', () => {
  const fit = computeFit({ viewportW: 390, viewportH: 844, dpr: 3 });
  assert.equal(fit.deviceW, BASE_W * fit.scale);
  assert.equal(fit.deviceH, BASE_H * fit.scale);
  assert.ok(Math.abs(fit.cssW - fit.deviceW / 3) < 1e-9);
});

test('the canvas never overflows a viewport that can hold it', () => {
  for (const [w, h, dpr] of [[1400, 900, 1], [390, 844, 3], [768, 1024, 2], [1920, 1080, 1]]) {
    const fit = computeFit({ viewportW: w, viewportH: h, dpr });
    assert.ok(fit.cssW <= w + 1e-9, `width ${fit.cssW} > ${w}`);
    assert.ok(fit.cssH <= h + 1e-9, `height ${fit.cssH} > ${h}`);
  }
});

test('a viewport too small for even 1x still returns a usable scale', () => {
  const fit = computeFit({ viewportW: 100, viewportH: 100, dpr: 1 });
  assert.equal(fit.scale, 1, 'never 0, which would produce a zero-sized canvas');
});

test('a missing or absurd dpr falls back to 1', () => {
  assert.equal(computeFit({ viewportW: 800, viewportH: 800 }).scale, computeFit({ viewportW: 800, viewportH: 800, dpr: 1 }).scale);
  assert.ok(computeFit({ viewportW: 800, viewportH: 800, dpr: 0 }).scale >= 1);
});
```

`test/storage.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';
import { STORAGE_PREFIX, KEY_HIGHSCORE } from '../src/config.js';

/** Minimal localStorage stand-in. */
function fake(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

test('keys are written under the lungs: prefix', () => {
  const backing = fake();
  createStorage(backing).setNumber(KEY_HIGHSCORE, 1234);
  assert.equal(backing.data[`${STORAGE_PREFIX}${KEY_HIGHSCORE}`], '1234');
  assert.equal(backing.data[KEY_HIGHSCORE], undefined,
    'an unprefixed key would collide with other projects on username.github.io');
});

test('a stored number round-trips', () => {
  const s = createStorage(fake());
  s.setNumber(KEY_HIGHSCORE, 4200);
  assert.equal(s.getNumber(KEY_HIGHSCORE, 0), 4200);
});

test('a missing key returns the fallback', () => {
  assert.equal(createStorage(fake()).getNumber(KEY_HIGHSCORE, 7), 7);
});

test('a corrupt value reads as the fallback rather than NaN', () => {
  const s = createStorage(fake({ [`${STORAGE_PREFIX}${KEY_HIGHSCORE}`]: 'not-a-number' }));
  assert.equal(s.getNumber(KEY_HIGHSCORE, 0), 0);
});

test('booleans round-trip', () => {
  const s = createStorage(fake());
  s.setBool('muted', true);
  assert.equal(s.getBool('muted', false), true);
  s.setBool('muted', false);
  assert.equal(s.getBool('muted', true), false);
});

test('a throwing setItem does not propagate', () => {
  // Safari in private mode throws on setItem; a quota error must never kill the game loop.
  const backing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  const s = createStorage(backing);
  assert.doesNotThrow(() => s.setNumber(KEY_HIGHSCORE, 1));
});

test('a throwing getItem falls back instead of propagating', () => {
  const backing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
  assert.equal(createStorage(backing).getNumber(KEY_HIGHSCORE, 99), 99);
});

test('a null backing store behaves as empty rather than crashing', () => {
  const s = createStorage(null);
  assert.doesNotThrow(() => s.setNumber(KEY_HIGHSCORE, 5));
  assert.equal(s.getNumber(KEY_HIGHSCORE, 3), 3);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test 'test/*.test.js'scale.test.js test/storage.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/render/scale.js`**

```js
import { BASE_W, BASE_H } from '../config.js';

/**
 * Largest integer upscale of the 256x400 backing store that fits the viewport.
 *
 * The factor is computed in DEVICE pixels. On a 390pt phone at DPR 3, CSS-pixel
 * maths would allow only 1x — a 256pt canvas on a 390pt screen — whereas the
 * 1170 device pixels available allow 4x, which nearly fills the screen and is
 * still pixel-exact.
 */
export function computeFit({ viewportW, viewportH, dpr = 1 }) {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const deviceAvailW = viewportW * ratio;
  const deviceAvailH = viewportH * ratio;

  const scale = Math.max(1, Math.floor(Math.min(deviceAvailW / BASE_W, deviceAvailH / BASE_H)));
  const deviceW = BASE_W * scale;
  const deviceH = BASE_H * scale;

  return { scale, deviceW, deviceH, cssW: deviceW / ratio, cssH: deviceH / ratio };
}
```

- [ ] **Step 4: Write `src/storage.js`**

```js
import { STORAGE_PREFIX } from './config.js';

/**
 * localStorage wrapper. The backing store is a parameter so this is testable
 * under Node, and every access is guarded: Safari private mode throws on
 * setItem, and a storage failure must never take down the game loop.
 */
export function createStorage(backing) {
  const key = (name) => `${STORAGE_PREFIX}${name}`;

  const read = (name) => {
    try {
      return backing?.getItem(key(name)) ?? null;
    } catch {
      return null;
    }
  };

  const write = (name, value) => {
    try {
      backing?.setItem(key(name), String(value));
    } catch {
      // Storage is unavailable or full. The score simply is not persisted.
    }
  };

  return {
    getNumber(name, fallback = 0) {
      const raw = read(name);
      const value = Number(raw);
      return raw !== null && Number.isFinite(value) ? value : fallback;
    },
    setNumber(name, value) {
      write(name, value);
    },
    getBool(name, fallback = false) {
      const raw = read(name);
      return raw === null ? fallback : raw === 'true';
    },
    setBool(name, value) {
      write(name, value ? 'true' : 'false');
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test 'test/*.test.js'scale.test.js test/storage.test.js`
Expected: PASS, 7 + 8 tests.

- [ ] **Step 6: Stage**

```bash
git add src/render/scale.js src/storage.js test/scale.test.js test/storage.test.js
```

---

### Task 13: Level one and the registry

**Files:**
- Create: `src/levels/01-cigarette-lungs.js`, `src/levels/index.js`
- Test: `test/levels.test.js`
- Reference: `tools/gen-lungs.mjs` (already in the repo) produces the art deterministically

**Interfaces:**
- Consumes: `validateLevel`, `LevelValidationError` from `src/levels/validate.js`
- Produces: `loadLevels(log = console) -> Level[]` — validates each candidate, logs and skips the invalid ones

- [ ] **Step 1: Generate the grid rows**

```bash
node tools/gen-lungs.mjs > /tmp/lungs.txt
head -c 200 /tmp/lungs.txt
```

The first 64 lines are the grid; the trailing lines are the counts summary. Each of the 64 lines is exactly 64 characters using `.`, `#`, `B`, `*` and `p`. Wrap each as a quoted string in the level's `grid` array, in order.

- [ ] **Step 2: Write `src/levels/01-cigarette-lungs.js`**

The types table, which is the part that governs how the level plays:

```js
export default {
  id: 'cigarette-lungs',
  item: 'Cigarette',
  target: 'Lungs',
  author: 'ozh',
  background: '#000000',
  ballColor: '#ffffff',

  types: {
    // Bulk tissue. A small NON-chaining blast: every hit clears a 3x3 pocket,
    // which turns ~1750 cells into ~230 hits and lets the ball tunnel visibly.
    // chain:false is what stops a big core blast cascading across the whole lung.
    '#': { color: '#f0f0f0', hp: 1, points: 10, explode: 1, chain: false },

    // Bronchial tree: tougher, darkening as it takes damage.
    B: { color: '#c8a0a0', hp: 3, points: 30, damage: ['#c8a0a0', '#8a6060', '#503030'] },

    // Sparse chaining cores, for spectacle.
    '*': { color: '#ff5030', hp: 1, points: 50, explode: 4 },

    // Powerup-bearing tissue.
    p: { color: '#bfe8ff', hp: 1, points: 20, explode: 1, chain: false, powerup: 0.35 },
  },

  grid: [
    // 64 rows pasted from `node tools/gen-lungs.mjs`
  ],

  paddle: {
    colors: { f: '#e8a06a', W: '#f4f4f4', r: '#ff6030' },
    grid: [
      'ffffffWWWWWWWWWr',
      'ffffffWWWWWWWWWr',
      'ffffffWWWWWWWWWr',
    ],
  },
};
```

- [ ] **Step 3: Write the failing test**

`test/levels.test.js`:

```js
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

test('the registry returns the shipped level', () => {
  const levels = loadLevels({ error: () => {} });
  assert.ok(levels.length >= 1);
  assert.equal(levels[0].id, 'cigarette-lungs');
});

test('every level id is unique', () => {
  const ids = loadLevels({ error: () => {} }).map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the paddle is a cigarette of legal size', () => {
  assert.equal(lungs.paddle.grid[0].length, 16);
  assert.equal(lungs.paddle.grid.length, 3);
});

test('the grid is exactly 64 rows of 64 characters', () => {
  assert.equal(lungs.grid.length, 64);
  for (const [i, row] of lungs.grid.entries()) {
    assert.equal(row.length, 64, `row ${i} is ${row.length} characters`);
  }
});

test('the art is left-right symmetric', () => {
  for (const [i, row] of lungs.grid.entries()) {
    const mirrored = [...row].reverse().join('');
    const same = [...row].filter((ch, x) => ch === mirrored[x]).length;
    assert.ok(same / 64 > 0.9, `row ${i} is not close to symmetric`);
  }
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'levels.test.js`
Expected: FAIL — `Cannot find module .../src/levels/index.js`

- [ ] **Step 5: Write `src/levels/index.js`**

```js
import { validateLevel, LevelValidationError } from './validate.js';
import cigaretteLungs from './01-cigarette-lungs.js';

// Adding a level: import it above, then add it to this array. Nothing else.
const CANDIDATES = [
  cigaretteLungs,
];

/**
 * Validate every candidate independently. An invalid contribution is reported
 * and skipped rather than allowed to white-screen the game — one bad PR must
 * not break the levels either side of it.
 */
export function loadLevels(log = console) {
  const levels = [];
  const seen = new Set();

  for (const level of CANDIDATES) {
    try {
      validateLevel(level);
      if (seen.has(level.id)) throw new LevelValidationError(level.id, 'id', 'is already used by another level');
      seen.add(level.id);
      levels.push(level);
    } catch (error) {
      if (!(error instanceof LevelValidationError)) throw error;
      log.error(error.message);
    }
  }
  return levels;
}
```

- [ ] **Step 6: Run the whole suite**

Run: `node --test 'test/*.test.js'`
Expected: PASS. If the hits estimate is outside 80–600, adjust the `'#'` explode radius in the level (radius 1 gives ~230 hits; radius 2 gives ~85) rather than changing the validator bounds.

- [ ] **Step 7: Stage**

```bash
git add src/levels/01-cigarette-lungs.js src/levels/index.js test/levels.test.js tools/gen-lungs.mjs
```

---

### Task 14: Page shell, canvas fitting, and the block layer

All drawing code works in **backing pixels** (0–256 × 0–400), never in CSS pixels and never in fractional cells. A single transform maps backing pixels to device pixels. Positions are rounded before drawing, which is what keeps every block on the pixel grid.

Blocks are cached: 4,096 cells redrawn every frame would be wasteful on a phone, so the field is rendered to an offscreen canvas and re-rendered only when `grid.dirty` is set.

**Files:**
- Create: `index.html`, `src/render/canvas.js`, `src/render/field.js`
- Manual test only (canvas rendering is verified by looking at it)

**Interfaces:**
- Consumes: `computeFit` from `src/render/scale.js`; `CELL`, `BASE_W`, `BASE_H`, `BLOCK_PX`, `GRID_TOP` from `src/config.js`; grid accessors from `src/engine/grid.js`
- Produces:
  - `createRenderer(canvas, win) -> { ctx, fit(), clear(color), px(cells), canvas }`
  - `createFieldCache(win) -> { canvas, invalidate() }`
  - `drawField(renderer, cache, grid)`

- [ ] **Step 1: Write `index.html`**

Note every path is relative — no leading slash — so the page works identically at `http://localhost/lungs/` and at `https://<user>.github.io/lungs/`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Lungs</title>
<style>
  html, body {
    margin: 0;
    height: 100%;
    background: #000;
    overflow: hidden;
    overscroll-behavior: none;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding:
      env(safe-area-inset-top) env(safe-area-inset-right)
      env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    touch-action: none;      /* dragging the paddle must never scroll the page */
  }
</style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/render/canvas.js`**

```js
import { computeFit } from './scale.js';
import { CELL, BASE_W, BASE_H } from '../config.js';

/**
 * Owns the visible canvas. Drawing happens in backing-pixel space (256x400);
 * a transform scales that to device pixels, so callers never think about DPR.
 */
export function createRenderer(canvas, win = window) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let scale = 1;

  function fit() {
    const result = computeFit({
      viewportW: win.innerWidth,
      viewportH: win.innerHeight,
      dpr: win.devicePixelRatio || 1,
    });
    scale = result.scale;
    canvas.width = result.deviceW;
    canvas.height = result.deviceH;
    canvas.style.width = `${result.cssW}px`;
    canvas.style.height = `${result.cssH}px`;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return result;
  }

  return {
    canvas,
    ctx,
    fit,
    get scale() { return scale; },
    clear(color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    },
    /** Playfield cells -> backing pixels, snapped to the pixel grid. */
    px: (cells) => Math.round(cells * CELL),
  };
}
```

- [ ] **Step 3: Write `src/render/field.js`**

```js
import { CELL, BASE_W, BASE_H, BLOCK_PX, GRID_TOP } from '../config.js';
import { colorAt } from '../engine/grid.js';

/**
 * Offscreen cache of the block layer. Redrawing 4096 cells every frame is
 * wasteful on a phone, and the field only changes when a block is damaged.
 */
export function createFieldCache(win = window) {
  const canvas = win.document.createElement('canvas');
  canvas.width = BASE_W;
  canvas.height = BASE_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, stale: true, invalidate() { this.stale = true; } };
}

export function drawField(renderer, cache, grid) {
  if (grid.dirty) cache.stale = true;
  if (cache.stale) {
    redraw(cache, grid);
    cache.stale = false;
    grid.dirty = false;
  }
  renderer.ctx.drawImage(cache.canvas, 0, 0);
}

function redraw(cache, grid) {
  const { ctx } = cache;
  ctx.clearRect(0, 0, BASE_W, BASE_H);

  for (let gy = 0; gy < grid.rows; gy++) {
    const py = gy + GRID_TOP;
    for (let gx = 0; gx < grid.cols; gx++) {
      const color = colorAt(grid, gx, py);
      if (!color) continue;
      ctx.fillStyle = color;
      // 3px block inside a 4px cell; the 1px remainder is the grid gap.
      ctx.fillRect(gx * CELL, py * CELL, BLOCK_PX, BLOCK_PX);
    }
  }
}
```

- [ ] **Step 4: Stage**

```bash
git add index.html src/render/canvas.js src/render/field.js
```

Nothing renders yet — `src/main.js` arrives in Task 17. Verification happens there.

---

### Task 15: Entities and the HUD font

**Files:**
- Create: `src/render/entities.js`, `src/render/hud.js`
- Test: `test/hud.test.js` (the font table only — drawing is verified by eye)

**Interfaces:**
- Consumes: `charAt` from `src/engine/sprite.js`; `paddleBox` from `src/engine/paddle.js`; config constants
- Produces:
  - `drawPaddle(renderer, paddle)`, `drawBalls(renderer, balls, color)`, `drawDrops(renderer, drops)`, `drawShots(renderer, shots)`
  - `glyph(char) -> number[]` — five rows of a 3-bit bitmap
  - `textWidth(text) -> number`, `drawText(renderer, text, x, y, color)`, `drawTextCentered(renderer, text, y, color)`
  - `drawHud(renderer, { score, high, lives, level, muted })`

- [ ] **Step 1: Write the failing test**

`test/hud.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { glyph, textWidth } from '../src/render/hud.js';

test('every digit has a five-row glyph', () => {
  for (const d of '0123456789') {
    const rows = glyph(d);
    assert.equal(rows.length, 5, `digit ${d}`);
    for (const row of rows) assert.ok(row >= 0 && row <= 7, `digit ${d} row out of 3-bit range`);
  }
});

test('every letter used by the game has a glyph', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    assert.equal(glyph(ch).length, 5, `letter ${ch}`);
  }
});

test('lowercase is folded to uppercase', () => {
  assert.deepEqual(glyph('a'), glyph('A'));
});

test('a space is blank and an unknown character does not throw', () => {
  assert.deepEqual(glyph(' '), [0, 0, 0, 0, 0]);
  assert.equal(glyph('~').length, 5);
});

test('text width counts three pixels per glyph plus one of spacing', () => {
  assert.equal(textWidth('A'), 3);
  assert.equal(textWidth('AB'), 7);
  assert.equal(textWidth(''), 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'hud.test.js`
Expected: FAIL — `Cannot find module .../src/render/hud.js`

- [ ] **Step 3: Write `src/render/hud.js`**

```js
import { CELL, BASE_W, HUD_ROWS } from '../config.js';

// 3x5 bitmap font. Each glyph is five rows of three bits, MSB leftmost.
// At this size some letters are unavoidable compromises; legibility at 1x is
// what matters, not typographic beauty.
const FONT = {
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 1, 1],
  '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
  A: [7, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [7, 4, 4, 4, 7], D: [6, 5, 5, 5, 6],
  E: [7, 4, 7, 4, 7], F: [7, 4, 7, 4, 4], G: [7, 4, 5, 5, 7], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 7], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [5, 7, 7, 7, 5], O: [7, 5, 5, 5, 7], P: [7, 5, 7, 4, 4],
  Q: [7, 5, 5, 7, 3], R: [7, 5, 7, 6, 5], S: [7, 4, 7, 1, 7], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  ' ': [0, 0, 0, 0, 0], '-': [0, 0, 7, 0, 0], ':': [0, 2, 0, 2, 0], '.': [0, 0, 0, 0, 2],
};
const UNKNOWN = [7, 5, 5, 5, 7];

const GLYPH_W = 3;
const GLYPH_H = 5;
const SPACING = 1;

export function glyph(char) {
  return FONT[String(char).toUpperCase()] ?? UNKNOWN;
}

export function textWidth(text) {
  if (!text.length) return 0;
  return text.length * GLYPH_W + (text.length - 1) * SPACING;
}

/** Draw text in backing-pixel coordinates. */
export function drawText(renderer, text, x, y, color) {
  const { ctx } = renderer;
  ctx.fillStyle = color;
  let cursor = Math.round(x);

  for (const char of String(text)) {
    const rows = glyph(char);
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        if (rows[row] & (1 << (GLYPH_W - 1 - col))) ctx.fillRect(cursor + col, Math.round(y) + row, 1, 1);
      }
    }
    cursor += GLYPH_W + SPACING;
  }
}

export function drawTextCentered(renderer, text, y, color) {
  drawText(renderer, text, Math.round((BASE_W - textWidth(text)) / 2), y, color);
}

export function drawHud(renderer, { score, high, lives, level, muted }) {
  const y = 2;
  drawText(renderer, String(score).padStart(6, '0'), 3, y, '#ffffff');
  drawTextCentered(renderer, `L${level}`, y, '#8899aa');

  const highText = `HI ${high}`;
  drawText(renderer, highText, BASE_W - textWidth(highText) - 3 - 10, y, '#8899aa');

  // Lives as small squares, so no glyph is needed.
  for (let i = 0; i < lives; i++) {
    renderer.ctx.fillStyle = '#ffffff';
    renderer.ctx.fillRect(BASE_W - 3 - (i + 1) * 3, y + 1, 2, 2);
  }
  if (muted) drawText(renderer, 'M', BASE_W - 3 - 12, y, '#556677');
}

export const HUD_HEIGHT_PX = HUD_ROWS * CELL;
```

- [ ] **Step 4: Write `src/render/entities.js`**

```js
import { charAt } from '../engine/sprite.js';
import { paddleBox } from '../engine/paddle.js';
import { CELL, BLOCK_PX, BALL_SIZE, DROP_SIZE } from '../config.js';

const DROP_COLORS = {
  multiball: '#ffd23f',
  widePaddle: '#4ec9b0',
  slowBall: '#4aa3ff',
  fastBall: '#ff6b4a',
  sticky: '#c86bff',
  laser: '#ff4a7d',
};

/**
 * Draw the paddle from its character grid. The sprite is stretched horizontally
 * when a wide-paddle effect is active, so the cigarette simply gets longer
 * rather than being replaced by a different sprite.
 */
export function drawPaddle(renderer, paddle) {
  const { ctx } = renderer;
  const box = paddleBox(paddle);
  const cellW = (box.w / paddle.sprite.w) * CELL;

  for (let y = 0; y < paddle.sprite.h; y++) {
    for (let x = 0; x < paddle.sprite.w; x++) {
      const char = charAt(paddle.sprite, x, y);
      if (!char) continue;
      ctx.fillStyle = paddle.colors[char];
      const left = Math.round(box.x * CELL + x * cellW);
      const right = Math.round(box.x * CELL + (x + 1) * cellW);
      ctx.fillRect(left, Math.round((box.y + y) * CELL), Math.max(1, right - left - 1), BLOCK_PX);
    }
  }
}

export function drawBalls(renderer, balls, color) {
  const { ctx } = renderer;
  ctx.fillStyle = color;
  for (const ball of balls) {
    ctx.fillRect(Math.round(ball.x * CELL), Math.round(ball.y * CELL), BALL_SIZE * CELL - 1, BALL_SIZE * CELL - 1);
  }
}

export function drawDrops(renderer, drops) {
  const { ctx } = renderer;
  for (const drop of drops) {
    ctx.fillStyle = DROP_COLORS[drop.kind] ?? '#ffffff';
    ctx.fillRect(Math.round(drop.x * CELL), Math.round(drop.y * CELL), DROP_SIZE * CELL - 1, DROP_SIZE * CELL - 1);
  }
}

export function drawShots(renderer, shots) {
  const { ctx } = renderer;
  ctx.fillStyle = DROP_COLORS.laser;
  for (const shot of shots) {
    ctx.fillRect(Math.round(shot.x * CELL) + 1, Math.round(shot.y * CELL), 1, CELL * 2);
  }
}

export { DROP_COLORS };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'hud.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 6: Stage**

```bash
git add src/render/entities.js src/render/hud.js test/hud.test.js
```

---

### Task 16: Input

Three devices collapse into one intent object so nothing downstream knows which was used. Mouse steering is **absolute** (the paddle centres on the cursor); touch steering is **relative** (the paddle moves by the finger's displacement), because on a phone an absolute mapping puts the player's thumb on top of the paddle they are aiming with.

`action` and `mute` are edge-triggered: reading them consumes the press, so one tap fires one shot.

**Files:**
- Create: `src/input.js`
- Test: `test/input.test.js` (the pure coordinate helper only)

**Interfaces:**
- Produces:
  - `clientXToCell(clientX, rect) -> number` — pure, testable
  - `createInput(canvas, win) -> { read(), dispose() }`
  - `read() -> { moveDir, pointerCenter: number|null, dragDelta: number, action: boolean, mute: boolean }`

- [ ] **Step 1: Write the failing test**

`test/input.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { clientXToCell } from '../src/input.js';
import { FIELD_W } from '../src/config.js';

const rect = { left: 100, width: 512 };

test('the left edge of the canvas maps to cell 0', () => {
  assert.equal(clientXToCell(100, rect), 0);
});

test('the right edge maps to the field width', () => {
  assert.equal(clientXToCell(612, rect), FIELD_W);
});

test('the centre maps to the middle of the field', () => {
  assert.equal(clientXToCell(356, rect), FIELD_W / 2);
});

test('the canvas offset on the page is accounted for', () => {
  assert.equal(clientXToCell(100, { left: 0, width: 512 }), FIELD_W * (100 / 512));
});

test('a zero-width rect does not produce NaN', () => {
  assert.equal(clientXToCell(50, { left: 0, width: 0 }), 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'input.test.js`
Expected: FAIL — `Cannot find module .../src/input.js`

- [ ] **Step 3: Write `src/input.js`**

```js
import { FIELD_W } from './config.js';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);

/** Pure: a client X coordinate and the canvas rect give a playfield cell. */
export function clientXToCell(clientX, rect) {
  if (!rect.width) return 0;
  return ((clientX - rect.left) / rect.width) * FIELD_W;
}

export function createInput(canvas, win = window) {
  const held = new Set();
  const state = { pointerCenter: null, dragDelta: 0, action: false, mute: false };
  let dragging = false;
  let lastDragCell = 0;

  const onKeyDown = (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space') { state.action = true; event.preventDefault(); }
    if (event.code === 'KeyM') state.mute = true;
  };
  const onKeyUp = (event) => held.delete(event.code);

  const onMouseMove = (event) => {
    state.pointerCenter = clientXToCell(event.clientX, canvas.getBoundingClientRect());
  };
  const onMouseDown = () => { state.action = true; };

  const onTouchStart = (event) => {
    dragging = true;
    lastDragCell = clientXToCell(event.touches[0].clientX, canvas.getBoundingClientRect());
    state.action = true;
    event.preventDefault();
  };
  const onTouchMove = (event) => {
    if (!dragging) return;
    const cell = clientXToCell(event.touches[0].clientX, canvas.getBoundingClientRect());
    // Relative, not absolute: the paddle must not sit under the player's thumb.
    state.dragDelta += cell - lastDragCell;
    lastDragCell = cell;
    event.preventDefault();
  };
  const onTouchEnd = () => { dragging = false; };

  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);

  return {
    /** Reading consumes the edge-triggered presses, so one tap is one action. */
    read() {
      let moveDir = 0;
      for (const code of held) {
        if (LEFT_KEYS.has(code)) moveDir -= 1;
        if (RIGHT_KEYS.has(code)) moveDir += 1;
      }
      const intent = {
        moveDir: Math.sign(moveDir),
        pointerCenter: state.pointerCenter,
        dragDelta: state.dragDelta,
        action: state.action,
        mute: state.mute,
      };
      state.pointerCenter = null;
      state.dragDelta = 0;
      state.action = false;
      state.mute = false;
      return intent;
    },
    dispose() {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test 'test/*.test.js'input.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Stage**

```bash
git add src/input.js test/input.test.js
```

---

### Task 17: Audio

Built before the game loop so the loop can call it from the start. The whole module is written around one constraint: **`assets/sfx/` is empty**, and the game must be completely playable that way.

**Files:**
- Create: `src/audio.js`
- Manual test (no DOM audio under Node)

**Interfaces:**
- Consumes: `SFX_NAMES`, `SFX_PATH`, `SFX_POOL_SIZE`, `SFX_RETRIGGER_MS`, `KEY_MUTED` from `src/config.js`; a storage object from `src/storage.js`
- Produces: `createAudio(storage, win) -> { play(name), toggleMute(), get muted() }`

- [ ] **Step 1: Write `src/audio.js`**

```js
import { SFX_NAMES, SFX_PATH, SFX_POOL_SIZE, SFX_RETRIGGER_MS, KEY_MUTED } from './config.js';

/**
 * Sound effects, all optional.
 *
 * assets/sfx/ ships empty: a missing file marks its effect unavailable and is
 * reported once at debug level. A 404 must never throw, never repeat, and never
 * interrupt a frame.
 *
 * Each effect keeps a small pool of elements because a single Audio element
 * will not restart while it is already playing — and a chain explosion can
 * break forty blocks in one frame. The retrigger cooldown then collapses that
 * into one solid sound instead of forty clipped copies.
 */
export function createAudio(storage, win = window) {
  const effects = new Map();
  let muted = storage.getBool(KEY_MUTED, false);

  for (const name of SFX_NAMES) {
    effects.set(name, { pool: [], next: 0, lastPlayed: -Infinity, available: true, warned: false });
  }

  function load(name, effect) {
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const element = new win.Audio(`${SFX_PATH}${name}.wav`);
      element.preload = 'auto';
      element.addEventListener('error', () => {
        effect.available = false;
        if (!effect.warned) {
          effect.warned = true;
          win.console?.debug?.(`[lungs] no sound file for "${name}" — continuing silently`);
        }
      });
      effect.pool.push(element);
    }
  }

  for (const [name, effect] of effects) load(name, effect);

  return {
    get muted() { return muted; },

    toggleMute() {
      muted = !muted;
      storage.setBool(KEY_MUTED, muted);
      return muted;
    },

    play(name) {
      if (muted) return;
      const effect = effects.get(name);
      if (!effect || !effect.available) return;

      const now = win.performance?.now?.() ?? Date.now();
      if (now - effect.lastPlayed < SFX_RETRIGGER_MS) return;
      effect.lastPlayed = now;

      const element = effect.pool[effect.next];
      effect.next = (effect.next + 1) % effect.pool.length;
      try {
        element.currentTime = 0;
        // Autoplay policy rejects until a user gesture; the title screen supplies one.
        element.play()?.catch(() => {});
      } catch {
        effect.available = false;
      }
    },
  };
}
```

- [ ] **Step 2: Stage**

```bash
git add src/audio.js
```

---

### Task 18: The game — state machine, rules, and the loop

The milestone where it becomes playable. `game.js` holds the rules and owns no DOM; `main.js` is the only file that touches `document`.

**Files:**
- Create: `src/game.js`, `src/render/screens.js`, `src/main.js`
- Test: `test/game.test.js`

**Interfaces:**
- Consumes: every engine module, plus `loadLevels`, `createStorage`, `createAudio`, `createInput`, the renderers
- Produces:
  - `createGame({ levels, storage, audio }) -> game` with `game.update(dt, intent)` and readable fields `state, score, high, lives, levelIndex, grid, paddle, balls, drops, shots, effects`
  - `NEUTRAL_INTENT` — an intent with nothing pressed, for substeps after the first
  - `drawScreens(renderer, game)`

- [ ] **Step 1: Write the failing test**

`test/game.test.js`. The game is driven with synthetic intents, which is only possible because `game.js` has no DOM dependency.

```js
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
  id: 'unit', item: 'I', target: 'T', background: '#000000', ballColor: '#ffffff',
  types: { '#': { color: '#fff', hp: 1, points: 10 } },
  grid: [...Array(64)].map((_, i) => (i < 3 ? row('#') : row('.'))),
  paddle: { colors: { W: '#fff' }, grid: ['WWWWWWWWWWWWWWWW'] },
  ...overrides,
});

const press = { ...NEUTRAL_INTENT, action: true };
const game = (levels = [testLevel()]) => createGame({ levels, storage: memoryStorage(), audio: silentAudio });

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
  g.balls[0].y = DRAIN_ROW - 0.01;
  g.balls[0].vy = Math.abs(g.balls[0].vy);
  g.balls[0].vx = 0;
  g.update(STEP, NEUTRAL_INTENT);
  assert.equal(g.state, 'lifeLost');
  assert.equal(g.lives, LIVES - 1);
});

test('the run ends when the last life is lost', () => {
  const g = game();
  g.update(STEP, press);
  for (let life = 0; life < LIVES; life++) {
    g.update(STEP, press);
    g.balls[0].y = DRAIN_ROW - 0.01;
    g.balls[0].vy = Math.abs(g.balls[0].vy);
    g.update(STEP, NEUTRAL_INTENT);
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

  g.balls[0].y = DRAIN_ROW - 0.01;
  g.balls[0].vy = Math.abs(g.balls[0].vy);
  g.update(STEP, NEUTRAL_INTENT);
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test 'test/*.test.js'game.test.js`
Expected: FAIL — `Cannot find module .../src/game.js`

- [ ] **Step 3: Write `src/game.js`**

```js
import { createGrid, blocksAt, damageAt, isCleared } from './engine/grid.js';
import { detonate } from './engine/explode.js';
import { createBall, stepBall, ballSpeed, setBallAngle } from './engine/ball.js';
import {
  createPaddle, paddleBox, movePaddle, setPaddleCenter, setPaddleScale,
  ballHitsPaddle, deflect,
} from './engine/paddle.js';
import { createEffects, applyEffect, tickEffects, hasEffect, clearEffects } from './engine/effects.js';
import { rollPowerup, createDrop, stepDrops } from './engine/powerups.js';
import { createShot, stepShots } from './engine/lasers.js';
import * as C from './config.js';

export const NEUTRAL_INTENT = {
  moveDir: 0, pointerCenter: null, dragDelta: 0, action: false, mute: false,
};

export function createGame({ levels, storage, audio }) {
  const game = {
    state: levels.length ? 'title' : 'error',
    score: 0,
    high: storage.getNumber(C.KEY_HIGHSCORE, 0),
    lives: C.LIVES,
    levelIndex: 0,
    level: null,
    grid: null,
    paddle: null,
    balls: [],
    drops: [],
    shots: [],
    effects: createEffects(),
    hold: 0,
    initialBlocks: 1,
    laserCooldown: 0,
    update,
    // Test seams. They mutate the same state the game does, nothing more.
    hitCell,
    clearGridForTest() { game.grid.remaining = 0; },
    endRunForTest: endRun,
  };

  function loadLevel(index) {
    game.level = levels[index];
    game.grid = createGrid(game.level);
    game.paddle = createPaddle(game.level);
    game.initialBlocks = Math.max(1, game.grid.remaining);
    resetForServe();
  }

  function resetForServe() {
    clearEffects(game.effects);
    setPaddleScale(game.paddle, 1);
    setPaddleCenter(game.paddle, C.FIELD_W / 2);
    game.drops = [];
    game.shots = [];
    game.laserCooldown = 0;

    const box = paddleBox(game.paddle);
    const ball = createBall(box.x + box.w / 2 - C.BALL_SIZE / 2, box.y - C.BALL_SIZE, targetSpeed(), 0);
    ball.stuck = true;
    ball.stickOffset = ball.x - game.paddle.x;
    game.balls = [ball];
    game.state = 'serve';
  }

  const clearedFraction = () => 1 - game.grid.remaining / game.initialBlocks;

  function targetSpeed() {
    const ramp = 1 + C.BALL_SPEED_RAMP * clearedFraction();
    const effect = hasEffect(game.effects, 'slowBall') ? C.SLOW_BALL_MUL
      : hasEffect(game.effects, 'fastBall') ? C.FAST_BALL_MUL : 1;
    return C.BALL_SPEED * ramp * effect;
  }

  const scoreMultiplier = () => (hasEffect(game.effects, 'fastBall') ? C.FAST_BALL_SCORE_MUL : 1);

  function update(dt, intent) {
    if (game.state === 'error') return;
    if (intent.mute) audio.toggleMute();

    switch (game.state) {
      case 'title':
        if (intent.action) startRun();
        break;
      case 'serve':
        steer(intent, dt);
        followPaddle();
        if (intent.action) launch();
        break;
      case 'playing':
        steer(intent, dt);
        play(dt, intent);
        break;
      case 'lifeLost':
      case 'levelClear':
        game.hold -= dt;
        if (game.hold <= 0) (game.state === 'lifeLost' ? afterLifeLost : afterLevelClear)();
        break;
      case 'gameOver':
      case 'win':
        if (intent.action) game.state = 'title';
        break;
    }
  }

  function startRun() {
    game.score = 0;
    game.lives = C.LIVES;
    game.levelIndex = 0;
    loadLevel(0);
  }

  function steer(intent, dt) {
    if (intent.moveDir) movePaddle(game.paddle, intent.moveDir, dt);
    if (intent.pointerCenter !== null) setPaddleCenter(game.paddle, intent.pointerCenter);
    if (intent.dragDelta) setPaddleCenter(game.paddle, game.paddle.x + paddleBox(game.paddle).w / 2 + intent.dragDelta);
  }

  function followPaddle() {
    const box = paddleBox(game.paddle);
    for (const ball of game.balls) {
      if (!ball.stuck) continue;
      ball.x = Math.min(Math.max(game.paddle.x + ball.stickOffset, 0), C.FIELD_W - C.BALL_SIZE);
      ball.y = box.y - C.BALL_SIZE;
    }
  }

  function launch() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    for (const ball of game.balls) {
      ball.stuck = false;
      setBallAngle(ball, direction * C.SERVE_ANGLE, targetSpeed());
    }
    game.state = 'playing';
  }

  function play(dt, intent) {
    for (const kind of tickEffects(game.effects, dt)) {
      if (kind === 'widePaddle') setPaddleScale(game.paddle, 1);
      if (kind === 'sticky') releaseStuck();
    }
    game.laserCooldown = Math.max(0, game.laserCooldown - dt);
    if (intent.action) handleAction();

    followPaddle();
    stepBalls(dt);
    stepPowerups(dt);
    stepLasers(dt);

    if (isCleared(game.grid)) {
      audio.play('level-clear');
      game.state = 'levelClear';
      game.hold = C.LEVEL_CLEAR_HOLD;
    }
  }

  /** Space is overloaded: release a held ball first, otherwise fire. */
  function handleAction() {
    if (game.balls.some((ball) => ball.stuck)) {
      releaseStuck();
      return;
    }
    if (hasEffect(game.effects, 'laser') && game.laserCooldown <= 0) {
      const box = paddleBox(game.paddle);
      game.shots.push(createShot(box.x + 1, box.y), createShot(box.x + box.w - 1, box.y));
      game.laserCooldown = C.LASER_COOLDOWN;
      audio.play('laser');
    }
  }

  function releaseStuck() {
    for (const ball of game.balls) {
      if (!ball.stuck) continue;
      ball.stuck = false;
      setBallAngle(ball, 0, targetSpeed());
      deflect(ball, game.paddle);
    }
  }

  function stepBalls(dt) {
    const speed = targetSpeed();
    const world = {
      isBlocked: (cx, cy) => blocksAt(game.grid, cx, cy),
      onHitCell: hitCell,
      onWall: () => audio.play('bounce-wall'),
    };

    const survivors = [];
    for (const ball of game.balls) {
      if (!ball.stuck) setBallAngle(ball, Math.atan2(ball.vx, -ball.vy), speed);
      const { drained } = stepBall(ball, dt, world);
      if (drained) continue;

      if (ballHitsPaddle(ball, game.paddle)) {
        if (hasEffect(game.effects, 'sticky')) {
          ball.stuck = true;
          ball.stickOffset = ball.x - game.paddle.x;
          ball.y = paddleBox(game.paddle).y - C.BALL_SIZE;
        } else {
          ball.y = paddleBox(game.paddle).y - C.BALL_SIZE;
          deflect(ball, game.paddle);
        }
        audio.play('bounce-paddle');
      }
      survivors.push(ball);
    }
    game.balls = survivors;

    if (game.balls.length === 0) loseLife();
  }

  function hitCell(cx, cy) {
    const hit = damageAt(game.grid, cx, cy);
    if (!hit) return;

    if (!hit.destroyed) {
      audio.play('block-hit');
      return;
    }
    game.score += hit.points * scoreMultiplier();
    audio.play('block-break');
    maybeDrop(hit);

    if (hit.spec?.explode) {
      const blast = detonate(game.grid, cx, cy, hit.spec.explode, hit.spec.chain !== false);
      game.score += blast.points * scoreMultiplier();
      for (const cell of blast.cells) maybeDrop(cell);
      if (blast.cells.length > 0) audio.play('explode');
    }
  }

  function maybeDrop(hit) {
    const kind = rollPowerup(hit.spec);
    if (kind) game.drops.push(createDrop(kind, hit.px, hit.py));
  }

  function stepPowerups(dt) {
    const { drops, caught } = stepDrops(game.drops, dt, game.paddle);
    game.drops = drops;
    for (const kind of caught) {
      audio.play('powerup-catch');
      grantPowerup(kind);
    }
  }

  function grantPowerup(kind) {
    if (kind === 'multiball') {
      splitBalls();
      return;
    }
    applyEffect(game.effects, kind);
    if (kind === 'widePaddle') setPaddleScale(game.paddle, C.WIDE_PADDLE_SCALE);
  }

  function splitBalls() {
    const extra = [];
    for (const ball of game.balls) {
      if (game.balls.length + extra.length >= C.MAX_BALLS) break;
      const angle = Math.atan2(ball.vx, -ball.vy);
      for (const delta of [-C.MULTIBALL_SPREAD, C.MULTIBALL_SPREAD]) {
        if (game.balls.length + extra.length >= C.MAX_BALLS) break;
        const clone = createBall(ball.x, ball.y, ballSpeed(ball), angle + delta);
        extra.push(clone);
      }
    }
    game.balls.push(...extra);
  }

  function stepLasers(dt) {
    const { shots, hits } = stepShots(game.shots, dt, (cx, cy) => blocksAt(game.grid, cx, cy));
    game.shots = shots;
    for (const [cx, cy] of hits) hitCell(cx, cy);
  }

  function loseLife() {
    game.lives -= 1;
    audio.play('life-lost');
    game.state = 'lifeLost';
    game.hold = C.LIFE_LOST_HOLD;
  }

  function afterLifeLost() {
    if (game.lives <= 0) {
      audio.play('game-over');
      endRun();
      game.state = 'gameOver';
      return;
    }
    resetForServe();      // block damage is deliberately not reset
  }

  function afterLevelClear() {
    game.levelIndex += 1;
    if (game.levelIndex >= levels.length) {
      endRun();
      game.state = 'win';
      return;
    }
    loadLevel(game.levelIndex);
  }

  function endRun() {
    if (game.score > game.high) {
      game.high = game.score;
      storage.setNumber(C.KEY_HIGHSCORE, game.high);
    }
  }

  return game;
}
```

- [ ] **Step 4: Write `src/render/screens.js`**

```js
import { drawTextCentered } from './hud.js';
import { BASE_W, BASE_H } from '../config.js';

// The only text the game shows beyond the HUD. No commentary, per the design:
// status and prompts only.
export function drawScreens(renderer, game) {
  const { ctx } = renderer;
  // BASE_W, not canvas.width: the context is transformed into backing-pixel
  // space, so canvas.width (device pixels) would overdraw by the scale factor.
  const dim = (alpha) => {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  };

  switch (game.state) {
    case 'title':
      dim(0.55);
      drawTextCentered(renderer, 'PRESS SPACE OR TAP', BASE_H / 2 - 3, '#ffffff');
      drawTextCentered(renderer, `HI ${game.high}`, BASE_H / 2 + 8, '#8899aa');
      break;
    case 'serve':
      drawTextCentered(renderer, 'PRESS SPACE OR TAP', BASE_H - 24, '#66788a');
      break;
    case 'gameOver':
      dim(0.6);
      drawTextCentered(renderer, 'GAME OVER', BASE_H / 2 - 10, '#ffffff');
      drawTextCentered(renderer, String(game.score), BASE_H / 2 + 2, '#ffffff');
      drawTextCentered(renderer, 'PRESS SPACE OR TAP', BASE_H / 2 + 14, '#8899aa');
      break;
    case 'win':
      dim(0.6);
      drawTextCentered(renderer, 'CLEARED', BASE_H / 2 - 10, '#ffffff');
      drawTextCentered(renderer, String(game.score), BASE_H / 2 + 2, '#ffffff');
      drawTextCentered(renderer, 'PRESS SPACE OR TAP', BASE_H / 2 + 14, '#8899aa');
      break;
    case 'error':
      drawTextCentered(renderer, 'NO VALID LEVELS', BASE_H / 2 - 4, '#ff5030');
      drawTextCentered(renderer, 'SEE CONSOLE', BASE_H / 2 + 6, '#8899aa');
      break;
    default:
      break;
  }
}
```

- [ ] **Step 5: Write `src/main.js`**

```js
import { createRenderer } from './render/canvas.js';
import { createFieldCache, drawField } from './render/field.js';
import { drawPaddle, drawBalls, drawDrops, drawShots } from './render/entities.js';
import { drawHud } from './render/hud.js';
import { drawScreens } from './render/screens.js';
import { createInput } from './input.js';
import { createStorage } from './storage.js';
import { createAudio } from './audio.js';
import { loadLevels } from './levels/index.js';
import { createGame, NEUTRAL_INTENT } from './game.js';
import { STEP, MAX_STEPS_PER_FRAME } from './config.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas, window);
const fieldCache = createFieldCache(window);
const storage = createStorage(window.localStorage);
const audio = createAudio(storage, window);
const input = createInput(canvas, window);
const game = createGame({ levels: loadLevels(), storage, audio });

renderer.fit();
window.addEventListener('resize', () => renderer.fit());
window.addEventListener('orientationchange', () => renderer.fit());

let accumulator = 0;
let previous = performance.now();

function frame(now) {
  const elapsed = Math.min(0.25, (now - previous) / 1000);
  previous = now;
  accumulator += elapsed;

  // Edge-triggered presses must fire on exactly one substep, never on all of them.
  let intent = input.read();
  let steps = 0;
  while (accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
    game.update(STEP, intent);
    intent = NEUTRAL_INTENT;
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

  render();
  requestAnimationFrame(frame);
}

function render() {
  renderer.clear(game.level?.background ?? '#000000');
  if (game.grid) {
    drawField(renderer, fieldCache, game.grid);
    drawPaddle(renderer, game.paddle);
    drawBalls(renderer, game.balls, game.level.ballColor);
    drawDrops(renderer, game.drops);
    drawShots(renderer, game.shots);
    drawHud(renderer, {
      score: game.score, high: game.high, lives: game.lives,
      level: game.levelIndex + 1, muted: audio.muted,
    });
  }
  drawScreens(renderer, game);
}

requestAnimationFrame(frame);
```

- [ ] **Step 6: Run the whole suite**

Run: `node --test 'test/*.test.js'`
Expected: PASS across every test file.

- [ ] **Step 7: Play it**

Open http://localhost/lungs/ and confirm:
- the lungs render as a fine grid of white squares on black, with the darker bronchial tree
- the cigarette paddle tracks the mouse, and Space serves
- the ball tunnels a visible 3×3 pocket through the tissue on each hit
- an orange core produces a large blast that does **not** cascade across the whole lung
- drops fall, are catchable, and their effects are visible (wide paddle stretches the cigarette; multiball splits; laser fires on Space)
- the HUD shows score, level and lives; `M` toggles the mute marker
- resizing the window keeps the canvas pixel-sharp with no blurring
- in device emulation at 390×844, the canvas nearly fills the screen and dragging never scrolls the page

- [ ] **Step 8: Stage**

```bash
git add src/game.js src/render/screens.js src/main.js test/game.test.js
```

---

### Task 19: Documentation

Written against the shipped level as a worked example, because a contributor learns the format faster from a real file than from a schema.

**Files:**
- Create: `README.md`, `docs/ADDING_A_LEVEL.md`

- [ ] **Step 1: Write `README.md`**

Cover, in this order: what the game is (one paragraph, no moralising — it is a breakout where the paddle threatens the blocks); how to play (arrows/mouse/touch, Space serves and fires, M mutes); how to run it locally (`http://localhost/lungs/` via the `dev-web` container, or any static server — **not** `file://`, because ES modules need HTTP); how to run tests (`node --test 'test/*.test.js'`, Node 18+, no dependencies); a pointer to `docs/ADDING_A_LEVEL.md`; and a note that `assets/sfx/` is empty by design and the game runs silently until `.wav` files with the documented names are added.

- [ ] **Step 2: Write `docs/ADDING_A_LEVEL.md`**

This is the contributor-facing document. It must contain:

1. **The three-step summary:** create `src/levels/NN-item-target.js`, import it in `src/levels/index.js`, add it to `CANDIDATES`. Nothing else changes.
2. **The full annotated schema** — every field from the block-type table, with the exact meaning of `hp`, `damage` (index 0 is full health, descending), `explode`, `chain`, `powerup`, `solid`, and `points`.
3. **Level length, the section that matters most.** State the arithmetic plainly:

   > `hits ≈ filled cells ÷ (2·radius + 1)²`
   >
   > A 64×64 silhouette easily holds 1,500 cells. At one hit per cell that is an
   > unplayable level, so give your bulk block an `explode` radius: radius 1
   > clears a 3×3 pocket per hit and divides the work by 9.
   >
   > Set `chain: false` on the bulk block. Without it, a level dense in explosive
   > blocks percolates — one lucky hit cascades across the entire shape and clears
   > it instantly. Keep chaining for sparse, large-radius feature blocks only.
   >
   > The validator rejects anything outside 80–600 estimated hits.

4. **Drawing the art:** 64 rows of exactly 64 characters, `.` or space for empty. Note that `tools/gen-lungs.mjs` shows one way to generate a shape mathematically, but hand-drawing in an editor with a fixed-width font is equally valid.
5. **Drawing the paddle:** the grid is up to 64×48 of authoring room; only the filled area counts. The trimmed result must be 10–24 cells wide and at most 8 tall, and that bounding box is the collision box.
6. **The validator as your first reviewer:** run `node --test 'test/*.test.js'levels.test.js`; every error names the level and the field.
7. **What is out of scope for a level:** sounds are global, and no level may display text.

- [ ] **Step 3: Verify the documented commands actually work**

Run each command quoted in both documents and confirm the output matches what the document claims. A README whose commands fail is worse than no README.

- [ ] **Step 4: Stage**

```bash
git add README.md docs/ADDING_A_LEVEL.md
```

---

### Task 20: Levels two to four

The proof the format holds: three levels added without touching a single engine file. If any of these requires an engine change, that is a finding worth reporting rather than a change to make quietly.

**Files:**
- Create: `src/levels/02-bottle-liver.js`, `src/levels/03-phone-brain.js`, `src/levels/04-car-iceberg.js`
- Create: `tools/gen-shapes.mjs` (generators for the three silhouettes, alongside `gen-lungs.mjs`)
- Modify: `src/levels/index.js` (three imports, three array entries)
- Modify: `test/levels.test.js` (assert every registered level validates)

**Interfaces:**
- Consumes: the level schema from Task 13. **No engine changes.**

- [ ] **Step 1: Generalise the test to cover every level**

Replace the single-level assertions in `test/levels.test.js` with a loop, so each new level is checked automatically:

```js
import { loadLevels } from '../src/levels/index.js';
import { validateLevel, estimateHitsToClear } from '../src/levels/validate.js';

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
```

- [ ] **Step 2: Write `tools/gen-shapes.mjs`**

Follow the structure of `tools/gen-lungs.mjs`: build each silhouette from ellipse and polygon tests over a 64×64 field, despeckle by dropping cells with fewer than two orthogonal neighbours, print the rows. Silhouettes, chosen to stay readable at 64×64:

- **Liver** — a wedge, wide and rounded on the left, tapering right, with a notch dividing the two lobes. Bulk `#` in deep red, a `B` vein structure branching from the lower centre.
- **Brain** — a rounded mass with a flat underside, a vertical fissure down the middle, and horizontal gyri furrows cut every four rows to read as convolutions. Bulk in pink, `B` for the brain stem.
- **Iceberg** — a small jagged peak above a waterline around row 22 and a large rounded mass below it. Bulk in pale blue above and a darker blue below (two separate block characters), which also lets the underwater portion be tougher.

- [ ] **Step 3: Write the three level files**

Each follows the Task 13 template exactly. The invariants for every one:

- Bulk block: `{ hp: 1, explode: 1, chain: false }` — this is what keeps the level to roughly 200 hits.
- Feature block: sparse, `explode: 3` or `4`, chaining, for spectacle.
- One block type with `powerup` between `0.25` and `0.4`.
- Paddle trimmed to 10–24 wide, at most 8 tall, drawn in the level's own palette:
  - **Bottle** — a tall-necked bottle lying on its side, roughly 18×4, green glass with a lighter label band.
  - **Phone** — a rounded rectangle, roughly 12×5, dark body with a lit screen band.
  - **Car** — a side profile, roughly 20×6, body colour with two darker wheels and a window.

- [ ] **Step 4: Register them in `src/levels/index.js`**

```js
import cigaretteLungs from './01-cigarette-lungs.js';
import bottleLiver from './02-bottle-liver.js';
import phoneBrain from './03-phone-brain.js';
import carIceberg from './04-car-iceberg.js';

const CANDIDATES = [cigaretteLungs, bottleLiver, phoneBrain, carIceberg];
```

- [ ] **Step 5: Run the suite**

Run: `node --test 'test/*.test.js'`
Expected: PASS. Any `LevelValidationError` names the level and field; fix the level, not the validator.

- [ ] **Step 6: Play every level**

At http://localhost/lungs/, clear each level and confirm the silhouette is recognisable in motion, the paddle reads as the item, and no level drags. If one drags, raise its bulk `explode` radius rather than deleting blocks.

- [ ] **Step 7: Stage**

```bash
git add src/levels/ tools/gen-shapes.mjs test/levels.test.js
```

---

## Plan self-review

**Spec coverage.** Every section of the design maps to a task: hosting and relative paths (Task 14), geometry and device-pixel scaling (Tasks 1, 12, 14), level format (Tasks 2, 13), validator rules including the hits estimate (Tasks 3, 4), module layout (all), physics and substepping (Tasks 7, 8), paddle deflection (Task 9), explosions and `chain` (Task 6), powerups and effects (Tasks 10, 11, 18), game state and lives (Task 18), input including touch (Task 16), mobile fit (Tasks 12, 14, 16), high score (Tasks 12, 18), sound with an empty `assets/sfx/` (Task 17), testing (throughout), documentation (Task 19), levels 2–4 (Task 20).

**Known gaps, stated rather than hidden.**

- **Rendering, audio and touch have no automated tests.** Only their pure parts — `computeFit`, `clientXToCell`, the font table, `createStorage` — are covered. Canvas output and audio playback are verified by playing the game. This is a deliberate trade to avoid a headless-browser dependency in a project whose whole premise is no dependencies.
- **The hits estimate is an approximation.** It ignores ball trajectory, so a level with a hard-to-reach pocket can pass validation and still play long. It catches the order-of-magnitude mistake, which is the one that matters.
- **`splitBalls` clones balls at the same position.** With three balls at identical coordinates and different angles they separate immediately, but a ball spawned inside a carved tunnel can clip a wall on its first substep. Acceptable; note it if it looks wrong in play.

**Type consistency.** `hitCell(cx, cy)` is used identically in `stepBalls`, `stepLasers` and the tests. `paddleBox` returns `{x, y, w, h}` everywhere. `Hit` carries `{px, py, spec, destroyed, points}` from `grid.js` through `explode.js` into `maybeDrop`. `stepDrops` and `stepShots` both return `{<collection>, <events>}`. Grid accessors take playfield coordinates in every call site.
