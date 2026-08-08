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
