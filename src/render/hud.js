import { BASE_W } from '../config.js';

// 3x5 bitmap font. Each glyph is five rows of three bits, MSB leftmost.
// At this size some letters are unavoidable compromises; legibility at 1x is
// what matters, not typographic beauty.
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
        if (rows[row] & (1 << (GLYPH_W - 1 - col))) {
          ctx.fillRect(cursor + col, Math.round(y) + row, 1, 1);
        }
      }
    }
    cursor += GLYPH_W + SPACING;
  }
}

export function drawTextCentered(renderer, text, y, color) {
  drawText(renderer, text, Math.round((BASE_W - textWidth(text)) / 2), y, color);
}

export function drawHud(renderer, { score, high, lives, level, muted }) {
  const y = 3;
  drawText(renderer, String(score).padStart(6, '0'), 3, y, '#ffffff');
  drawTextCentered(renderer, `L${level}`, y, '#8899aa');

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
