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

export const MIN_HITS = 80;
export const MAX_HITS = 600;

/** The HUD centre sits between the score and the high score; 24 chars clears both. */
export const MAX_TITLE_LENGTH = 24;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isValidColor = (v) => typeof v === 'string' && HEX.test(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

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

export function validateLevel(level) {
  const id = isText(level?.id) ? level.id : '<unnamed>';
  const fail = (field, message) => { throw new LevelValidationError(id, field, message); };

  if (!isText(level?.id)) fail('id', 'must be a non-empty string');
  if (!isText(level.title)) fail('title', 'must be a non-empty string — it is shown in the HUD');
  if (level.title.length > MAX_TITLE_LENGTH) {
    fail('title', `is ${level.title.length} characters; the HUD fits ${MAX_TITLE_LENGTH}`);
  }
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
    if (spec.chain !== undefined && typeof spec.chain !== 'boolean') {
      fail(at('.chain'), `expected true or false, got ${JSON.stringify(spec.chain)}`);
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

  const hits = estimateHitsToClear(level);
  if (hits < MIN_HITS) {
    fail('grid', `clears in about ${Math.round(hits)} hits, which is too short (minimum ${MIN_HITS}). Add more blocks, more hit points, or a smaller explode radius.`);
  }
  if (hits > MAX_HITS) {
    fail('grid', `takes about ${Math.round(hits)} hits to clear, which is too long (maximum ${MAX_HITS}). Give the bulk blocks an explode radius — hits fall by roughly (2r+1)^2.`);
  }
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
