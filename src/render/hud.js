import { BASE_W } from '../config.js';

/**
 * 3x5 bitmap font.
 *
 * A glyph is five numbers, one per row, top to bottom. Each number is 0-7 —
 * three bits, one per column — and the bits read left to right from the most
 * significant, because the draw loop below tests `1 << (GLYPH_W - 1 - col)`.
 * So the number *is* the row of pixels, written in binary:
 *
 *     0 = 000 = · · ·        4 = 100 = # · ·
 *     1 = 001 = · · #        5 = 101 = # · #
 *     2 = 010 = · # ·        6 = 110 = # # ·
 *     3 = 011 = · # #        7 = 111 = # # #
 *
 * To read a glyph, write its five numbers as three binary digits and stack
 * them. To add one, draw it on a 3x5 grid and read each row back as binary:
 *
 *     A: [7,5,7,5,5]      1: [2,6,2,2,7]      ?: [7,1,2,0,2]
 *        7 -> # # #          2 -> · # ·          7 -> # # #
 *        5 -> # · #          6 -> # # ·          1 -> · · #
 *        7 -> # # #          2 -> · # ·          2 -> · # ·
 *        5 -> # · #          2 -> · # ·          0 -> · · ·
 *        5 -> # · #          7 -> # # #          2 -> · # ·
 *
 * Exactly five entries, every value 0-7 — both are pinned by tests, because a
 * sixth row or an 8 would draw wrong rather than throw.
 *
 * At this size some glyphs are unavoidable compromises; legibility at 1x is
 * what matters, not typographic beauty. Note that `0` and `O` are necessarily
 * identical: there is no room to distinguish them, since a centre-dotted zero
 * would be [7,5,7,5,7], which is already `8`. Anywhere a digit could be read
 * as a letter, space it — the HUD writes `HI 0`, not `HI0`.
 */
const FONT = {
  0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [7, 1, 7, 4, 7], 3: [7, 1, 7, 1, 7],
  4: [5, 5, 7, 1, 1], 5: [7, 4, 7, 1, 7], 6: [7, 4, 7, 5, 7], 7: [7, 1, 1, 1, 1],
  8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 7],
  A: [7, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [7, 4, 4, 4, 7], D: [6, 5, 5, 5, 6],
  E: [7, 4, 7, 4, 7], F: [7, 4, 7, 4, 4], G: [7, 4, 5, 5, 7], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 7], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [5, 7, 7, 7, 5], O: [7, 5, 5, 5, 7], P: [7, 5, 7, 4, 4],
  Q: [7, 5, 5, 7, 3], R: [7, 5, 7, 6, 5], S: [7, 4, 7, 1, 7], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  ' ': [0, 0, 0, 0, 0], '-': [0, 0, 7, 0, 0], ':': [0, 2, 0, 2, 0], '.': [0, 0, 0, 0, 2],
  '!': [2, 2, 2, 0, 2], '?': [7, 1, 2, 0, 2], ',': [0, 0, 0, 2, 4],
  '"': [5, 5, 0, 0, 0], "'": [2, 2, 0, 0, 0],
  // '@' is the one glyph 3x5 cannot really hold: a ring, an inner mark and a
  // tail need more width. This is a closed ring dropping into a tail that
  // swings right — the silhouette reads as @ in context, not in isolation.
  '@': [7, 5, 7, 4, 3],
};
const UNKNOWN = [7, 5, 5, 5, 7];

const GLYPH_W = 3;
const GLYPH_H = 5;
const SPACING = 1;

export function glyph(char) {
  return FONT[String(char).toUpperCase()] ?? UNKNOWN;
}

export function textWidth(text, scale = 1) {
  if (!text.length) return 0;
  return (text.length * GLYPH_W + (text.length - 1) * SPACING) * scale;
}

export const textHeight = (scale = 1) => GLYPH_H * scale;

/**
 * Draw text in backing-pixel coordinates.
 *
 * `scale` multiplies each glyph pixel into a square block, which keeps the
 * result exactly as crisp as the rest of the canvas — the whole reason this
 * font exists rather than a TrueType face. Used at 2 for panel headings.
 */
export function drawText(renderer, text, x, y, color, scale = 1) {
  const { ctx } = renderer;
  ctx.fillStyle = color;
  let cursor = Math.round(x);
  const top = Math.round(y);

  for (const char of String(text)) {
    const rows = glyph(char);
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        if (rows[row] & (1 << (GLYPH_W - 1 - col))) {
          ctx.fillRect(cursor + col * scale, top + row * scale, scale, scale);
        }
      }
    }
    cursor += (GLYPH_W + SPACING) * scale;
  }
}

export function drawTextCentered(renderer, text, y, color, scale = 1) {
  drawText(renderer, text, Math.round((BASE_W - textWidth(text, scale)) / 2), y, color, scale);
}

export function drawHud(renderer, { score, high, lives, title, muted }) {
  const y = 3;
  drawText(renderer, String(score).padStart(6, '0'), 3, y, '#ffffff');
  drawTextCentered(renderer, title ?? '', y, '#8899aa');

  // Lives as small squares in the top right, so no glyph is needed.
  let right = BASE_W - 3;
  for (let i = 0; i < lives; i++) {
    renderer.ctx.fillStyle = '#ffffff';
    right -= 3;
    renderer.ctx.fillRect(right, y + 1, 2, 2);
  }
  if (muted) {
    right -= 5;
    drawText(renderer, 'M', right, y, '#667788');
  }

  // The space matters: at 3x5 the digit 0 and the letter O are the same glyph,
  // so "HI0" reads as "HIO". Matches the title screen, which already spaces it.
  const highText = `HI ${high}`;
  drawText(renderer, highText, right - textWidth(highText) - 4, y, '#8899aa');
}
