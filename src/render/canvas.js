import { computeFit } from './scale.js';
import { CELL, BASE_W, BASE_H } from '../config.js';

/**
 * Owns the visible canvas. Drawing happens in backing-pixel space (256x400);
 * a transform scales that to device pixels, so callers never think about DPR.
 */
export function createRenderer(canvas, win = window) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let scale = 1;

  function fit() {
    const result = computeFit({
      viewportW: win.innerWidth,
      viewportH: win.innerHeight,
      dpr: win.devicePixelRatio || 1,
    });
    scale = result.scale;
    canvas.width = result.deviceW;
    canvas.height = result.deviceH;
    canvas.style.width = `${result.cssW}px`;
    canvas.style.height = `${result.cssH}px`;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return result;
  }

  return {
    canvas,
    ctx,
    fit,
    get scale() { return scale; },
    clear(color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    },
    /** Playfield cells -> backing pixels, snapped to the pixel grid. */
    px: (cells) => Math.round(cells * CELL),
  };
}
