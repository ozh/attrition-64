import { charAt } from '../engine/sprite.js';
import { paddleBox } from '../engine/paddle.js';
import {
  CELL, BLOCK_PX, BALL_SIZE, DROP_SIZE, CEILING, FIELD_W, SHIELD_ROW,
  RELIEF_FLASH_SECONDS, RELIEF_FLASH_WIDTH,
} from '../config.js';

const DROP_COLORS = {
  multiball: '#ffd23f',
  widePaddle: '#4ec9b0',
  slowBall: '#4aa3ff',
  fastBall: '#ff6b4a',
  sticky: '#c86bff',
  laser: '#ff4a7d',
  // Green and pale cyan are the two hues left unclaimed; at 3x3 pixels the
  // only thing telling drops apart is colour, so the gaps matter.
  piercing: '#8bff3d',
  shield: '#b9f2ff',
};

/**
 * Draw the paddle from its character grid. The sprite is stretched horizontally
 * when a wide-paddle effect is active, so the cigarette simply gets longer
 * rather than being replaced by a different sprite.
 */
export function drawPaddle(renderer, paddle) {
  const { ctx } = renderer;
  const box = paddleBox(paddle);
  const cellW = (box.w / paddle.sprite.w) * CELL;

  for (let y = 0; y < paddle.sprite.h; y++) {
    for (let x = 0; x < paddle.sprite.w; x++) {
      const char = charAt(paddle.sprite, x, y);
      if (!char) continue;
      ctx.fillStyle = paddle.colors[char];
      const left = Math.round(box.x * CELL + x * cellW);
      const right = Math.round(box.x * CELL + (x + 1) * cellW);
      ctx.fillRect(left, Math.round((box.y + y) * CELL), Math.max(1, right - left - 1), BLOCK_PX);
    }
  }
}

export function drawBalls(renderer, balls, color) {
  const { ctx } = renderer;
  ctx.fillStyle = color;
  for (const ball of balls) {
    ctx.fillRect(
      Math.round(ball.x * CELL), Math.round(ball.y * CELL),
      BALL_SIZE * CELL - 1, BALL_SIZE * CELL - 1,
    );
  }
}

export function drawDrops(renderer, drops) {
  const { ctx } = renderer;
  for (const drop of drops) {
    ctx.fillStyle = DROP_COLORS[drop.kind] ?? '#ffffff';
    ctx.fillRect(
      Math.round(drop.x * CELL), Math.round(drop.y * CELL),
      DROP_SIZE * CELL - 1, DROP_SIZE * CELL - 1,
    );
  }
}

export function drawShots(renderer, shots) {
  const { ctx } = renderer;
  ctx.fillStyle = DROP_COLORS.laser;
  for (const shot of shots) {
    ctx.fillRect(Math.round(shot.x * CELL) + 1, Math.round(shot.y * CELL), 1, CELL * 2);
  }
}

/**
 * A bar at the spawn point of an endgame powerup, fading out.
 *
 * Without it a drop materialises from nowhere and reads as a bug the first time
 * a player sees it. Coloured to match the powerup, so the flash also says what
 * is on its way.
 */
export function drawFlashes(renderer, flashes) {
  const { ctx } = renderer;
  for (const flash of flashes) {
    ctx.globalAlpha = Math.max(0, Math.min(1, flash.remaining / RELIEF_FLASH_SECONDS));
    ctx.fillStyle = DROP_COLORS[flash.kind] ?? '#ffffff';
    const left = Math.round((flash.x + DROP_SIZE / 2 - RELIEF_FLASH_WIDTH / 2) * CELL);
    // At the spawn row, not the very top: that band is the HUD.
    ctx.fillRect(left, CEILING * CELL, RELIEF_FLASH_WIDTH * CELL, 2);
  }
  ctx.globalAlpha = 1;
}

/**
 * The held shield, drawn as a floor across the playfield.
 *
 * On the field rather than in the HUD deliberately: it is a thing in the world
 * that the ball will bounce off, and showing it where it acts needs no legend.
 */
export function drawShield(renderer, active) {
  if (!active) return;
  const { ctx } = renderer;
  ctx.fillStyle = DROP_COLORS.shield;
  for (let x = 0; x < FIELD_W; x += 2) {
    ctx.fillRect(x * CELL, SHIELD_ROW * CELL, CELL, 2);
  }
}

export { DROP_COLORS };
