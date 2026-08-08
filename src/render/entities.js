import { charAt } from '../engine/sprite.js';
import { paddleBox } from '../engine/paddle.js';
import { CELL, BLOCK_PX, BALL_SIZE, DROP_SIZE } from '../config.js';

const DROP_COLORS = {
  multiball: '#ffd23f',
  widePaddle: '#4ec9b0',
  slowBall: '#4aa3ff',
  fastBall: '#ff6b4a',
  sticky: '#c86bff',
  laser: '#ff4a7d',
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

export { DROP_COLORS };
