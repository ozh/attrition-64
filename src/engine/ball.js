import { moveAxis, overlappedCells } from './collide.js';
import { BALL_SIZE, MAX_SUBSTEP_DIST, FIELD_W, CEILING, DRAIN_ROW } from '../config.js';

/** @param angle radians off straight up, positive to the right */
export function createBall(x, y, speed, angle) {
  return { x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, stuck: false };
}

export const ballSpeed = (ball) => Math.hypot(ball.vx, ball.vy);

export function setBallAngle(ball, angle, speed = ballSpeed(ball)) {
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
}

/**
 * Advance the ball, subdividing so no substep travels more than half a cell.
 * That cap is the whole reason a fast ball cannot pass through a thin wall.
 *
 * `world.onHitCell` fires for cells the ball bounces off. `world.onOverlap` is
 * optional and fires for every cell the ball's box covers after moving —
 * that is what a piercing ball needs, since it reports nothing through
 * `isBlocked` and so would otherwise sail through the grid doing nothing.
 */
export function stepBall(ball, dt, world) {
  if (ball.stuck) return { drained: false };

  const distance = ballSpeed(ball) * dt;
  const steps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP_DIST));
  const sub = dt / steps;

  for (let i = 0; i < steps; i++) {
    substep(ball, sub, world);
    if (ball.y >= DRAIN_ROW) return { drained: true };
  }
  return { drained: false };
}

function substep(ball, dt, world) {
  const box = { x: ball.x, y: ball.y, w: BALL_SIZE, h: BALL_SIZE };

  const rx = moveAxis(box, ball.vx * dt, 'x', world.isBlocked);
  ball.x = rx.pos;
  box.x = rx.pos;
  if (rx.blocked) {
    ball.vx = -ball.vx;
    for (const [cx, cy] of rx.cells) world.onHitCell(cx, cy);
  }

  const ry = moveAxis(box, ball.vy * dt, 'y', world.isBlocked);
  ball.y = ry.pos;
  box.y = ry.pos;
  if (ry.blocked) {
    ball.vy = -ball.vy;
    for (const [cx, cy] of ry.cells) world.onHitCell(cx, cy);
  }

  if (world.onOverlap) {
    for (const [cx, cy] of overlappedCells(ball.x, ball.y, BALL_SIZE, BALL_SIZE)) {
      world.onOverlap(cx, cy);
    }
  }

  bounceWalls(ball, world);
}

/**
 * The side walls, and the ceiling, which never wraps: a ball emerging at the
 * bottom would be at DRAIN_ROW, so a powerup would cost a life.
 */
function bounceWalls(ball, world) {
  if (ball.x < 0) {
    if (!wrapTo(ball, world, FIELD_W - BALL_SIZE)) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      world.onWall();
    }
  } else if (ball.x + BALL_SIZE > FIELD_W) {
    if (!wrapTo(ball, world, 0)) {
      ball.x = FIELD_W - BALL_SIZE;
      ball.vx = -Math.abs(ball.vx);
      world.onWall();
    }
  }
  if (ball.y < CEILING) {
    ball.y = CEILING;
    ball.vy = Math.abs(ball.vy);
    world.onWall();
  }
}

/**
 * Move the ball to the opposite wall, keeping its heading.
 *
 * @returns false when the ball did not wrap.
 */
function wrapTo(ball, world, x) {
  if (!world.wrap) return false;
  for (const [cx, cy] of overlappedCells(x, ball.y, BALL_SIZE, BALL_SIZE)) {
    if (world.isBlocked(cx, cy)) return false;
  }
  ball.x = x;
  world.onWrap?.();
  return true;
}
