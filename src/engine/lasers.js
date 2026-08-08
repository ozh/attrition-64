import { LASER_SPEED, CEILING, MAX_SUBSTEP_DIST } from '../config.js';

export function createShot(px, py) {
  return { x: px, y: py };
}

/**
 * Advance shots upward. Like the ball, movement is subdivided so a shot cannot
 * cross a whole block in one frame without registering the hit.
 */
export function stepShots(shots, dt, isBlocked) {
  const remaining = [];
  const hits = [];

  for (const shot of shots) {
    const distance = LASER_SPEED * dt;
    const steps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP_DIST));
    let hit = null;

    for (let i = 0; i < steps && !hit; i++) {
      shot.y -= distance / steps;
      const cx = Math.floor(shot.x);
      const cy = Math.floor(shot.y);
      if (isBlocked(cx, cy)) hit = [cx, cy];
    }

    if (hit) hits.push(hit);
    else if (shot.y > CEILING) remaining.push(shot);
  }
  return { shots: remaining, hits };
}
