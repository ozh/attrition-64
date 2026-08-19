import { paddleBox } from './paddle.js';
import { POWERUP_KINDS, DROP_SPEED, DROP_SPEED_JITTER, DROP_SIZE, DRAIN_ROW } from '../config.js';

/**
 * Decide whether a destroyed block drops something.
 * Consumes two random values: one for the chance, one for the kind.
 */
export function rollPowerup(spec, rng = Math.random) {
  if (!spec || spec.powerup === undefined) return null;
  const config = typeof spec.powerup === 'number' ? { chance: spec.powerup } : spec.powerup;
  if (!(rng() < config.chance)) return null;

  const kinds = config.kinds ?? (config.kind ? [config.kind] : POWERUP_KINDS);
  return kinds[Math.min(kinds.length - 1, Math.floor(rng() * kinds.length))];
}

/** Uniform over DROP_SPEED ±DROP_SPEED_JITTER, so two drops spawned together visibly separate as they fall. */
export function rollDropSpeed(rng = Math.random) {
  return DROP_SPEED * (1 + DROP_SPEED_JITTER * (rng() * 2 - 1));
}

/** `age` is the clock the renderer blinks against; kept here so it stays testable. */
export function createDrop(kind, px, py, rng = Math.random) {
  return { kind, x: px, y: py, vy: rollDropSpeed(rng), age: 0 };
}

/** Advance every drop, collecting those the paddle caught and discarding those that fell past it. */
export function stepDrops(drops, dt, paddle) {
  const box = paddleBox(paddle);
  const remaining = [];
  const caught = [];

  for (const drop of drops) {
    drop.y += drop.vy * dt;
    drop.age += dt;
    if (overlaps(drop, box)) {
      caught.push(drop.kind);
      continue;
    }
    if (drop.y >= DRAIN_ROW) continue;
    remaining.push(drop);
  }
  return { drops: remaining, caught };
}

function overlaps(drop, box) {
  return drop.x + DROP_SIZE > box.x
    && drop.x < box.x + box.w
    && drop.y + DROP_SIZE > box.y
    && drop.y < box.y + box.h;
}
