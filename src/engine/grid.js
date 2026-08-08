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
