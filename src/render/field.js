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
