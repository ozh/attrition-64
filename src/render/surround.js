const FALLBACK = '#151519';

/** '#abc' or '#aabbcc' -> [r, g, b], or null if it is neither. */
function parseHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

const toHex = (channels) =>
  `#${channels.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;

/** Rec. 601 luma — good enough to ask "is this dark?". */
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * A page background for the area around the canvas, derived from the level's
 * own background.
 *
 * The playfield needs an edge. With a level background of #000000 and a black
 * page the canvas has no visible boundary at all, and the game bleeds into the
 * furniture. Shifting the level's colour rather than hardcoding one keeps the
 * surround in the same family whatever a contributor picks.
 *
 * Direction depends on brightness: dark backgrounds lift, light ones drop.
 * A fixed lift would clamp at white and hand back an identical colour, which is
 * exactly the case this exists to prevent.
 */
export function surroundColor(background) {
  const rgb = parseHex(background);
  if (!rgb) return FALLBACK;

  return luma(rgb) < 128
    ? toHex(rgb.map((c) => c * 1.2 + 22))
    : toHex(rgb.map((c) => c * 0.78 - 12));
}
