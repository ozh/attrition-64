import { drawText, drawTextCentered, textWidth, textHeight } from './hud.js';
import { BASE_W, BASE_H } from '../config.js';

const PADDING = 8;
const LINE_GAP = 3;
const TITLE_SCALE = 2;
const TITLE_GAP = 7;

const BORDER = '#3a4a5c';
const FILL = 'rgba(0, 0, 0, 0.82)';
const HEADING = '#ffffff';
const BODY = '#b8c6d4';
const DIM = '#7d8b99';

/**
 * The welcome panel.
 *
 * Uppercase-only is the bitmap font's one real weakness, so lines are kept
 * short and the blank strings are load-bearing: they are the only thing
 * separating one idea from the next.
 */
export const WELCOME = {
  title: 'ATTRITION 64',
  lines: [
    'THE PADDLE IS AN EVERYDAY THING.',
    'THE BLOCKS ARE SOMETHING IT HARMS.',
    '',
    'MOVE : ARROWS, MOUSE OR DRAG',
    'SERVE : SPACE OR TAP',
    'FIRE : SPACE OR TAP, ONCE ARMED',
    'MUTE : CTRL M',
    '',
    'CATCH WHAT FALLS. SOME OF IT HELPS.',
  ],
};

export const FAREWELL = {
  title: 'CLEARED',
  lines: [
    'THANKS FOR PLAYING.',
    '',
    'EVERY LEVEL IS ONE FILE.',
    'NEW LEVELS ARE WELCOME.',
    'STAR THE REPO, SEND A LEVEL.',
    '',
    'SEE THE DOCS TO ADD ONE.',
  ],
};

/**
 * Draw a bordered panel of text, centred, sized to its own content.
 *
 * Height is measured rather than guessed, so editing the copy cannot silently
 * push a line past the border.
 */
export function drawPanel(renderer, { title, lines }, footer) {
  const { ctx } = renderer;
  const body = footer ? [...lines, '', footer] : lines;

  const widest = Math.max(
    textWidth(title, TITLE_SCALE),
    ...body.map((line) => textWidth(line)),
  );
  const height = textHeight(TITLE_SCALE) + TITLE_GAP
    + body.length * (textHeight() + LINE_GAP) - LINE_GAP;

  const w = widest + PADDING * 2;
  const h = height + PADDING * 2;
  const x = Math.round((BASE_W - w) / 2);
  const y = Math.round((BASE_H - h) / 2);

  ctx.fillStyle = FILL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  drawTextCentered(renderer, title, y + PADDING, HEADING, TITLE_SCALE);

  let cursor = y + PADDING + textHeight(TITLE_SCALE) + TITLE_GAP;
  for (const line of body) {
    if (line) drawTextCentered(renderer, line, cursor, line === footer ? DIM : BODY);
    cursor += textHeight() + LINE_GAP;
  }
}

/** Widest line a panel contains, in backing pixels. Used by the fit test. */
export function panelWidth({ title, lines }, footer) {
  const body = footer ? [...lines, footer] : lines;
  return Math.max(textWidth(title, TITLE_SCALE), ...body.map((line) => textWidth(line))) + PADDING * 2;
}
