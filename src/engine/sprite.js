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
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;

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
