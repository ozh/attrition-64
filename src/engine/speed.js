import { TIME_ACCEL_STEP, TIME_ACCEL_SECONDS, TIME_ACCEL_MAX } from '../config.js';

/**
 * How much faster the ball runs after this many seconds of a single life.
 *
 * Continuous compounding rather than a step every TIME_ACCEL_SECONDS: the curve
 * is the same, but the player never feels the ball lurch for no visible reason.
 * The clock is per life and per level, so dying or moving on starts over.
 */
export function timeSpeedFactor(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 1;
  return Math.min(TIME_ACCEL_MAX, (1 + TIME_ACCEL_STEP) ** (seconds / TIME_ACCEL_SECONDS));
}
