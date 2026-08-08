import { moveAxis } from './collide.js';
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

  bounceWalls(ball, world);
}

function bounceWalls(ball, world) {
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    world.onWall();
  } else if (ball.x + BALL_SIZE > FIELD_W) {
    ball.x = FIELD_W - BALL_SIZE;
    ball.vx = -Math.abs(ball.vx);
    world.onWall();
  }
  if (ball.y < CEILING) {
    ball.y = CEILING;
    ball.vy = Math.abs(ball.vy);
    world.onWall();
  }
}
