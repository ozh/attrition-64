import { destroyAt } from './grid.js';

const key = (x, y) => `${x},${y}`;

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
