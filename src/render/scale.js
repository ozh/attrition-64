import { BASE_W, BASE_H } from '../config.js';

/**
 * Largest integer upscale of the 256x400 backing store that fits the viewport.
 *
 * The factor is computed in DEVICE pixels. On a 390pt phone at DPR 3, CSS-pixel
 * maths would allow only 1x — a 256pt canvas on a 390pt screen — whereas the
 * 1170 device pixels available allow 4x, which nearly fills the screen and is
 * still pixel-exact.
 */
export function computeFit({ viewportW, viewportH, dpr = 1, reservedH = 0 }) {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const deviceAvailW = viewportW * ratio;
  // Chrome below the canvas — the repo link and level credit — has to come out
  // of the height budget, or the canvas is sized to the full viewport and the
  // last rows are pushed off the bottom of the page.
  const deviceAvailH = Math.max(1, viewportH - reservedH) * ratio;

  const scale = Math.max(1, Math.floor(Math.min(deviceAvailW / BASE_W, deviceAvailH / BASE_H)));
  const deviceW = BASE_W * scale;
  const deviceH = BASE_H * scale;

  return { scale, deviceW, deviceH, cssW: deviceW / ratio, cssH: deviceH / ratio };
}
