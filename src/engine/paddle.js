import { parseSprite } from './sprite.js';
import { ballSpeed, setBallAngle } from './ball.js';
import { FIELD_W, PADDLE_BOTTOM, PADDLE_SPEED, BALL_MAX_ANGLE, BALL_SIZE } from '../config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createPaddle(level) {
  const sprite = parseSprite(level.paddle.grid, { trim: true });
  const paddle = {
    sprite,
    colors: level.paddle.colors,
    baseW: sprite.w,
    h: sprite.h,
    scale: 1,
    x: 0,
  };
  setPaddleCenter(paddle, FIELD_W / 2);
  return paddle;
}

export const paddleWidth = (paddle) => paddle.baseW * paddle.scale;

export function paddleBox(paddle) {
  return { x: paddle.x, y: PADDLE_BOTTOM - paddle.h, w: paddleWidth(paddle), h: paddle.h };
}

function clampX(paddle) {
  paddle.x = clamp(paddle.x, 0, FIELD_W - paddleWidth(paddle));
}

export function movePaddle(paddle, dir, dt) {
  paddle.x += dir * PADDLE_SPEED * dt;
  clampX(paddle);
}

export function setPaddleCenter(paddle, cx) {
  paddle.x = cx - paddleWidth(paddle) / 2;
  clampX(paddle);
}

/** Grows about the centre, then clamps, so a wide paddle at the wall stays legal. */
export function setPaddleScale(paddle, scale) {
  const centre = paddle.x + paddleWidth(paddle) / 2;
  paddle.scale = scale;
  setPaddleCenter(paddle, centre);
}

export function ballHitsPaddle(ball, paddle) {
  if (ball.vy <= 0) return false;
  const box = paddleBox(paddle);
  return ball.x + BALL_SIZE > box.x
    && ball.x < box.x + box.w
    && ball.y + BALL_SIZE > box.y
    && ball.y < box.y + box.h;
}

/**
 * Deflect off the paddle by where it was struck: dead centre goes straight up,
 * the outer edges go out at BALL_MAX_ANGLE. Speed is preserved.
 */
export function deflect(ball, paddle) {
  const box = paddleBox(paddle);
  const half = box.w / 2;
  const ballCentre = ball.x + BALL_SIZE / 2;
  const offset = clamp((ballCentre - (box.x + half)) / half, -1, 1);
  const angle = offset * BALL_MAX_ANGLE;
  setBallAngle(ball, angle, ballSpeed(ball));
  return angle;
}
